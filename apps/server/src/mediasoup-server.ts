import * as mediasoup from "mediasoup";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";

// --- Types -----
type Consumer = mediasoup.types.Consumer;
type DataConsumer = mediasoup.types.DataConsumer;
type DataProducer = mediasoup.types.DataProducer;
type Producer = mediasoup.types.Producer;
type Transport = mediasoup.types.Transport;
type Router = mediasoup.types.Router;
type AudioLevelObserver = mediasoup.types.AudioLevelObserver;
type Worker = mediasoup.types.Worker;

export type ProducerSource = "mic" | "webcam" | "screen";

export type MyProducer = {
  id: string; // Producer ID
  source: ProducerSource;
  producer: Producer;
  paused: boolean;
};

export type MyConsumer = {
  id: string; // Consumer ID
  peerId: string;
  producerId: string;
  consumer: Consumer;
};

export type MyPeer = {
  id: string;
  displayName: string;
  device: any;
  ws: WebSocket;

  connectionState: "new" | "connecting" | "connected" | "disconnected";

  sendTransport: Transport | null;
  recvTransport: Transport | null;

  producers: Map<string, MyProducer>;
  consumers: Map<string, MyConsumer>;
};

export type Then<T> = T extends PromiseLike<infer U> ? U : T;

export type MyRoomState = Record<string, MyPeer>;

export type MyRoom = {
  id: string; // Unique identifier for the room
  worker: Worker;
  router: Router;
  audioLevelObserver: AudioLevelObserver;
  peers: MyRoomState;
};

export type MyRooms = Record<string, MyRoom>;

// Global state
const rooms: MyRooms = {};
const peerSocketMap = new Map<WebSocket, string>(); // WebSocket -> peerId
const peerRoomMap = new Map<string, string>(); // peerId -> roomId

// basic configuration for mediasoup
const mediasoupConfig = {
  worker: {
    rtcMinPort: 40000,
    rtcMaxPort: 49999,
    logLevel: "warn" as mediasoup.types.WorkerLogLevel,
    logTags: [
      "info" as mediasoup.types.WorkerLogTag,
      "ice" as mediasoup.types.WorkerLogTag,
      "dtls" as mediasoup.types.WorkerLogTag,
      "rtp" as mediasoup.types.WorkerLogTag,
      "srtp" as mediasoup.types.WorkerLogTag,
      "rtcp" as mediasoup.types.WorkerLogTag,
    ],
  },
  router: {
    mediaCodecs: [
      {
        kind: "audio" as mediasoup.types.MediaKind,
        mimeType: "audio/opus",
        clockRate: 48000,
        channels: 2,
      },
      {
        kind: "video" as mediasoup.types.MediaKind,
        mimeType: "video/VP8",
        clockRate: 90000,
        parameters: {},
      },
    ],
  },
  webRtcTransport: {
    listenIps: [{ ip: "0.0.0.0", announcedIp: "127.0.0.1" }],
    enableUdp: true,
    enableTcp: true,
    preferUdp: true,
    initialAvailableOutgoingBitrate: 800000,
  },
};

let globalWorker: Worker;

async function startMediasoup() {
  globalWorker = await mediasoup.createWorker(mediasoupConfig.worker);
  console.log("[mediasoup] Worker initialized");
}

startMediasoup().catch(console.error);

// Utility functions
function getPeerFromSocket(ws: WebSocket): MyPeer | null {
  const peerId = peerSocketMap.get(ws);
  if (!peerId) return null;

  const roomId = peerRoomMap.get(peerId);
  if (!roomId) return null;

  const room = rooms[roomId];
  if (!room) return null;

  return room.peers[peerId] || null;
}

function getRoom(roomId: string): MyRoom | null {
  return rooms[roomId] || null;
}

