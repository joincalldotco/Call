import * as mediasoup from "mediasoup";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import os from "os";
import { Mutex } from "async-mutex";

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

// Tipos específicos para mediasoup
type MediasoupProducer = Producer & {
  appData: {
    peerId?: string;
    source?: ProducerSource;
  };
};

type MediasoupAudioLevelObserverVolume = {
  producer: MediasoupProducer;
  volume: number;
};

export type MyProducer = {
  id: string;
  source: ProducerSource;
  producer: MediasoupProducer;
  paused: boolean;
  muted?: boolean;
};

export type MyConsumer = {
  id: string;
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

export type PendingJoin = {
  ws: WebSocket;
  roomId: string;
  peerId: string;
  displayName: string;
};

export type MyRoom = {
  id: string;
  worker: Worker;
  router: Router;
  audioLevelObserver: AudioLevelObserver;
  peers: Map<string, MyPeer>;
  mutex: Mutex;
  lastSpeakerId?: string;
  speakingThreshold: number;
};

// Global state with better organization
const rooms = new Map<string, MyRoom>();
const peerSocketMap = new Map<WebSocket, string>(); // WebSocket -> peerId
const peerRoomMap = new Map<string, string>(); // peerId -> roomId
const pendingJoins = new Map<WebSocket, PendingJoin>(); // WebSocket -> PendingJoin
const roomCreationMutex = new Mutex();
const workers: Worker[] = [];
let nextWorkerIdx = 0;
let isShuttingDown = false;

// Enhanced configuration with simulcast
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
        parameters: {
          "x-google-start-bitrate": 400,
        },
      },
      {
        kind: "video" as mediasoup.types.MediaKind,
        mimeType: "video/VP9",
        clockRate: 90000,
        parameters: {
          "profile-id": 2,
          "x-google-start-bitrate": 400,
        },
      },
      {
        kind: "video" as mediasoup.types.MediaKind,
        mimeType: "video/h264",
        clockRate: 90000,
        parameters: {
          "packetization-mode": 1,
          "profile-level-id": "4d0032",
          "level-asymmetry-allowed": 1,
          "x-google-start-bitrate": 400,
        },
      },
    ],
  },
  webRtcTransport: {
    listenIps: [{ ip: "0.0.0.0", announcedIp: "127.0.0.1" }],
    enableUdp: true,
    enableTcp: true,
    preferUdp: true,
    initialAvailableOutgoingBitrate: 800000,
    minimumAvailableOutgoingBitrate: 600000,
    maxSctpMessageSize: 262144,
    // Simulcast configuration
    enableSctp: true,
  },
  // Simulcast encoding parameters
  simulcastEncodings: [
    { maxBitrate: 100000 },
    { maxBitrate: 300000 },
    { maxBitrate: 900000 },
  ],
};

async function startMediasoup() {
  for (let i = 0; i < os.cpus().length; i++) {
    const worker = await mediasoup.createWorker(mediasoupConfig.worker);
    workers.push(worker);

    worker.on("died", (error) => {
      console.error("[mediasoup] Worker died:", error);
      if (!isShuttingDown) {
        setTimeout(() => process.exit(1), 2000);
      }
    });
  }
  console.log("[mediasoup] Workers initialized:", workers.length);
}

function getNextWorker(): Worker {
  const worker = workers[nextWorkerIdx]!;
  nextWorkerIdx = (nextWorkerIdx + 1) % workers.length;
  return worker;
}

// Utility functions with better error handling
function getPeerFromSocket(ws: WebSocket): MyPeer | null {
  const peerId = peerSocketMap.get(ws);
  if (!peerId) {
    // Check if it's a pending join
    const pending = pendingJoins.get(ws);
    if (pending) {
      return null; // Still joining
    }
    return null;
  }

  const roomId = peerRoomMap.get(peerId);
  if (!roomId) return null;

  const room = rooms.get(roomId);
  if (!room) return null;

  return room.peers.get(peerId) || null;
}

function getRoom(roomId: string): MyRoom | null {
  return rooms.get(roomId) || null;
}

