"use client";
import { useCallback, useRef, useState, useEffect } from "react";
import { Device } from "mediasoup-client";
import type {
  Transport,
  Consumer,
  TransportOptions,
  RtpCapabilities,
  RtpParameters,
} from "mediasoup-client/types";
import { useSocket } from "./useSocket";

interface Peer {
  id: string;
  displayName: string;
  connectionState: string;
}

interface Producer {
  id: string;
  peerId: string;
  kind: "audio" | "video";
  source: "mic" | "webcam" | "screen";
  displayName: string;
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
  userId: string; // For backward compatibility
  kind: "audio" | "video";
  source: "mic" | "webcam" | "screen";
  displayName: string;
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
  const { socket, connected } = useSocket();
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

  // Generate or get user ID
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

  // Generate display name
  const [displayName] = useState(() => {
    if (typeof window !== "undefined") {
      let name = localStorage.getItem("display-name");
      if (!name) {
        name = `User-${Math.random().toString(36).slice(2, 8)}`;
        localStorage.setItem("display-name", name);
      }
      return name;
    }
    return "Anonymous";
  });

  // Cleanup functions
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

  // Join room with cleanup
  const joinRoom = useCallback(
    async (roomId: string): Promise<JoinResponse> => {
      if (!socket || !connected) {
        throw new Error("WebSocket not connected");
      }

      // Cleanup existing resources before joining
      cleanupAll();

      console.log(`[mediasoup] Joining room: ${roomId} as ${displayName}`);

      await sendRequest("createRoom", { roomId });
      const response = await sendRequest("joinRoom", {
        roomId,
        peerId: userId,
        displayName,
      });

      setCurrentRoomId(roomId);
      setPeers(response.peers || []);

      return response;
    },
    [socket, connected, sendRequest, cleanupAll, userId, displayName]
  );

  // Handle WebSocket reconnection - don't cleanup immediately on disconnect
  // as it might be a temporary network issue
  useEffect(() => {
    if (!connected && currentRoomId) {
      console.log(
        "[mediasoup] WebSocket disconnected, room active:",
        currentRoomId
      );
      // Only cleanup after a delay to allow for reconnection
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

  // Handle peer and producer events
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
          },
        ];
      });
    };

    const handlePeerLeft = (data: any) => {
      console.log("[mediasoup] Peer left:", data);
      setPeers((prev) => prev.filter((p) => p.id !== data.peerId));

      // Clean up streams from this peer
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

      // Clean up consumers from this peer
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

    addEventHandler("peerJoined", handlePeerJoined);
    addEventHandler("peerLeft", handlePeerLeft);
    addEventHandler("producerClosed", handleProducerClosed);

    return () => {
      removeEventHandler("peerJoined");
      removeEventHandler("peerLeft");
      removeEventHandler("producerClosed");
    };
  }, [socket, addEventHandler, removeEventHandler, cleanupConsumer]);

  // Load mediasoup device
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

  // Create send transport
  const createSendTransport = useCallback(async () => {
    if (!socket || !connected) {
      throw new Error("Socket not connected");
    }

    // Close existing transport if any
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

  // Create recv transport
  const createRecvTransport = useCallback(async () => {
    if (!socket || !connected) {
      throw new Error("Socket not connected");
    }

    // Close existing transport if any
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

  // Produce local media
  const produce = useCallback(
    async (stream: MediaStream, options?: ProduceOptions) => {
      if (!sendTransportRef.current) {
        console.error("[mediasoup] No send transport available");
        return [];
      }

      if (!connected) {
        console.error("[mediasoup] Socket not connected");
        return [];
      }

      // Validate stream and tracks
      if (!stream || stream.getTracks().length === 0) {
        console.error("[mediasoup] Invalid stream provided");
        return [];
      }

      // Check if tracks are still active
      const activeTracks = stream
        .getTracks()
        .filter((track) => track.readyState === "live" && !track.muted);

      if (activeTracks.length === 0) {
        console.error("[mediasoup] No active tracks in stream");
        return [];
      }

      console.log(`[mediasoup] Producing ${activeTracks.length} tracks`);

      // Always update localStream for camera/webcam streams to ensure UI shows the stream
      if (
        !options?.source ||
        options.source === "camera" ||
        options.source === "webcam"
      ) {
        console.log("[mediasoup] Setting local stream for display");
        setLocalStream(stream);
      }

      const producers = [];
      for (const track of activeTracks) {
        try {
          console.log(
            `[mediasoup] Producing track: ${track.kind}, enabled: ${track.enabled}, readyState: ${track.readyState}`
          );

          const producer = await sendTransportRef.current.produce({
            track,
            appData: {
              source:
                options?.source || (track.kind === "audio" ? "mic" : "webcam"),
              kind: track.kind,
              peerId: userId,
            },
          });
          producers.push(producer);
          console.log(
            `[mediasoup] Producer created: ${producer.id}, kind: ${track.kind}, source: ${producer.appData.source}`
          );
        } catch (e) {
          console.error(`Error producing ${track.kind} track:`, e);
        }
      }

      console.log(
        `[mediasoup] Successfully created ${producers.length} producers`
      );
      return producers;
    },
    [userId, connected]
  );

  // Consume remote media
  const consume = useCallback(
    async (
      producerId: string,
      rtpCapabilities: RtpCapabilities,
      onStream?: (stream: MediaStream, kind?: string, peerId?: string) => void
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

        consumer.on("@close", () => {
          console.log(`[mediasoup] Consumer closed: ${consumer.id}`);
          cleanupConsumer(producerId);
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
          // Don't add if it's our own stream - double check with both peerId and userId
          if (res.peerId !== userId) {
            setRemoteStreams((prev) => {
              // Check if we already have this stream
              const existingIndex = prev.findIndex(
                (s) => s.producerId === producerId
              );
              const newStream = {
                stream,
                producerId,
                peerId: res.peerId,
                userId: res.peerId, // For backward compatibility
                kind: res.kind,
                source: res.source || "webcam",
                displayName: res.displayName || "Unknown",
              };

              if (existingIndex >= 0) {
                // Replace existing stream
                const updated = [...prev];
                updated[existingIndex] = newStream;
                console.log(
                  `[mediasoup] Updating existing remote stream:`,
                  newStream
                );
                return updated;
              } else {
                // Add new stream
                console.log(`[mediasoup] Adding new remote stream:`, newStream);
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
        // Don't cleanup immediately on error - let the user see what's wrong
      }
    },
    [sendRequest, cleanupConsumer, connected]
  );

  // Handle new producers from existing logic
  useEffect(() => {
    if (!deviceRef.current?.loaded) return;

    const handleNewProducer = (data: any) => {
      console.log("[mediasoup] New producer event received:", data);

      // Don't consume our own producers
      if (data.peerId === userId) {
        console.log("[mediasoup] Ignoring own producer:", data.id);
        return;
      }

      if (deviceRef.current && recvTransportRef.current) {
        console.log(
          `[mediasoup] Consuming new producer ${data.id} from peer ${data.peerId}`
        );
        consume(data.id, deviceRef.current.rtpCapabilities);
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log("[mediasoup] Component unmounting, cleaning up...");
      cleanupAllConsumers();
      // Don't stop local stream tracks on unmount - let the component handle it
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
  };
}