async function createRoom(roomId: string): Promise<MyRoom> {
  if (rooms[roomId]) {
    return rooms[roomId];
  }

  console.log(`[mediasoup] Creating room: ${roomId}`);

  const router = await globalWorker.createRouter({
    mediaCodecs: mediasoupConfig.router.mediaCodecs,
  });

  const audioLevelObserver = await router.createAudioLevelObserver({
    maxEntries: 1,
    threshold: -80,
    interval: 800,
  });

  const room: MyRoom = {
    id: roomId,
    worker: globalWorker,
    router,
    audioLevelObserver,
    peers: {},
  };

  rooms[roomId] = room;

  // Handle audio level changes
  audioLevelObserver.on("volumes", (volumes) => {
    const volume = volumes[0];
    if (volume) {
      // Notify all peers in the room about audio levels
      Object.values(room.peers).forEach((peer) => {
        if (peer.ws.readyState === WebSocket.OPEN) {
          peer.ws.send(
            JSON.stringify({
              type: "audioLevel",
              peerId: volume.producer.appData.peerId,
              volume: volume.volume,
            })
          );
        }
      });
    }
  });

  console.log(`[mediasoup] Room created: ${roomId}`);
  return room;
}

async function createPeer(
  roomId: string,
  peerId: string,
  displayName: string,
  ws: WebSocket
): Promise<MyPeer> {
  const room = await createRoom(roomId);

  console.log(`[mediasoup] Creating peer: ${peerId} in room: ${roomId}`);

  const peer: MyPeer = {
    id: peerId,
    displayName,
    device: null,
    ws,
    connectionState: "new",
    sendTransport: null,
    recvTransport: null,
    producers: new Map(),
    consumers: new Map(),
  };

  room.peers[peerId] = peer;
  peerSocketMap.set(ws, peerId);
  peerRoomMap.set(peerId, roomId);

  console.log(`[mediasoup] Peer created: ${peerId}`);
  return peer;
}

function cleanupPeer(peerId: string) {
  const roomId = peerRoomMap.get(peerId);
  if (!roomId) return;

  const room = rooms[roomId];
  if (!room) return;

  const peer = room.peers[peerId];
  if (!peer) return;

  console.log(`[mediasoup] Cleaning up peer: ${peerId}`);

  // Close all producers
  peer.producers.forEach((myProducer) => {
    myProducer.producer.close();

    // Notify other peers about producer closure
    Object.values(room.peers).forEach((otherPeer) => {
      if (
        otherPeer.id !== peerId &&
        otherPeer.ws.readyState === WebSocket.OPEN
      ) {
        otherPeer.ws.send(
          JSON.stringify({
            type: "producerClosed",
            peerId,
            producerId: myProducer.id,
          })
        );
      }
    });
  });

  // Close all consumers
  peer.consumers.forEach((myConsumer) => {
    myConsumer.consumer.close();
  });

  // Close transports
  if (peer.sendTransport) {
    peer.sendTransport.close();
  }
  if (peer.recvTransport) {
    peer.recvTransport.close();
  }

  // Remove from maps
  peerSocketMap.delete(peer.ws);
  peerRoomMap.delete(peerId);
  delete room.peers[peerId];

  // Notify other peers about peer leaving
  Object.values(room.peers).forEach((otherPeer) => {
    if (otherPeer.ws.readyState === WebSocket.OPEN) {
      otherPeer.ws.send(
        JSON.stringify({
          type: "peerLeft",
          peerId,
          displayName: peer.displayName,
        })
      );
    }
  });

  // Clean up room if empty
  if (Object.keys(room.peers).length === 0) {
    console.log(`[mediasoup] Cleaning up empty room: ${roomId}`);
    room.router.close();
    delete rooms[roomId];
  }

  console.log(`[mediasoup] Peer cleanup completed: ${peerId}`);
}

const httpServer = createServer();
const wss = new WebSocketServer({ server: httpServer });

