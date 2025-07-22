import * as mediasoup from "mediasoup";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";

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

let worker: mediasoup.types.Worker;
let router: mediasoup.types.Router;

async function startMediasoup() {
  worker = await mediasoup.createWorker(mediasoupConfig.worker);
  router = await worker.createRouter({
    mediaCodecs: mediasoupConfig.router.mediaCodecs,
  });
  console.log("[mediasoup] Worker and router initialized");
}

startMediasoup().catch(console.error);

const httpServer = createServer();
const wss = new WebSocketServer({ server: httpServer });

// Map to store transports and producers by connection

const transports = new Map<string, mediasoup.types.WebRtcTransport>();

// Also save userId along with the producer

const producers = new Map<string, { producer: mediasoup.types.Producer; userId: string }>();
const clients = new Set<WebSocket>();
const clientProducers = new Map<WebSocket, Set<string>>();

wss.on("connection", (ws: WebSocket) => {
  console.log("[mediasoup] New WebSocket connection");
  clients.add(ws);
  clientProducers.set(ws, new Set());

  ws.on("close", () => {
    console.log("[mediasoup] Client disconnected, cleaning up resources...");
    clients.delete(ws);
    
    // Clean up producers associated with this client
    const producerIds = clientProducers.get(ws);
    if (producerIds) {
      producerIds.forEach(producerId => {
        const producerData = producers.get(producerId);
        if (producerData) {
          console.log("[mediasoup] Closing producer:", producerId);
          producerData.producer.close();
          producers.delete(producerId);
          
          // Notify other clients
          for (const client of clients) {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({
                type: "producerClosed",
                producerId
              }));
            }
          }
        }
      });
    }
    clientProducers.delete(ws);

    // Clean up transports associated
    transports.forEach((transport, transportId) => {
      if (transport.appData.clientId === ws) {
        console.log("[mediasoup] Closing transport:", transportId);
        transport.close();
        transports.delete(transportId);
      }
    });
  });

  ws.on("message", async (message: string) => {
    let data;
    try {
      data = JSON.parse(message.toString());
    } catch (e) {
      ws.send(JSON.stringify({ error: "Invalid JSON" }));
      return;
    }
    // Mediasoup signaling logic
    if (data.type === "createRoom") {
      ws.send(
        JSON.stringify({
          reqId: data.reqId,
          type: "createRoomResponse",
          success: true,
        })
      );
      return;
    }
    if (data.type === "joinRoom") {
      ws.send(
        JSON.stringify({
          reqId: data.reqId,
          type: "joinRoomResponse",
          rtpCapabilities: router.rtpCapabilities,
          producers: Array.from(producers.values()).map(
            ({ producer, userId }) => ({
              id: producer.id,
              kind: producer.kind,
              userId,
            })
          ),
        })
      );
      return;
    }
    if (data.type === "createWebRtcTransport") {
      try {
        const transport = await router.createWebRtcTransport({
          listenIps: mediasoupConfig.webRtcTransport.listenIps,
          enableUdp: mediasoupConfig.webRtcTransport.enableUdp,
          enableTcp: mediasoupConfig.webRtcTransport.enableTcp,
          preferUdp: mediasoupConfig.webRtcTransport.preferUdp,
          initialAvailableOutgoingBitrate:
            mediasoupConfig.webRtcTransport.initialAvailableOutgoingBitrate,
          appData: { clientId: ws }
        });
        transports.set(transport.id, transport);
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
      } catch (err: any) {
        ws.send(
          JSON.stringify({
            reqId: data.reqId,
            type: "createWebRtcTransportResponse",
            error: err.message,
          })
        );
      }
      return;
    }
    if (data.type === "connectWebRtcTransport") {
      const transport = transports.get(data.transportId);
      if (!transport) {
        ws.send(
          JSON.stringify({ reqId: data.reqId, error: "Transport not found" })
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
      return;
    }
    if (data.type === "produce") {
      const transport = transports.get(data.transportId);
      if (!transport) {
        console.log("[produce] Transport not found:", data.transportId);
        ws.send(
          JSON.stringify({ reqId: data.reqId, error: "Transport not found" })
        );
        return;
      }
      try {
        const userId = data.userId || "unknown";
        const producer = await transport.produce({
          kind: data.kind,
          rtpParameters: data.rtpParameters,
        });

        producers.set(producer.id, { producer, userId });
        clientProducers.get(ws)?.add(producer.id);

        // Handle producer closure
        producer.on("transportclose", () => {
          console.log("[mediasoup] Producer transport closed:", producer.id);
          producers.delete(producer.id);
          clientProducers.get(ws)?.delete(producer.id);
          // Notify all clients
          for (const client of clients) {
            if (client.readyState === WebSocket.OPEN) {
              client.send(
                JSON.stringify({
                  type: "producerClosed",
                  producerId: producer.id,
                })
              );
            }
          }
        });

        console.log(
          "[produce] Producer created:",
          producer.id,
          "kind:",
          producer.kind,
          "userId:",
          userId
        );
        ws.send(
          JSON.stringify({
            reqId: data.reqId,
            type: "produceResponse",
            id: producer.id,
          })
        );
        // Notify all other clients of the new producer
        for (const client of clients) {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(
              JSON.stringify({
                type: "newProducer",
                id: producer.id,
                kind: producer.kind,
                userId,
              })
            );
          }
        }
      } catch (err: any) {
        console.log("[produce] Error:", err.message);
        ws.send(JSON.stringify({ reqId: data.reqId, error: err.message }));
      }
      return;
    }
    if (data.type === "consume") {
      const transport = transports.get(data.transportId);
      const producerObj = producers.get(data.producerId);
      if (!transport || !producerObj) {
        console.log(
          "[consume] Transport or producer not found:",
          data.transportId,
          data.producerId
        );
        ws.send(
          JSON.stringify({
            reqId: data.reqId,
            error: "Transport or producer not found",
          })
        );
        return;
      }
      const producer = producerObj.producer;
      try {
        const consumer = await transport.consume({
          producerId: producer.id,
          rtpCapabilities: data.rtpCapabilities,
          paused: false,
        });
        console.log(
          "[consume] Consumer created:",
          consumer.id,
          "for producer:",
          producer.id
        );
        ws.send(
          JSON.stringify({
            reqId: data.reqId,
            type: "consumeResponse",
            id: consumer.id,
            producerId: producer.id,
            kind: consumer.kind,
            rtpParameters: consumer.rtpParameters,
            userId: producerObj.userId,
          })
        );
      } catch (err: any) {
        console.log("[consume] Error:", err.message);
        ws.send(JSON.stringify({ reqId: data.reqId, error: err.message }));
      }
      return;
    }
    // Default response
    ws.send(
      JSON.stringify({
        reqId: data.reqId,
        type: "pong",
        data: "Mediasoup signaling server ready",
      })
    );
  });
});

const PORT = 4001;
httpServer.listen(PORT, () => {
  console.log(`[mediasoup] Signaling server running on ws://localhost:${PORT}`);
});
