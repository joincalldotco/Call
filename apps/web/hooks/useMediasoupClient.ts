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

interface JoinResponse {
  producers: {
    producerId: string;
    userId: string;
    kind: "audio" | "video";
  }[];
}

interface RemoteStream {
  stream: MediaStream;
  producerId: string;
  userId: string;
}

function useWsRequest(socket: WebSocket | null) {
  const pending = useRef(new Map<string, (data: any) => void>());
  const eventHandlers = useRef(new Map<string, (data: any) => void>());

  const onMessage = useCallback((event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data);
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
        socket.send(JSON.stringify({ ...payload, type, reqId }));
        setTimeout(() => {
          if (pending.current.has(reqId)) {
            pending.current.delete(reqId);
            reject(new Error("Timeout waiting for response"));
          }
        }, 8000);
      });
    },
    [socket]
  );

  const addEventHandler = useCallback((type: string, handler: (data: any) => void) => {
    eventHandlers.current.set(type, handler);
  }, []);

  const removeEventHandler = useCallback((type: string) => {
    eventHandlers.current.delete(type);
  }, []);

  return { sendRequest, addEventHandler, removeEventHandler };
}

export function useMediasoupClient() {
  const { socket, connected } = useSocket();
  const { sendRequest, addEventHandler, removeEventHandler } = useWsRequest(socket);
  const deviceRef = useRef<Device | null>(null);
  const sendTransportRef = useRef<Transport | null>(null);
  const recvTransportRef = useRef<Transport | null>(null);
  const consumersRef = useRef<Map<string, Consumer>>(new Map());
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<RemoteStream[]>([]);
  // Obtener o generar userId
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

  // Cleanup functions
  const cleanupConsumer = useCallback((producerId: string) => {
    const consumer = consumersRef.current.get(producerId);
    if (consumer) {
      consumer.close();
      consumersRef.current.delete(producerId);
    }
    setRemoteStreams(prev => prev.filter(s => s.producerId !== producerId));
  }, []);

  const cleanupAllConsumers = useCallback(() => {
    consumersRef.current.forEach(consumer => {
      consumer.close();
    });
    consumersRef.current.clear();
    setRemoteStreams([]);
  }, []);

  const cleanupLocalMedia = useCallback(() => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
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
  }, [cleanupAllConsumers, cleanupLocalMedia, cleanupTransports]);

  // Join room with cleanup
  const joinRoom = useCallback(
    async (roomId: string): Promise<JoinResponse> => {
      if (!socket || !connected) {
        throw new Error("WebSocket not connected");
      }

      // Cleanup existing resources before joining
      cleanupAll();

      await sendRequest("createRoom", { roomId });
      const response = await sendRequest("joinRoom", {
        roomId,
        token: "demo-token",
      });
      return response;
    },
    [socket, connected, sendRequest, cleanupAll]
  );

  // Handle WebSocket reconnection
  useEffect(() => {
    if (!connected) {
      console.log("[mediasoup] WebSocket disconnected, cleaning up...");
      cleanupAll();
    }
  }, [connected, cleanupAll]);

  // Load mediasoup device
  const loadDevice = useCallback(async (rtpCapabilities: RtpCapabilities) => {
    let device = deviceRef.current;
    if (!device) {
      device = new Device();
      await device.load({ routerRtpCapabilities: rtpCapabilities });
      deviceRef.current = device;
    }
    return device;
  }, []);

  // Create send transport
  const createSendTransport = useCallback(async () => {
    if (!socket) return;
    const params = await sendRequest("createWebRtcTransport", {});
    const device = deviceRef.current;
    if (!device) throw new Error("Device not loaded");
    const transport = device.createSendTransport(params);
    transport.on("connect", ({ dtlsParameters }, callback, errback) => {
      sendRequest("connectWebRtcTransport", {
        transportId: transport.id,
        dtlsParameters,
      })
        .then(() => callback())
        .catch(errback);
    });
    transport.on("produce", ({ kind, rtpParameters }, callback, errback) => {
      sendRequest("produce", {
        transportId: transport.id,
        kind,
        rtpParameters,
        userId,
      })
        .then((res) => callback({ id: res.id }))
        .catch(errback);
    });
    sendTransportRef.current = transport;
    return transport;
  }, [socket, sendRequest, userId]);

  // Create recv transport
  const createRecvTransport = useCallback(async () => {
    if (!socket) return;
    const params = await sendRequest("createWebRtcTransport", {});
    const device = deviceRef.current;
    if (!device) throw new Error("Device not loaded");
    const transport = device.createRecvTransport(params);
    transport.on("connect", ({ dtlsParameters }, callback, errback) => {
      sendRequest("connectWebRtcTransport", {
        transportId: transport.id,
        dtlsParameters,
      })
        .then(() => callback())
        .catch(errback);
    });
    recvTransportRef.current = transport;
    return transport;
  }, [socket, sendRequest]);

  // Produce local media
  const produce = useCallback(async (stream: MediaStream) => {
    if (!sendTransportRef.current) return;
    setLocalStream(stream);
    const producers = [];
    for (const track of stream.getTracks()) {
      try {
        const producer = await sendTransportRef.current.produce({ track });
        producers.push(producer);
      } catch (e) {
        // Ignore individual errors
      }
    }
    if (producers.length === 0) {
      stream.getTracks().forEach((track) => track.stop());
      setLocalStream(null);
    }
    return producers;
  }, []);

  // Consume remote media
  const consume = useCallback(
    async (
      producerId: string,
      rtpCapabilities: RtpCapabilities,
      onStream?: (stream: MediaStream, kind?: string, userId?: string) => void
    ) => {
      if (!recvTransportRef.current) {
        console.error("[mediasoup] No receive transport available");
        return;
      }

      // Check if we're already consuming this producer
      if (consumersRef.current.has(producerId)) {
        console.log("[mediasoup] Already consuming producer:", producerId);
        return;
      }

      try {
        const res = await sendRequest("consume", {
          transportId: recvTransportRef.current.id,
          producerId,
          rtpCapabilities,
        });
        
        if (res.error) {
          console.error("[mediasoup] Error consuming:", res.error);
          return;
        }

        const consumer: Consumer = await recvTransportRef.current.consume({
          id: res.id,
          producerId: res.producerId,
          kind: res.kind as "audio" | "video",
          rtpParameters: res.rtpParameters as RtpParameters,
        });

        // Store the consumer
        consumersRef.current.set(producerId, consumer);

        console.log("[mediasoup] Created consumer:", consumer.id, "for producer:", res.producerId);
        
        const stream = new MediaStream([consumer.track]);

        // Handle consumer closure
        consumer.on("@close", () => {
          console.log("[mediasoup] Consumer closed:", consumer.id);
          cleanupConsumer(producerId);
        });

        consumer.on("transportclose", () => {
          console.log("[mediasoup] Consumer transport closed:", consumer.id);
          cleanupConsumer(producerId);
        });

        if (onStream) {
          onStream(stream, res.kind, res.userId);
        } else {
          setRemoteStreams(prev => {
            // Remove any existing stream with the same producerId
            const filtered = prev.filter(s => s.producerId !== producerId);
            return [...filtered, { stream, producerId, userId: res.userId }];
          });
        }
      } catch (error) {
        console.error("[mediasoup] Error in consume:", error);
        cleanupConsumer(producerId);
      }
    },
    [sendRequest, cleanupConsumer]
  );

  // Handle new producers
  useEffect(() => {
    if (!deviceRef.current?.loaded) return;

    const handleNewProducer = (data: any) => {
      console.log("[mediasoup] New producer:", data);
      consume(data.id, deviceRef.current!.rtpCapabilities);
    };

    const handleProducerClosed = (data: any) => {
      console.log("[mediasoup] Producer closed:", data);
      cleanupConsumer(data.producerId);
    };

    addEventHandler("newProducer", handleNewProducer);
    addEventHandler("producerClosed", handleProducerClosed);

    return () => {
      removeEventHandler("newProducer");
      removeEventHandler("producerClosed");
      cleanupAllConsumers();
    };
  }, [addEventHandler, removeEventHandler, consume, cleanupConsumer, cleanupAllConsumers]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupAllConsumers();
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cleanupAllConsumers, localStream]);

  return {
    joinRoom,
    loadDevice,
    createSendTransport,
    createRecvTransport,
    produce,
    consume,
    localStream,
    setLocalStream,
    remoteStreams: remoteStreams.map(rs => rs.stream), 
    connected,
    socket,
    device: deviceRef.current,
  };
}