wss.on("connection", (ws: WebSocket) => {
  console.log("[mediasoup] New WebSocket connection");

  ws.on("close", () => {
    console.log("[mediasoup] Client disconnected");
    const peerId = peerSocketMap.get(ws);
    if (peerId) {
      cleanupPeer(peerId);
    }
  });

  ws.on("message", async (message: string) => {
    let data;
    try {
      data = JSON.parse(message.toString());
    } catch (e) {
      ws.send(JSON.stringify({ error: "Invalid JSON" }));
      return;
    }

    try {
      switch (data.type) {
        case "createRoom": {
          const { roomId } = data;
          await createRoom(roomId);
          ws.send(
            JSON.stringify({
              reqId: data.reqId,
              type: "createRoomResponse",
              success: true,
            })
          );
          break;
        }

        case "joinRoom": {
          const { roomId, peerId, displayName = "Anonymous" } = data;

          const room = await createRoom(roomId);
          const peer = await createPeer(roomId, peerId, displayName, ws);

          peer.connectionState = "connecting";

          // Get existing producers in the room
          const existingProducers: any[] = [];
          Object.values(room.peers).forEach((otherPeer) => {
            if (otherPeer.id !== peerId) {
              otherPeer.producers.forEach((myProducer) => {
                existingProducers.push({
                  id: myProducer.id,
                  peerId: otherPeer.id,
                  kind: myProducer.producer.kind,
                  source: myProducer.source,
                  displayName: otherPeer.displayName,
                });
              });
            }
          });

          // Notify other peers about new peer
          Object.values(room.peers).forEach((otherPeer) => {
            if (
              otherPeer.id !== peerId &&
              otherPeer.ws.readyState === WebSocket.OPEN
            ) {
              otherPeer.ws.send(
                JSON.stringify({
                  type: "peerJoined",
                  peerId,
                  displayName,
                })
              );
            }
          });

          ws.send(
            JSON.stringify({
              reqId: data.reqId,
              type: "joinRoomResponse",
              rtpCapabilities: room.router.rtpCapabilities,
              peers: Object.values(room.peers)
                .filter((p) => p.id !== peerId)
                .map((p) => ({
                  id: p.id,
                  displayName: p.displayName,
                  connectionState: p.connectionState,
                })),
              producers: existingProducers,
            })
          );

          peer.connectionState = "connected";
          break;
        }

        case "createWebRtcTransport": {
          const peer = getPeerFromSocket(ws);
          if (!peer) {
            ws.send(
              JSON.stringify({
                reqId: data.reqId,
                error: "Peer not found",
              })
            );
            return;
          }

          const roomId = peerRoomMap.get(peer.id);
          const room = getRoom(roomId!);
          if (!room) {
            ws.send(
              JSON.stringify({
                reqId: data.reqId,
                error: "Room not found",
              })
            );
            return;
          }

          const transport = await room.router.createWebRtcTransport({
            listenIps: mediasoupConfig.webRtcTransport.listenIps,
            enableUdp: mediasoupConfig.webRtcTransport.enableUdp,
            enableTcp: mediasoupConfig.webRtcTransport.enableTcp,
            preferUdp: mediasoupConfig.webRtcTransport.preferUdp,
            initialAvailableOutgoingBitrate:
              mediasoupConfig.webRtcTransport.initialAvailableOutgoingBitrate,
            appData: { peerId: peer.id, direction: data.direction || "send" },
          });

          // Store transport reference
          if (data.direction === "recv") {
            peer.recvTransport = transport;
          } else {
            peer.sendTransport = transport;
          }

          ws.send(
            JSON.stringify({
              reqId: data.reqId,
              type: "createWebRtcTransportResponse",
              id: transport.id,
              iceParameters: transport.iceParameters,
              iceCandidates: transport.iceCandidates,
              dtlsParameters: transport.dtlsParameters,
              sctpParameters: transport.sctpParameters,
            })
          );
          break;
        }

        case "connectWebRtcTransport": {
          const peer = getPeerFromSocket(ws);
          if (!peer) {
            ws.send(
              JSON.stringify({
                reqId: data.reqId,
                error: "Peer not found",
              })
            );
            return;
          }

          let transport;
          if (data.direction === "recv") {
            transport = peer.recvTransport;
          } else {
            transport = peer.sendTransport;
          }
          if (!transport) {
            ws.send(
              JSON.stringify({
                reqId: data.reqId,
                error: "Transport not found",
              })
            );
            return;
          }

          await transport.connect({ dtlsParameters: data.dtlsParameters });

          ws.send(
            JSON.stringify({
              reqId: data.reqId,
              type: "connectWebRtcTransportResponse",
              connected: true,
            })
          );
          break;
        }

        case "produce": {
          const peer = getPeerFromSocket(ws);
          if (!peer || !peer.sendTransport) {
            ws.send(
              JSON.stringify({
                reqId: data.reqId,
                error: "Peer or transport not found",
              })
            );
            return;
          }

          const roomId = peerRoomMap.get(peer.id);
          const room = getRoom(roomId!);
          if (!room) {
            ws.send(
              JSON.stringify({
                reqId: data.reqId,
                error: "Room not found",
              })
            );
            return;
          }

          const detectedSource =
            data.source || (data.kind === "audio" ? "mic" : "webcam");

          console.log(
            `[produce] Creating producer with kind: ${data.kind}, provided source: ${data.source}, detected source: ${detectedSource}, peer: ${peer.id}`
          );

          const producer = await peer.sendTransport.produce({
            kind: data.kind,
            rtpParameters: data.rtpParameters,
            appData: {
              peerId: peer.id,
              source: detectedSource,
            },
          });

          const myProducer: MyProducer = {
            id: producer.id,
            source: detectedSource,
            producer,
            paused: false,
          };

          peer.producers.set(producer.id, myProducer);

          // Add to audio level observer if it's an audio producer
          if (producer.kind === "audio") {
            room.audioLevelObserver.addProducer({ producerId: producer.id });
          }

          // Handle producer events
          producer.on("transportclose", () => {
            console.log(
              `[mediasoup] Producer transport closed: ${producer.id}`
            );
            peer.producers.delete(producer.id);

            // Notify other peers
            Object.values(room.peers).forEach((otherPeer) => {
              if (
                otherPeer.id !== peer.id &&
                otherPeer.ws.readyState === WebSocket.OPEN
              ) {
                otherPeer.ws.send(
                  JSON.stringify({
                    type: "producerClosed",
                    peerId: peer.id,
                    producerId: producer.id,
                  })
                );
              }
            });
          });

          console.log(
            `[mediasoup] Producer created: ${producer.id}, kind: ${producer.kind}, source: ${myProducer.source}, peer: ${peer.id}`
          );

          ws.send(
            JSON.stringify({
              reqId: data.reqId,
              type: "produceResponse",
              id: producer.id,
            })
          );

          // Notify other peers about new producer
          const notificationData = {
            type: "newProducer",
            id: producer.id,
            peerId: peer.id,
            kind: producer.kind,
            source: myProducer.source,
            displayName: peer.displayName,
          };

          console.log(
            `[mediasoup] Notifying other peers about new producer:`,
            notificationData
          );

          Object.values(room.peers).forEach((otherPeer) => {
            if (
              otherPeer.id !== peer.id &&
              otherPeer.ws.readyState === WebSocket.OPEN
            ) {
              console.log(
                `[mediasoup] Sending notification to peer: ${otherPeer.id}`
              );
              otherPeer.ws.send(JSON.stringify(notificationData));
            }
          });
          break;
        }

        case "consume": {
          const peer = getPeerFromSocket(ws);
          if (!peer || !peer.recvTransport) {
            console.log(
              `[consume] Peer or transport not found for request: ${data.reqId}`
            );
            ws.send(
              JSON.stringify({
                reqId: data.reqId,
                error: "Peer or transport not found",
              })
            );
            return;
          }

          const roomId = peerRoomMap.get(peer.id);
          const room = getRoom(roomId!);
          if (!room) {
            console.log(`[consume] Room not found for peer: ${peer.id}`);
            ws.send(
              JSON.stringify({
                reqId: data.reqId,
                error: "Room not found",
              })
            );
            return;
          }

          console.log(
            `[consume] Looking for producer: ${data.producerId} in room: ${roomId}`
          );

          // Find the producer
          let targetPeer: MyPeer | null = null;
          let myProducer: MyProducer | null = null;

          Object.values(room.peers).forEach((p) => {
            const producer = p.producers.get(data.producerId);
            if (producer) {
              targetPeer = p;
              myProducer = producer;
              console.log(
                `[consume] Found producer ${data.producerId} from peer: ${p.id}`
              );
            }
          });

          if (!targetPeer || !myProducer) {
            console.log(
              `[consume] Producer ${data.producerId} not found in room ${roomId}`
            );
            console.log(
              `[consume] Available producers:`,
              Object.values(room.peers)
                .map((p) => Array.from(p.producers.keys()))
                .flat()
            );
            ws.send(
              JSON.stringify({
                reqId: data.reqId,
                error: "Producer not found",
              })
            );
            return;
          }

          try {
            console.log(
              `[consume] Creating consumer for producer: ${(myProducer as MyProducer).producer.id}, kind: ${(myProducer as MyProducer).producer.kind}`
            );

            const consumer = await peer.recvTransport.consume({
              producerId: (myProducer as MyProducer).producer.id,
              rtpCapabilities: data.rtpCapabilities,
              paused: false,
            });

            const myConsumer: MyConsumer = {
              id: consumer.id,
              peerId: (targetPeer as MyPeer).id,
              producerId: (myProducer as MyProducer).id,
              consumer,
            };

            peer.consumers.set((myProducer as MyProducer).id, myConsumer);

            // Handle consumer events
            consumer.on("transportclose", () => {
              console.log(
                `[mediasoup] Consumer transport closed: ${consumer.id}`
              );
              peer.consumers.delete(myProducer!.id);
            });

            consumer.on("producerclose", () => {
              console.log(
                `[mediasoup] Consumer producer closed: ${consumer.id}`
              );
              peer.consumers.delete(myProducer!.id);
            });

            console.log(
              `[mediasoup] Consumer created successfully: ${consumer.id} for producer: ${(myProducer as MyProducer).id}, peer: ${peer.id} -> ${(targetPeer as MyPeer).id}`
            );

            const consumeResponse = {
              reqId: data.reqId,
              type: "consumeResponse",
              id: consumer.id,
              producerId: (myProducer as MyProducer).id,
              kind: consumer.kind,
              rtpParameters: consumer.rtpParameters,
              peerId: (targetPeer as MyPeer).id,
              displayName: (targetPeer as MyPeer).displayName,
              source: (myProducer as MyProducer).source,
            };

            console.log(
              `[mediasoup] Sending consume response:`,
              consumeResponse
            );

            ws.send(JSON.stringify(consumeResponse));
          } catch (error: any) {
            console.error(`[consume] Error creating consumer:`, error);
            ws.send(
              JSON.stringify({
                reqId: data.reqId,
                error: `Failed to create consumer: ${error.message}`,
              })
            );
          }
          break;
        }

        case "pauseProducer": {
          const peer = getPeerFromSocket(ws);
          if (!peer) {
            ws.send(
              JSON.stringify({
                reqId: data.reqId,
                error: "Peer not found",
              })
            );
            return;
          }

          const myProducer = peer.producers.get(data.producerId);
          if (!myProducer) {
            ws.send(
              JSON.stringify({
                reqId: data.reqId,
                error: "Producer not found",
              })
            );
            return;
          }

          await myProducer.producer.pause();
          myProducer.paused = true;

          ws.send(
            JSON.stringify({
              reqId: data.reqId,
              type: "pauseProducerResponse",
              success: true,
            })
          );
          break;
        }

        case "resumeProducer": {
          const peer = getPeerFromSocket(ws);
          if (!peer) {
            ws.send(
              JSON.stringify({
                reqId: data.reqId,
                error: "Peer not found",
              })
            );
            return;
          }

          const myProducer = peer.producers.get(data.producerId);
          if (!myProducer) {
            ws.send(
              JSON.stringify({
                reqId: data.reqId,
                error: "Producer not found",
              })
            );
            return;
          }

          await myProducer.producer.resume();
          myProducer.paused = false;

          ws.send(
            JSON.stringify({
              reqId: data.reqId,
              type: "resumeProducerResponse",
              success: true,
            })
          );
          break;
        }

        default:
          ws.send(
            JSON.stringify({
              reqId: data.reqId,
              type: "pong",
              data: "Mediasoup signaling server ready",
            })
          );
      }
    } catch (error: any) {
      console.error(`[mediasoup] Error handling ${data.type}:`, error);
      ws.send(
        JSON.stringify({
          reqId: data.reqId,
          error: error.message || "Internal server error",
        })
      );
    }
  });
});

const PORT = 4001;
httpServer.listen(PORT, () => {
  console.log(`[mediasoup] Signaling server running on ws://localhost:${PORT}`);
});
