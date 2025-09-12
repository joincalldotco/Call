"use client";
import { useCallback, useRef, useState, useEffect } from "react";
import { Device } from "mediasoup-client";
import type {
  Transport,
  Consumer,
  RtpCapabilities,
  RtpParameters,
  RtpEncodingParameters,
} from "mediasoup-client/types";
import { useSocketContext } from "@/components/providers/socket";
import { useSession } from "@/components/providers/session";
import { toast } from "sonner";

interface Peer {
  id: string;
  displayName: string;
  connectionState: string;
  isCreator?: boolean;
}

interface Producer {
  id: string;
  peerId: string;
  kind: "audio" | "video";
  source: "mic" | "webcam" | "screen";
  displayName: string;
  muted: boolean;
}

interface JoinResponse {
  rtpCapabilities: RtpCapabilities;
  peers: Peer[];
  producers: Producer[];
}

interface RemoteStream {
  stream: MediaStream;
  producerId: string;
  peerId: string;
  userId: string;
  kind: "audio" | "video";
  source: "mic" | "webcam" | "screen";
  displayName: string;
  userImage?: string;
  muted: boolean;
}

interface ProduceOptions {
  source?: "screen" | "camera" | "mic" | "webcam";
}

function useWsRequest(socket: WebSocket | null) {
  const pending = useRef(new Map<string, (data: any) => void>());
  const eventHandlers = useRef(new Map<string, (data: any) => void>());

  const onMessage = useCallback((event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data);
      console.log("[mediasoup] Received message:", data);

      if (data.reqId && pending.current.has(data.reqId)) {
        pending.current.get(data.reqId)?.(data);
        pending.current.delete(data.reqId);
      }
      // Handle events
      if (data.type && eventHandlers.current.has(data.type)) {
        eventHandlers.current.get(data.type)?.(data);
      }
    } catch (error) {
      console.error("[mediasoup] Error handling message:", error);
    }
  }, []);

  useEffect(() => {
    if (!socket) return;
    socket.addEventListener("message", onMessage);
    return () => {
      socket.removeEventListener("message", onMessage);
    };
  }, [socket, onMessage]);

  const sendRequest = useCallback(
    (type: string, payload: any = {}) => {
      return new Promise<any>((resolve, reject) => {
        if (!socket || socket.readyState !== 1) {
          reject(new Error("WebSocket not connected"));
          return;
        }
        const reqId = Math.random().toString(36).slice(2);
        pending.current.set(reqId, resolve);
        const message = { ...payload, type, reqId };
        console.log("[mediasoup] Sending request:", message);
        socket.send(JSON.stringify(message));
        setTimeout(() => {
          if (pending.current.has(reqId)) {
            pending.current.delete(reqId);
            reject(new Error("Timeout waiting for response"));
          }
        }, 10000);
      });
    },
    [socket]
  );

  const addEventHandler = useCallback(
    (type: string, handler: (data: any) => void) => {
      eventHandlers.current.set(type, handler);
    },
    []
  );

  const removeEventHandler = useCallback((type: string) => {
    eventHandlers.current.delete(type);
  }, []);

  return { sendRequest, addEventHandler, removeEventHandler };
}