async function createRoom(roomId: string): Promise<MyRoom> {
  // Use mutex to prevent race conditions
  return await roomCreationMutex.runExclusive(async () => {
    // Check if room already exists
    const existingRoom = rooms.get(roomId);
    if (existingRoom) {
      return existingRoom;
    }

    console.log(`[mediasoup] Creating room: ${roomId}`);

    const worker = getNextWorker();
    const router = await worker.createRouter({
      mediaCodecs: mediasoupConfig.router.mediaCodecs,
    });

    const audioLevelObserver = await router.createAudioLevelObserver({
      maxEntries: 1,
      threshold: -60,
      interval: 800,
    });

    const room: MyRoom = {
      id: roomId,
      worker,
      router,
      audioLevelObserver,
      peers: new Map(),
      mutex: new Mutex(),
      speakingThreshold: -60,
    };

    // Enhanced audio level observer with speaker change detection
    audioLevelObserver.on(
      "volumes",
      (volumes: MediasoupAudioLevelObserverVolume[]) => {
        const volume = volumes[0];
        if (!volume || !volume.producer.appData?.peerId) return;

        const speakerId = volume.producer.appData.peerId;

        // Only notify if speaker changed or volume is significant
        if (
          room.lastSpeakerId !== speakerId ||
          volume.volume > room.speakingThreshold
        ) {
          room.lastSpeakerId = speakerId;

          // Notify all peers about the active speaker
          room.peers.forEach((peer) => {
            if (peer.ws.readyState === WebSocket.OPEN) {
              peer.ws.send(
                JSON.stringify({
                  type: "activeSpeaker",
                  peerId: speakerId,
                  volume: volume.volume,
                })
              );
            }
          });
        }
      }
    );

    // Handle silence (no one speaking)
    audioLevelObserver.on("silence", () => {
      room.lastSpeakerId = undefined;
      room.peers.forEach((peer) => {
        if (peer.ws.readyState === WebSocket.OPEN) {
          peer.ws.send(
            JSON.stringify({
              type: "activeSpeaker",
              peerId: null,
              volume: -100,
            })
          );
        }
      });
    });

    rooms.set(roomId, room);
    console.log(`[mediasoup] Room created: ${roomId}`);
    return room;
  });
}

async function cleanupPeer(peerId: string) {
  const roomId = peerRoomMap.get(peerId);
  if (!roomId) return;

  const room = rooms.get(roomId);
  if (!room) return;

  await room.mutex.runExclusive(async () => {
    const peer = room.peers.get(peerId);
    if (!peer) return;

    console.log(`[mediasoup] Cleaning up peer: ${peerId}`);

    // Close all producers
    for (const [producerId, myProducer] of peer.producers) {
      try {
        myProducer.producer.close();

        // Notify other peers about producer closure
        room.peers.forEach((otherPeer) => {
          if (
            otherPeer.id !== peerId &&
            otherPeer.ws.readyState === WebSocket.OPEN
          ) {
            otherPeer.ws.send(
              JSON.stringify({
                type: "producerClosed",
                peerId,
                producerId,
              })
            );
          }
        });
      } catch (e) {
        console.error(`[mediasoup] Error closing producer ${producerId}:`, e);
      }
    }

    // Close all consumers
    for (const [_, myConsumer] of peer.consumers) {
      try {
        myConsumer.consumer.close();
      } catch (e) {
        console.error(
          `[mediasoup] Error closing consumer ${myConsumer.id}:`,
          e
        );
      }
    }

    // Close transports
    try {
      if (peer.sendTransport) {
        peer.sendTransport.close();
      }
      if (peer.recvTransport) {
        peer.recvTransport.close();
      }
    } catch (e) {
      console.error(`[mediasoup] Error closing transports:`, e);
    }

    // Remove from maps
    peerSocketMap.delete(peer.ws);
    peerRoomMap.delete(peerId);
    room.peers.delete(peerId);

    // Notify other peers about peer leaving
    room.peers.forEach((otherPeer) => {
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
    if (room.peers.size === 0) {
      console.log(`[mediasoup] Cleaning up empty room: ${roomId}`);
      try {
        room.router.close();
      } catch (e) {
        console.error(`[mediasoup] Error closing router:`, e);
      }
      rooms.delete(roomId);
    }

    console.log(`[mediasoup] Peer cleanup completed: ${peerId}`);
  });
}

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("[mediasoup] Shutting down gracefully...");
  isShuttingDown = true;

  // Close all rooms and peers
  const roomClosePromises = [];
  for (const [roomId, room] of rooms) {
    roomClosePromises.push(
      room.mutex.runExclusive(async () => {
        // Close all peers in the room
        const peerClosePromises = [];
        for (const [peerId, peer] of room.peers) {
          peerClosePromises.push(cleanupPeer(peerId));
        }
        await Promise.all(peerClosePromises);

        // Close the room
        try {
          room.router.close();
        } catch (e) {
          console.error(
            `[mediasoup] Error closing router for room ${roomId}:`,
            e
          );
        }
      })
    );
  }

  await Promise.all(roomClosePromises);

  // Close all workers
  for (const worker of workers) {
    worker.close();
  }

  process.exit(0);
});

