import * as mediasoup from "mediasoup";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import os from "os";
import { env } from "@/config/env";

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
  userImage?: string;
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
const workers: Worker[] = [];
let nextWorkerIdx = 0;

// Track pending join requests by composite key roomId:peerId
const pendingJoinRequests = new Map<string, WebSocket>();

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
    listenIps: [
  { ip: "0.0.0.0", announcedIp: env.MEDIASOUP_ANNOUNCED_IP },
    ],
    enableUdp: true,
    enableTcp: true,
    preferUdp: true,
    initialAvailableOutgoingBitrate: 800000,
  },
};

async function startMediasoup() {
  for (let i = 0; i < os.cpus().length; i++) {
    const worker = await mediasoup.createWorker(mediasoupConfig.worker);
    workers.push(worker);
  }
  console.log("[mediasoup] Worker initialized");
}

function getNextWorker(): Worker {
  const worker = workers[nextWorkerIdx]!;
  nextWorkerIdx = (nextWorkerIdx + 1) % workers.length;
  return worker;
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

  const worker = getNextWorker();
  const router = await worker.createRouter({
    mediaCodecs: mediasoupConfig.router.mediaCodecs,
  });

  const audioLevelObserver = await router.createAudioLevelObserver({
    maxEntries: 1,
    threshold: -80,
    interval: 800,
  });

  const room: MyRoom = {
    id: roomId,
    worker,
    router,
    audioLevelObserver,
    peers: {},
  };

  rooms[roomId] = room;

  // Handle audio level changes
  audioLevelObserver.on(
    "volumes",
    (volumes: MediasoupAudioLevelObserverVolume[]) => {
      const volume = volumes[0];
      if (volume && volume.producer.appData?.peerId) {
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
    }
  );

  console.log(`[mediasoup] Room created: ${roomId}`);
  return room;
}

async function createPeer(
  roomId: string,
  peerId: string,
  displayName: string,
  ws: WebSocket,
  userImage?: string
): Promise<MyPeer> {
  const room = await createRoom(roomId);

  console.log(`[mediasoup] Creating peer: ${peerId} in room: ${roomId}`);

  const peer: MyPeer = {
    id: peerId,
    displayName,
    userImage,
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
          const { roomId, peerId, displayName = "Anonymous", userImage } = data;

          const room = await createRoom(roomId);
          const peer = await createPeer(roomId, peerId, displayName, ws, userImage);

          peer.connectionState = "connecting";

          // Get existing producers in the room
          const existingProducers = Object.values(room.peers).reduce<
            Array<{
              id: string;
              peerId: string;
              kind: mediasoup.types.MediaKind;
              source: ProducerSource;
              displayName: string;
              userImage?: string;
              muted: boolean;
            }>
          >((acc, otherPeer) => {
            if (otherPeer.id !== peerId) {
              otherPeer.producers.forEach((myProducer) => {
                acc.push({
                  id: myProducer.id,
                  peerId: otherPeer.id,
                  kind: myProducer.producer.kind,
                  source: myProducer.source,
                  displayName: otherPeer.displayName,
                  userImage: otherPeer.userImage,
                  muted: myProducer.muted || false,
                });
              });
            }
            return acc;
          }, []);

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
                  isCreator: room.peers[peerId]?.id === peerId,
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

        case "requestJoin": {
          const peer = getPeerFromSocket(ws);
          const providedRoomId = data.roomId as string | undefined;
          const providedPeerId = data.peerId as string | undefined;
          const providedDisplayName = data.displayName as string | undefined;
          const requesterId = data.requesterId as string | undefined;
          if (!peer && !providedRoomId) {
            ws.send(
              JSON.stringify({
                reqId: data.reqId,
                error: "Peer or roomId not provided",
              })
            );
            return;
          }

          const roomId = peer ? peerRoomMap.get(peer.id) : providedRoomId;
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

          const requesterPeerId = peer?.id || providedPeerId || "unknown";
          const requesterDisplayName =
            peer?.displayName || providedDisplayName || "Anonymous";

          if (roomId && requesterPeerId) {
            pendingJoinRequests.set(`${roomId}:${requesterPeerId}`, ws);
          }

          Object.values(room.peers).forEach((otherPeer) => {
            if (
              otherPeer.id !== requesterPeerId &&
              otherPeer.ws.readyState === WebSocket.OPEN
            ) {
              otherPeer.ws.send(
                JSON.stringify({
                  type: "requestJoinResponse",
                  reqId: data.reqId,
                  peerId: requesterPeerId,
                  displayName: requesterDisplayName,
                  roomId: roomId,
                  requesterId: requesterId,
                })
              );
            }
          });

          // Optional ack to requester
          ws.send(
            JSON.stringify({
              reqId: data.reqId,
              type: "requestJoinAck",
              success: true,
            })
          );
          break;
        }

        case "acceptJoin": {
          const { roomId, peerId } = data as {
            roomId?: string;
            peerId?: string;
          };
          if (!roomId || !peerId) {
            ws.send(
              JSON.stringify({
                reqId: data.reqId,
                error: "roomId and peerId are required",
              })
            );
            return;
          }
          const key = `${roomId}:${peerId}`;
          const requesterWs = pendingJoinRequests.get(key);
          if (requesterWs && requesterWs.readyState === WebSocket.OPEN) {
            requesterWs.send(
              JSON.stringify({
                type: "joinApproved",
                roomId,
              })
            );
            pendingJoinRequests.delete(key);
          }
          break;
        }

        case "rejectJoin": {
          const { roomId, peerId } = data as {
            roomId?: string;
            peerId?: string;
          };
          if (!roomId || !peerId) {
            ws.send(
              JSON.stringify({
                reqId: data.reqId,
                error: "roomId and peerId are required",
              })
            );
            return;
          }
          const key = `${roomId}:${peerId}`;
          const requesterWs = pendingJoinRequests.get(key);
          if (requesterWs && requesterWs.readyState === WebSocket.OPEN) {
            requesterWs.send(
              JSON.stringify({
                type: "joinRejected",
                roomId,
              })
            );
            pendingJoinRequests.delete(key);
          }
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

          const detectedSource: ProducerSource =
            data.source || (data.kind === "audio" ? "mic" : "webcam");

          console.log(
            `[produce] Creating producer with kind: ${data.kind}, provided source: ${data.source}, detected source: ${detectedSource}, peer: ${peer.id}`
          );

          const producer = (await peer.sendTransport.produce({
            kind: data.kind,
            rtpParameters: data.rtpParameters,
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
            userImage: peer.userImage,
            muted: myProducer.muted || false,
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

          for (const p of Object.values(room.peers)) {
            const producer = p.producers.get(data.producerId);
            if (producer) {
              targetPeer = p;
              myProducer = producer;
              console.log(
                `[consume] Found producer ${data.producerId} from peer: ${p.id}`
              );
              break;
            }
          }

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
              `[consume] Creating consumer for producer: ${myProducer.producer.id}, kind: ${myProducer.producer.kind}`
            );

            const consumer = await peer.recvTransport.consume({
              producerId: myProducer.producer.id,
              rtpCapabilities: data.rtpCapabilities,
              paused: false, // Always create unpaused, let client handle muted state
            });

            const myConsumer: MyConsumer = {
              id: consumer.id,
              peerId: targetPeer.id,
              producerId: myProducer.id,
              consumer,
            };

            peer.consumers.set(myProducer.id, myConsumer);

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
              `[mediasoup] Consumer created successfully: ${consumer.id} for producer: ${myProducer.id}, peer: ${peer.id} -> ${targetPeer.id}`
            );

            const consumeResponse = {
              reqId: data.reqId,
              type: "consumeResponse",
              id: consumer.id,
              producerId: myProducer.id,
              kind: consumer.kind,
              rtpParameters: consumer.rtpParameters,
              peerId: targetPeer.id,
              displayName: targetPeer.displayName,
              userImage: targetPeer.userImage,
              source: myProducer.source,
              muted: myProducer.muted || false,
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

        case "setProducerMuted": {
          console.log(`[setProducerMuted] Received request:`, data);

          const peer = getPeerFromSocket(ws);
          if (!peer) {
            console.log(`[setProducerMuted] Peer not found for socket`);
            ws.send(
              JSON.stringify({
                reqId: data.reqId,
                error: "Peer not found",
              })
            );
            return;
          }

          console.log(`[setProducerMuted] Found peer: ${peer.id}`);

          const { producerId, muted } = data;
          console.log(
            `[setProducerMuted] Looking for producer: ${producerId}, setting muted to: ${muted}`
          );
          console.log(
            `[setProducerMuted] Available producers:`,
            Array.from(peer.producers.keys())
          );

          const myProducer = peer.producers.get(producerId);

          if (!myProducer) {
            console.log(
              `[setProducerMuted] Producer ${producerId} not found for peer ${peer.id}`
            );
            ws.send(
              JSON.stringify({
                reqId: data.reqId,
                error: "Producer not found",
              })
            );
            return;
          }

          console.log(
            `[setProducerMuted] Found producer, current muted state: ${myProducer.muted}, setting to: ${muted}`
          );
          myProducer.muted = muted;

          const roomId = peerRoomMap.get(peer.id);
          const room = getRoom(roomId!);

          if (room) {
            console.log(
              `[setProducerMuted] Notifying other peers in room: ${roomId}`
            );
            let notifiedCount = 0;

            // Notify other peers
            Object.values(room.peers).forEach((otherPeer) => {
              if (
                otherPeer.id !== peer.id &&
                otherPeer.ws.readyState === WebSocket.OPEN
              ) {
                console.log(
                  `[setProducerMuted] Notifying peer: ${otherPeer.id}`
                );
                otherPeer.ws.send(
                  JSON.stringify({
                    type: "producerMuted",
                    peerId: peer.id,
                    producerId,
                    muted,
                    displayName: peer.displayName,
                    userImage: peer.userImage,
                  })
                );
                notifiedCount++;
              }
            });

            console.log(`[setProducerMuted] Notified ${notifiedCount} peers`);
          } else {
            console.log(
              `[setProducerMuted] Room not found for peer: ${peer.id}`
            );
          }

          console.log(`[setProducerMuted] Sending success response`);
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

        case "closeProducer": {
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

          // Close the producer
          myProducer.producer.close();
          peer.producers.delete(data.producerId);

          // Get room to notify other peers
          const roomId = peerRoomMap.get(peer.id);
          const room = getRoom(roomId!);
          if (room) {
            // Notify other peers about producer closure
            Object.values(room.peers).forEach((otherPeer) => {
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

          const chatMessage = {
            type: "chat",
            message: data.message,
            peerId: peer.id,
            displayName: peer.displayName,
          };

          console.log(
            `[mediasoup] Broadcasting chat message from peer: ${peer.id}`
          );

          Object.values(room.peers).forEach((otherPeer) => {
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