export function useMediasoupClient() {
  const { socket, connected } = useSocketContext();
  const { user } = useSession();
  const { sendRequest, addEventHandler, removeEventHandler } =
    useWsRequest(socket);
  const deviceRef = useRef<Device | null>(null);
  const sendTransportRef = useRef<Transport | null>(null);
  const recvTransportRef = useRef<Transport | null>(null);
  const consumersRef = useRef<Map<string, Consumer>>(new Map());
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<RemoteStream[]>([]);
  const [peers, setPeers] = useState<Peer[]>([]);
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);

  const [userId] = useState(() => {
    if (typeof window !== "undefined") {
      let id = localStorage.getItem("user-id");
      if (!id) {
        id = crypto.randomUUID();
        localStorage.setItem("user-id", id);
      }
      return id;
    }
    return "";
  });

  const [displayName, setDisplayName] = useState("");

  useEffect(() => {
    const isGuest = user?.id === "guest" || user?.name === "Guest";

    if (isGuest) {
      if (typeof window !== "undefined") {
        const storedName = localStorage.getItem("call_display_name");
        if (storedName && storedName.trim()) {
          setDisplayName(storedName.trim());
          return;
        }
      }

      if (typeof window !== "undefined") {
        let guestName = localStorage.getItem("display-name");
        if (!guestName) {
          guestName = `User-${Math.random().toString(36).slice(2, 8)}`;
          localStorage.setItem("display-name", guestName);
        }
        setDisplayName(guestName);
        return;
      }
    }

    if (user?.name) {
      setDisplayName(user.name);
      return;
    }

    setDisplayName("Anonymous");
  }, []);

  const setProducerMuted = useCallback(
    (producerId: string, muted: boolean) => {
      if (!socket || !connected) {
        console.error("Cannot set mute state: socket not connected");
        return;
      }
      console.log(
        `[setProducerMuted] Setting producer ${producerId} muted state to: ${muted}`
      );
      sendRequest("setProducerMuted", { producerId, muted })
        .then((response) => {
          console.log(`[setProducerMuted] Response received:`, response);
        })
        .catch((error) => {
          console.error(`[setProducerMuted] Error:`, error);
        });
    },
    [socket, connected, sendRequest]
  );

  const cleanupConsumer = useCallback((producerId: string) => {
    const consumer = consumersRef.current.get(producerId);
    if (consumer) {
      consumer.close();
      consumersRef.current.delete(producerId);
    }
    setRemoteStreams((prev) => {
      const filtered = prev.filter((s) => s.producerId !== producerId);
      console.log(
        `[mediasoup] Removed consumer ${producerId}, remaining streams:`,
        filtered.length
      );
      return filtered;
    });
  }, []);

  const cleanupAllConsumers = useCallback(() => {
    consumersRef.current.forEach((consumer) => {
      consumer.close();
    });
    consumersRef.current.clear();
    setRemoteStreams([]);
  }, []);

  const cleanupLocalMedia = useCallback(() => {
    if (localStream) {
      console.log("[mediasoup] Cleaning up local media");
      localStream.getTracks().forEach((track) => track.stop());
      setLocalStream(null);
    }
  }, [localStream]);

  const cleanupTransports = useCallback(() => {
    if (sendTransportRef.current) {
      sendTransportRef.current.close();
      sendTransportRef.current = null;
    }
    if (recvTransportRef.current) {
      recvTransportRef.current.close();
      recvTransportRef.current = null;
    }
  }, []);

  const cleanupAll = useCallback(() => {
    cleanupAllConsumers();
    cleanupLocalMedia();
    cleanupTransports();
    setPeers([]);
    setCurrentRoomId(null);
  }, [cleanupAllConsumers, cleanupLocalMedia, cleanupTransports]);

  const joinRoom = useCallback(
    async (roomId: string): Promise<JoinResponse> => {
      if (!socket || !connected) {
        throw new Error("WebSocket not connected");
      }

      cleanupAll();

      console.log(`[mediasoup] Joining room: ${roomId} as ${displayName}`);

      await sendRequest("createRoom", { roomId });
      const response = await sendRequest("joinRoom", {
        roomId,
        peerId: userId,
        displayName,
        userImage: user?.image,
      });

      setCurrentRoomId(roomId);
      setPeers(response.peers || []);

      return response;
    },
    [socket, connected, sendRequest, cleanupAll, userId, displayName]
  );

  useEffect(() => {
    if (!connected && currentRoomId) {
      console.log(
        "[mediasoup] WebSocket disconnected, room active:",
        currentRoomId
      );
      const timeoutId = setTimeout(() => {
        if (!connected) {
          console.log(
            "[mediasoup] WebSocket still disconnected, cleaning up..."
          );
          cleanupAll();
        }
      }, 5000);

      return () => clearTimeout(timeoutId);
    }
  }, [connected, cleanupAll, currentRoomId]);

  useEffect(() => {
    if (!socket) return;

    const handlePeerJoined = (data: any) => {
      console.log("[mediasoup] Peer joined:", data);
      setPeers((prev) => {
        const exists = prev.find((p) => p.id === data.peerId);
        if (exists) return prev;
        return [
          ...prev,
          {
            id: data.peerId,
            displayName: data.displayName,
            connectionState: "connected",
            isCreator: data.isCreator,
          },
        ];
      });
      toast.success(`${data.displayName} joined the call`);
    };

    const handlePeerLeft = (data: any) => {
      console.log("[mediasoup] Peer left:", data);
      setPeers((prev) => prev.filter((p) => p.id !== data.peerId));
      toast.success(`${data.displayName} left the call`);
      setRemoteStreams((prev) => {
        const streamsToRemove = prev.filter((s) => s.peerId === data.peerId);
        streamsToRemove.forEach((stream) => {
          if (stream.stream) {
            stream.stream.getTracks().forEach((track) => {
              track.stop();
              track.enabled = false;
            });
          }
        });
        return prev.filter((s) => s.peerId !== data.peerId);
      });

      consumersRef.current.forEach((consumer, producerId) => {
        if (consumer.appData?.peerId === data.peerId) {
          consumer.close();
          consumersRef.current.delete(producerId);
        }
      });
    };

    const handleProducerClosed = (data: any) => {
      console.log("[mediasoup] Producer closed:", data);
      cleanupConsumer(data.producerId);
    };

    const handleProducerMuted = (data: any) => {
      console.log("[mediasoup] Producer muted state changed:", data);
      setRemoteStreams((prev) =>
        prev.map((stream) =>
          stream.producerId === data.producerId
            ? {
                ...stream,
                muted: data.muted,
                displayName: data.displayName || stream.displayName,
                userImage: data.userImage || stream.userImage,
              }
            : stream
        )
      );
    };

    addEventHandler("peerJoined", handlePeerJoined);
    addEventHandler("peerLeft", handlePeerLeft);
    addEventHandler("producerClosed", handleProducerClosed);
    addEventHandler("producerMuted", handleProducerMuted);

    return () => {
      removeEventHandler("peerJoined");
      removeEventHandler("peerLeft");
      removeEventHandler("producerClosed");
      removeEventHandler("producerMuted");
    };
  }, [socket, addEventHandler, removeEventHandler, cleanupConsumer]);

  const handlePeerJoined = useCallback((data: any) => {
    console.log("[mediasoup] Peer joined:", data);
    setPeers((prev) => {
      const exists = prev.some((p) => p.id === data.id);
      if (exists) return prev;
      return [...prev, data];
    });
  }, []);

  const handlePeerLeft = useCallback((data: any) => {
    console.log("[mediasoup] Peer left:", data);
    setPeers((prev) => prev.filter((p) => p.id !== data.id));
    setRemoteStreams((prev) => prev.filter((s) => s.peerId !== data.id));
  }, []);

  const handlePeerUpdated = useCallback((data: any) => {
    console.log("[mediasoup] Peer updated:", data);
    setPeers((prev) => {
      const index = prev.findIndex((p) => p.id === data.id);
      if (index === -1) return prev;
      const newPeers = [...prev];
      newPeers[index] = { ...newPeers[index], ...data };
      return newPeers;
    });
  }, []);

  useEffect(() => {
    if (!socket) return;

    addEventHandler("peer-joined", handlePeerJoined);
    addEventHandler("peer-left", handlePeerLeft);
    addEventHandler("peer-updated", handlePeerUpdated);

    return () => {
      removeEventHandler("peer-joined");
      removeEventHandler("peer-left");
      removeEventHandler("peer-updated");
    };
  }, [
    socket,
    addEventHandler,
    removeEventHandler,
    handlePeerJoined,
    handlePeerLeft,
    handlePeerUpdated,
  ]);

  const loadDevice = useCallback(async (rtpCapabilities: RtpCapabilities) => {
    let device = deviceRef.current;
    if (!device) {
      device = new Device();
      await device.load({ routerRtpCapabilities: rtpCapabilities });
      deviceRef.current = device;
      console.log("[mediasoup] Device loaded");
    }
    return device;
  }, []);

  const createSendTransport = useCallback(async () => {
    if (!socket || !connected) {
      throw new Error("Socket not connected");
    }

    if (sendTransportRef.current) {
      sendTransportRef.current.close();
      sendTransportRef.current = null;
    }

    const params = await sendRequest("createWebRtcTransport", {
      direction: "send",
    });
    const device = deviceRef.current;
    if (!device) throw new Error("Device not loaded");

    const transport = device.createSendTransport(params);

    transport.on("connect", ({ dtlsParameters }, callback, errback) => {
      sendRequest("connectWebRtcTransport", {
        transportId: transport.id,
        dtlsParameters,
        direction: "send",
      })
        .then(() => callback())
        .catch(errback);
    });

    transport.on(
      "produce",
      ({ kind, rtpParameters, appData }, callback, errback) => {
        sendRequest("produce", {
          transportId: transport.id,
          kind,
          rtpParameters,
          source: appData?.source,
        })
          .then((res) => callback({ id: res.id }))
          .catch(errback);
      }
    );

    sendTransportRef.current = transport;
    console.log("[mediasoup] Send transport created");
    return transport;
  }, [socket, sendRequest, connected]);

  const createRecvTransport = useCallback(async () => {
    if (!socket || !connected) {
      throw new Error("Socket not connected");
    }

    if (recvTransportRef.current) {
      recvTransportRef.current.close();
      recvTransportRef.current = null;
    }

    const params = await sendRequest("createWebRtcTransport", {
      direction: "recv",
    });
    const device = deviceRef.current;
    if (!device) throw new Error("Device not loaded");

    const transport = device.createRecvTransport(params);

    transport.on("connect", ({ dtlsParameters }, callback, errback) => {
      sendRequest("connectWebRtcTransport", {
        transportId: transport.id,
        dtlsParameters,
        direction: "recv",
      })
        .then(() => callback())
        .catch(errback);
    });

    recvTransportRef.current = transport;
    console.log("[mediasoup] Recv transport created");
    return transport;
  }, [socket, sendRequest, connected]);

  const produce = useCallback(
    async (stream: MediaStream, options?: ProduceOptions) => {
      console.log("[mediasoup] Produce called with stream:", {
        tracks: stream?.getTracks().map((t) => ({
          kind: t.kind,
          enabled: t.enabled,
          readyState: t.readyState,
        })),
        options,
      });

      if (!sendTransportRef.current) {
        console.error("[mediasoup] No send transport available");
        return [];
      }

      if (!connected) {
        console.error("[mediasoup] Socket not connected");
        return [];
      }

      if (!stream || stream.getTracks().length === 0) {
        console.error("[mediasoup] Invalid stream provided");
        return [];
      }

      // Check if tracks exist (even if disabled)
      const tracks = stream.getTracks();
      const activeTracks = tracks.filter(
        (track) => track.readyState === "live"
      );

      if (tracks.length === 0) {
        console.error("[mediasoup] No tracks in stream");
        return [];
      }

      console.log(
        `[mediasoup] Producing ${tracks.length} tracks (${activeTracks.length} active)`
      );

      const webcamEncodings: RtpEncodingParameters[] = [
        { rid: "r0", maxBitrate: 100000, scalabilityMode: "S1T3" },
        { rid: "r1", maxBitrate: 300000, scalabilityMode: "S1T3" },
        { rid: "r2", maxBitrate: 900000, scalabilityMode: "S1T3" },
      ];

      const screenEncodings: RtpEncodingParameters[] = [
        { rid: "r0", maxBitrate: 1500000 },
        { rid: "r1", maxBitrate: 4500000 },
      ];

      const producers = [];
      const source = options?.source;

      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        try {
          console.log(
            `[mediasoup] Producing audio track from source: ${source || "mic"} (enabled: ${audioTrack.enabled})`
          );
          const audioProducer = await sendTransportRef.current.produce({
            track: audioTrack,
            appData: {
              source: source || "mic",
              kind: "audio",
              peerId: userId,
            },
          });
          producers.push(audioProducer);
          console.log(
            `[mediasoup] Audio producer created: ${audioProducer.id}`
          );
        } catch (e) {
          console.error(`Error producing audio track: `, e);
        }
      }

      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        try {
          const videoSource = source === "screen" ? "screen" : "webcam";
          console.log(
            `[mediasoup] Producing video track from source: ${videoSource} (enabled: ${videoTrack.enabled})`
          );

          const videoProducer = await sendTransportRef.current.produce({
            track: videoTrack,
            encodings:
              videoSource === "screen" ? screenEncodings : webcamEncodings,
            codecOptions: {
              videoGoogleStartBitrate: 1000,
            },
            appData: {
              source: videoSource,
              kind: "video",
              peerId: userId,
            },
          });
          producers.push(videoProducer);
          console.log(
            `[mediasoup] Video producer created: ${videoProducer.id}`
          );
        } catch (e) {
          console.error(`Error producing video track:`, e);
        }
      }

      // Mute producers if tracks are disabled
      for (const producer of producers) {
        const track = stream.getTracks().find((t) => t.kind === producer.kind);
        if (track && !track.enabled) {
          console.log(
            `[mediasoup] Muting producer ${producer.id} because track is disabled`
          );
          try {
            await setProducerMuted(producer.id, true);
          } catch (e) {
            console.error(`Error muting producer ${producer.id}:`, e);
          }
        }
      }

      // Always update localStream for camera/webcam streams to ensure UI shows the stream
      if (
        !options?.source ||
        options.source === "camera" ||
        options.source === "webcam"
      ) {
        console.log("[mediasoup] Setting local stream for display");
        setLocalStream(stream);
      }

      console.log(
        `[mediasoup] Successfully created ${producers.length} producers`
      );
      return producers;
    },
    [userId, connected, setProducerMuted]
  );

  const consume = useCallback(
    async (
      producerId: string,
      rtpCapabilities: RtpCapabilities,
      onStream?: (stream: MediaStream, kind?: string, peerId?: string) => void,
      initialMutedState?: boolean
    ) => {
      if (!recvTransportRef.current) {
        console.error(
          "[mediasoup] No receive transport available for consuming producer:",
          producerId
        );
        return;
      }

      if (!connected) {
        console.error(
          "[mediasoup] Socket not connected, cannot consume producer:",
          producerId
        );
        return;
      }

      console.log(
        `[mediasoup] Starting consumption of producer: ${producerId}`
      );

      try {
        const res = await sendRequest("consume", {
          transportId: recvTransportRef.current.id,
          producerId,
          rtpCapabilities,
        });

        if (res.error) {
          console.error(
            "[mediasoup] Server error consuming producer:",
            producerId,
            res.error
          );
          return;
        }

        console.log(`[mediasoup] Consume response for ${producerId}:`, res);
        console.log(
          `[mediasoup] User image from consume response:`,
          res.userImage
        );

        const consumer = await recvTransportRef.current.consume({
          id: res.id,
          producerId: res.producerId,
          kind: res.kind as "audio" | "video",
          rtpParameters: res.rtpParameters as RtpParameters,
          appData: {
            peerId: res.peerId,
            source: res.source,
            displayName: res.displayName,
          },
        });

        consumersRef.current.set(producerId, consumer);

        const stream = new MediaStream([consumer.track]);
        console.log(`[mediasoup] Created stream for producer ${producerId}:`, {
          track: consumer.track,
          trackEnabled: consumer.track.enabled,
          trackReadyState: consumer.track.readyState,
          muted: res.muted,
        });

        consumer.on("@close", () => {
          console.log(
            `[mediasoup] Producer closed for consumer: ${consumer.id}`
          );
          cleanupConsumer(producerId);
        });

        consumer.on("transportclose", () => {
          console.log(
            `[mediasoup] Transport closed for consumer: ${consumer.id}`
          );
          cleanupConsumer(producerId);
        });

        console.log(
          `[mediasoup] Consumer created successfully: ${consumer.id} for producer: ${producerId}, kind: ${res.kind}, peerId: ${res.peerId}`
        );

        if (onStream) {
          onStream(stream, res.kind, res.peerId);
        } else {
          if (res.peerId !== userId) {
            setRemoteStreams((prev) => {
              const existingIndex = prev.findIndex(
                (s) => s.producerId === producerId
              );
              const newStream = {
                stream,
                producerId,
                peerId: res.peerId,
                userId: res.peerId,
                kind: res.kind,
                source: res.source || "webcam",
                displayName: res.displayName || "Unknown",
                userImage: res.userImage,
                muted: res.muted ?? initialMutedState ?? false,
              };

              if (existingIndex >= 0) {
                const updated = [...prev];
                updated[existingIndex] = newStream;
                console.log(
                  `[mediasoup] Updating existing remote stream:`,
                  newStream
                );
                return updated;
              } else {
                console.log(`[mediasoup] Adding new remote stream:`, newStream);
                console.log(`[mediasoup] Stream muted state:`, newStream.muted);
                return [...prev, newStream];
              }
            });
          } else {
            console.log(
              `[mediasoup] Skipping own stream from consumption (peerId: ${res.peerId}, userId: ${userId})`
            );
          }
        }
      } catch (error) {
        console.error(
          `[mediasoup] Error consuming producer ${producerId}:`,
          error
        );
      }
    },
    [sendRequest, cleanupConsumer, connected]
  );

  useEffect(() => {
    if (!deviceRef.current?.loaded) return;

    const handleNewProducer = (data: any) => {
      console.log("[mediasoup] New producer event received:", data);

      if (data.peerId === userId) {
        console.log("[mediasoup] Ignoring own producer:", data.id);
        return;
      }

      if (deviceRef.current && recvTransportRef.current) {
        console.log(
          `[mediasoup] Consuming new producer ${data.id} from peer ${data.peerId}`
        );
        consume(
          data.id,
          deviceRef.current.rtpCapabilities,
          undefined,
          data.muted
        );
      } else {
        console.warn(
          "[mediasoup] Cannot consume new producer - device or transport not ready"
        );
      }
    };

    addEventHandler("newProducer", handleNewProducer);

    return () => {
      removeEventHandler("newProducer");
    };
  }, [addEventHandler, removeEventHandler, consume, userId]);

  useEffect(() => {
    return () => {
      console.log("[mediasoup] Component unmounting, cleaning up...");
      cleanupAllConsumers();
    };
  }, [cleanupAllConsumers]);

  return {
    joinRoom,
    loadDevice,
    createSendTransport,
    createRecvTransport,
    produce,
    consume,
    localStream,
    setLocalStream,
    remoteStreams,
    peers,
    connected,
    socket,
    device: deviceRef.current,
    currentRoomId,
    userId,
    displayName,
    setProducerMuted,
  };
}