process.on("SIGINT", () => {
  process.emit("SIGTERM");
});

// Initialize mediasoup
startMediasoup().catch(console.error);

// WebSocket server with improved error handling
const httpServer = createServer();
const wss = new WebSocketServer({ server: httpServer });

wss.on("connection", (ws: WebSocket) => {
  console.log("[mediasoup] New WebSocket connection");

  ws.on("error", (error) => {
    console.error("[mediasoup] WebSocket error:", error);
  });

  ws.on("close", async () => {
    console.log("[mediasoup] Client disconnected");

    // Check pending joins first
    const pending = pendingJoins.get(ws);
    if (pending) {
      pendingJoins.delete(ws);
      return;
    }

    const peerId = peerSocketMap.get(ws);
    if (peerId) {
      await cleanupPeer(peerId);
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
        case "joinRoom": {
          const { roomId, peerId, displayName = "Anonymous" } = data;

          // Validate input
          if (!roomId || !peerId) {
            ws.send(
              JSON.stringify({
                reqId: data.reqId,
                error: "roomId and peerId are required",
              })
            );
            return;
          }

          // Store as pending join
          pendingJoins.set(ws, { ws, roomId, peerId, displayName });

          const room = await createRoom(roomId);

          await room.mutex.runExclusive(async () => {
            // Check if peer already exists
            if (room.peers.has(peerId)) {
              ws.send(
                JSON.stringify({
                  reqId: data.reqId,
                  error: "Peer already exists in room",
                })
              );
              pendingJoins.delete(ws);
              return;
            }

            const peer: MyPeer = {
              id: peerId,
              displayName,
              device: null,
              ws,
              connectionState: "connecting",
              sendTransport: null,
              recvTransport: null,
              producers: new Map(),
              consumers: new Map(),
            };

            room.peers.set(peerId, peer);
            peerSocketMap.set(ws, peerId);
            peerRoomMap.set(peerId, roomId);

            // Remove from pending joins only after everything is set up
            pendingJoins.delete(ws);

            console.log(
              `[mediasoup] Peer joined: ${peerId} in room: ${roomId}`
            );

            // Get existing producers in the room
            const existingProducers: Array<{
              id: string;
              peerId: string;
              kind: mediasoup.types.MediaKind;
              source: ProducerSource;
              displayName: string;
              muted: boolean;
            }> = [];

            room.peers.forEach((otherPeer) => {
              if (otherPeer.id !== peerId) {
                otherPeer.producers.forEach((myProducer) => {
                  existingProducers.push({
                    id: myProducer.id,
                    peerId: otherPeer.id,
                    kind: myProducer.producer.kind,
                    source: myProducer.source,
                    displayName: otherPeer.displayName,
                    muted: myProducer.muted || false,
                  });
                });
              }
            });

            // Notify other peers about new peer
            room.peers.forEach((otherPeer) => {
              if (
                otherPeer.id !== peerId &&
                otherPeer.ws.readyState === WebSocket.OPEN
              ) {
                otherPeer.ws.send(
                  JSON.stringify({
                    type: "peerJoined",
                    peerId,
                    displayName,
                    isCreator: room.peers.size === 1,
                  })
                );
              }
            });

            const peersInfo = Array.from(room.peers.values())
              .filter((p) => p.id !== peerId)
              .map((p) => ({
                id: p.id,
                displayName: p.displayName,
                connectionState: p.connectionState,
              }));

            ws.send(
              JSON.stringify({
                reqId: data.reqId,
                type: "joinRoomResponse",
                rtpCapabilities: room.router.rtpCapabilities,
                peers: peersInfo,
                producers: existingProducers,
              })
            );

            peer.connectionState = "connected";
          });
          break;
        }

        case "createWebRtcTransport": {
          const peer = getPeerFromSocket(ws);
          if (!peer) {
            // Check if still joining
            if (pendingJoins.has(ws)) {
              ws.send(
                JSON.stringify({
                  reqId: data.reqId,
                  error: "Still joining room",
                })
              );
            } else {
              ws.send(
                JSON.stringify({
                  reqId: data.reqId,
                  error: "Peer not found",
                })
              );
            }
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
                error: pendingJoins.has(ws)
                  ? "Still joining room"
                  : "Peer not found",
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
                error: pendingJoins.has(ws)
                  ? "Still joining room"
                  : "Peer or transport not found",
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

          await room.mutex.runExclusive(async () => {
            const detectedSource: ProducerSource =
              data.source || (data.kind === "audio" ? "mic" : "webcam");

            console.log(
              `[produce] Creating producer with kind: ${data.kind}, provided source: ${data.source}, detected source: ${detectedSource}, peer: ${peer.id}`
            );

            // Configure simulcast for video
            let encodings = undefined;
            if (data.kind === "video" && detectedSource !== "screen") {
              encodings = mediasoupConfig.simulcastEncodings;
            }

            const producer = (await peer.sendTransport!.produce({
              kind: data.kind,
              rtpParameters: data.rtpParameters,
              encodings,
              appData: {
                peerId: peer.id,
                source: detectedSource,
              },
            })) as MediasoupProducer;

            const myProducer: MyProducer = {
              id: producer.id,
              source: detectedSource,
              producer,
              paused: false,
              muted: false,
            };

            peer.producers.set(producer.id, myProducer);

            // Add to audio level observer if it's an audio producer
            if (producer.kind === "audio") {
              await room.audioLevelObserver.addProducer({
                producerId: producer.id,
              });
            }

            // Handle producer events with proper cleanup
            producer.on("transportclose", () => {
              console.log(
                `[mediasoup] Producer transport closed: ${producer.id}`
              );

              // Check if this transport belongs to the correct peer
              const transportPeerId = producer.appData.peerId;
              if (transportPeerId === peer.id) {
                peer.producers.delete(producer.id);

                // Remove from audio level observer if it's audio
                if (producer.kind === "audio") {
                  try {
                    room.audioLevelObserver.removeProducer({
                      producerId: producer.id,
                    });
                  } catch (e) {
                    // Already removed
                  }
                }

                // Notify other peers
                room.peers.forEach((otherPeer) => {
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
              }
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
              muted: myProducer.muted || false,
            };

            room.peers.forEach((otherPeer) => {
              if (
                otherPeer.id !== peer.id &&
                otherPeer.ws.readyState === WebSocket.OPEN
              ) {
                otherPeer.ws.send(JSON.stringify(notificationData));
              }
            });
          });
          break;
        }

        case "consume": {
          const peer = getPeerFromSocket(ws);
          if (!peer || !peer.recvTransport) {
            ws.send(
              JSON.stringify({
                reqId: data.reqId,
                error: pendingJoins.has(ws)
                  ? "Still joining room"
                  : "Peer or transport not found",
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

          await room.mutex.runExclusive(async () => {
            // Find the producer
            let targetPeer: MyPeer | null = null;
            let myProducer: MyProducer | null = null;

            for (const [_, p] of room.peers) {
              const producer = p.producers.get(data.producerId);
              if (producer) {
                targetPeer = p;
                myProducer = producer;
                break;
              }
            }

            if (!targetPeer || !myProducer) {
              ws.send(
                JSON.stringify({
                  reqId: data.reqId,
                  error: "Producer not found",
                })
              );
              return;
            }

            // Check if consumer already exists
            if (peer.consumers.has(myProducer.id)) {
              ws.send(
                JSON.stringify({
                  reqId: data.reqId,
                  error: "Consumer already exists",
                })
              );
              return;
            }

            try {
              const consumer = await peer.recvTransport!.consume({
                producerId: myProducer.producer.id,
                rtpCapabilities: data.rtpCapabilities,
                paused: false,
              });

              const myConsumer: MyConsumer = {
                id: consumer.id,
                peerId: targetPeer.id,
                producerId: myProducer.id,
                consumer,
              };

              peer.consumers.set(myProducer.id, myConsumer);

              // Handle consumer events with proper guards
              consumer.on("transportclose", () => {
                if (peer.consumers.has(myProducer!.id)) {
                  peer.consumers.delete(myProducer!.id);
                }
              });

              consumer.on("producerclose", () => {
                if (peer.consumers.has(myProducer!.id)) {
                  peer.consumers.delete(myProducer!.id);
                }
              });

              const consumeResponse = {
                reqId: data.reqId,
                type: "consumeResponse",
                id: consumer.id,
                producerId: myProducer.id,
                kind: consumer.kind,
                rtpParameters: consumer.rtpParameters,
                peerId: targetPeer.id,
                displayName: targetPeer.displayName,
                source: myProducer.source,
                muted: myProducer.muted || false,
              };

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
          });
          break;
        }

        case "setProducerMuted": {
          const peer = getPeerFromSocket(ws);
          if (!peer) {
            ws.send(
              JSON.stringify({
                reqId: data.reqId,
                error: pendingJoins.has(ws)
                  ? "Still joining room"
                  : "Peer not found",
              })
            );
            return;
          }

          const { producerId, muted } = data;
          const myProducer = peer.producers.get(producerId);

          if (!myProducer) {
            ws.send(
              JSON.stringify({
                reqId: data.reqId,
                error: "Producer not found",
              })
            );
            return;
          }

          myProducer.muted = muted;

          const roomId = peerRoomMap.get(peer.id);
          const room = getRoom(roomId!);

          if (room) {
            // Notify other peers
            room.peers.forEach((otherPeer) => {
              if (
                otherPeer.id !== peer.id &&
                otherPeer.ws.readyState === WebSocket.OPEN
              ) {
                otherPeer.ws.send(
                  JSON.stringify({
                    type: "producerMuted",
                    peerId: peer.id,
                    producerId,
                    muted,
                  })
                );
              }
            });
          }

          ws.send(
            JSON.stringify({
              reqId: data.reqId,
              type: "setProducerMutedResponse",
              success: true,
            })
          );
          break;
        }

        case "pauseProducer": {
          const peer = getPeerFromSocket(ws);
          if (!peer) {
            ws.send(
              JSON.stringify({
                reqId: data.reqId,
                error: pendingJoins.has(ws)
                  ? "Still joining room"
                  : "Peer not found",
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
                error: pendingJoins.has(ws)
                  ? "Still joining room"
                  : "Peer not found",
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

        case "closeProducer": {
          const peer = getPeerFromSocket(ws);
          if (!peer) {
            ws.send(
              JSON.stringify({
                reqId: data.reqId,
                error: pendingJoins.has(ws)
                  ? "Still joining room"
                  : "Peer not found",
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

          const roomId = peerRoomMap.get(peer.id);
          const room = getRoom(roomId!);

          if (room) {
            await room.mutex.runExclusive(async () => {
              // Close the producer
              myProducer.producer.close();
              peer.producers.delete(data.producerId);

              // Remove from audio level observer if it's audio
              if (myProducer.producer.kind === "audio") {
                try {
                  room.audioLevelObserver.removeProducer({
                    producerId: data.producerId,
                  });
                } catch (e) {
                  // Already removed
                }
              }

              // Notify other peers about producer closure
              room.peers.forEach((otherPeer) => {
                if (
                  otherPeer.id !== peer.id &&
                  otherPeer.ws.readyState === WebSocket.OPEN
                ) {
                  otherPeer.ws.send(
                    JSON.stringify({
                      type: "producerClosed",
                      peerId: peer.id,
                      producerId: data.producerId,
                    })
                  );
                }
              });
            });
          }

          ws.send(
            JSON.stringify({
              reqId: data.reqId,
              type: "closeProducerResponse",
              success: true,
            })
          );
          break;
        }

        case "chat": {
          const peer = getPeerFromSocket(ws);
          if (!peer) {
            ws.send(
              JSON.stringify({
                reqId: data.reqId,
                error: pendingJoins.has(ws)
                  ? "Still joining room"
                  : "Peer not found",
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

          const chatMessage = {
            type: "chat",
            message: data.message,
            peerId: peer.id,
            displayName: peer.displayName,
            timestamp: Date.now(),
          };

          // Broadcast to all peers in the room
          room.peers.forEach((otherPeer) => {
            if (otherPeer.ws.readyState === WebSocket.OPEN) {
              otherPeer.ws.send(JSON.stringify(chatMessage));
            }
          });

          ws.send(
            JSON.stringify({
              reqId: data.reqId,
              type: "chatResponse",
              success: true,
            })
          );
          break;
        }

        case "getRouterRtpCapabilities": {
          const { roomId } = data;
          const room = getRoom(roomId);

          if (!room) {
            ws.send(
              JSON.stringify({
                reqId: data.reqId,
                error: "Room not found",
              })
            );
            return;
          }

          ws.send(
            JSON.stringify({
              reqId: data.reqId,
              type: "getRouterRtpCapabilitiesResponse",
              rtpCapabilities: room.router.rtpCapabilities,
            })
          );
          break;
        }

        case "ping": {
          ws.send(
            JSON.stringify({
              reqId: data.reqId,
              type: "pong",
              timestamp: Date.now(),
            })
          );
          break;
        }

        default:
          ws.send(
            JSON.stringify({
              reqId: data.reqId,
              error: `Unknown message type: ${data.type}`,
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

const PORT = process.env.PORT || 4001;
httpServer.listen(PORT, () => {
  console.log(`[mediasoup] Signaling server running on ws://localhost:${PORT}`);
});

// Health check endpoint
httpServer.on("request", (req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        status: "ok",
        workers: workers.length,
        rooms: rooms.size,
        timestamp: Date.now(),
      })
    );
  } else {
    res.writeHead(404);
    res.end();
  }
});
