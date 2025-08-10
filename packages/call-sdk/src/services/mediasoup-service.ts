import { Device } from "mediasoup-client";
import { EventEmitter } from "events";
import type { CallConfig, ProducerSource } from "../types/call";
import { CallConnectionStatus } from "../types/call";
import { SignalingClient } from "./signaling-client";
import { MediaManager } from "./media-manager";

export interface MediasoupServiceEvents {
  connectionStatusChanged: (status: CallConnectionStatus) => void;
  newConsumer: (
    consumer: any,
    peerId: string,
    displayName: string,
    source: ProducerSource
  ) => void;
  consumerClosed: (consumerId: string) => void;
  producerCreated: (producer: any, source: ProducerSource) => void;
  producerClosed: (producerId: string, source: ProducerSource) => void;
  error: (error: Error) => void;
}

export declare interface MediasoupService {
  on<U extends keyof MediasoupServiceEvents>(
    event: U,
    listener: MediasoupServiceEvents[U]
  ): this;
  emit<U extends keyof MediasoupServiceEvents>(
    event: U,
    ...args: Parameters<MediasoupServiceEvents[U]>
  ): boolean;
}

/**
 * MediaSoup service that integrates with SignalingClient and MediaManager
 */
export class MediasoupService extends EventEmitter {
  private device: Device;
  private signalingClient: SignalingClient;
  private mediaManager: MediaManager;
  private sendTransport: any = null;
  private recvTransport: any = null;
  private producers = new Map<ProducerSource, any>();
  private consumers = new Map<string, any>();
  private connectionStatus: CallConnectionStatus = CallConnectionStatus.IDLE;
  private config: CallConfig | null = null;

  constructor(signalingUrl: string) {
    super();
    this.device = new Device();
    this.signalingClient = new SignalingClient(signalingUrl);
    this.mediaManager = new MediaManager();
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Signaling client events
    this.signalingClient.on("connected", () => {
      this.setConnectionStatus(CallConnectionStatus.CONNECTED);
    });

    this.signalingClient.on("disconnected", () => {
      this.setConnectionStatus(CallConnectionStatus.DISCONNECTED);
    });

    this.signalingClient.on("error", (error) => {
      this.emit("error", error);
    });

    this.signalingClient.on("newProducer", async (data) => {
      try {
        await this.handleNewProducer(data);
      } catch (error) {
        this.emit("error", error as Error);
      }
    });

    this.signalingClient.on("producerClosed", (data) => {
      this.handleProducerClosed(data);
    });

    // Media manager events
    this.mediaManager.on("error", (error) => {
      this.emit("error", error);
    });
  }

  /**
   * Connect to the MediaSoup server
   */
  async connect(config: CallConfig): Promise<void> {
    try {
      this.config = config;
      this.setConnectionStatus(CallConnectionStatus.CONNECTING);

      // Connect to signaling server
      await this.signalingClient.connect();

      // Join the room
      const joinResponse = await this.signalingClient.joinRoom(
        config.roomId,
        config.userId || crypto.randomUUID(),
        config.displayName
      );

      // Load MediaSoup device with RTP capabilities
      await this.device.load({
        routerRtpCapabilities: joinResponse.rtpCapabilities,
      });

      // Create WebRTC transports
      await this.createSendTransport();
      await this.createRecvTransport();

      // Consume existing producers
      for (const producer of joinResponse.producers) {
        try {
          await this.consumeProducer(producer.id);
        } catch (error) {
          console.warn(
            "Failed to consume existing producer:",
            producer.id,
            error
          );
        }
      }

      this.setConnectionStatus(CallConnectionStatus.CONNECTED);
    } catch (error) {
      this.setConnectionStatus(CallConnectionStatus.FAILED);
      throw error;
    }
  }

  /**
   * Disconnect from the MediaSoup server
   */
  async disconnect(): Promise<void> {
    // Close all producers
    this.producers.forEach((producer) => {
      producer.close();
    });
    this.producers.clear();

    // Close all consumers
    this.consumers.forEach((consumer) => {
      consumer.close();
    });
    this.consumers.clear();

    // Close transports
    if (this.sendTransport) {
      this.sendTransport.close();
      this.sendTransport = null;
    }
    if (this.recvTransport) {
      this.recvTransport.close();
      this.recvTransport = null;
    }

    // Stop all media streams
    this.mediaManager.stopAllStreams();

    // Disconnect signaling
    this.signalingClient.disconnect();

    this.setConnectionStatus(CallConnectionStatus.DISCONNECTED);
  }

  /**
   * Produce media from a stream
   */
  async produceMedia(
    stream: MediaStream,
    source: ProducerSource = "webcam"
  ): Promise<any[]> {
    if (!this.sendTransport) {
      throw new Error("Send transport not available");
    }

    const producers: any[] = [];

    for (const track of stream.getTracks()) {
      try {
        const producer = await this.sendTransport.produce({
          track,
          encodings: this.getEncodings(track.kind as "audio" | "video"),
          codecOptions: this.getCodecOptions(track.kind as "audio" | "video"),
        });

        // Store producer
        this.producers.set(source, producer);

        // Handle producer events
        producer.on("transportclose", () => {
          this.producers.delete(source);
          this.emit("producerClosed", producer.id, source);
        });

        producer.on("trackended", () => {
          this.closeProducer(source);
        });

        producers.push(producer);
        this.emit("producerCreated", producer, source);

        console.log(
          `Producer created: ${producer.id}, kind: ${track.kind}, source: ${source}`
        );
      } catch (error) {
        console.error(`Failed to produce ${track.kind} track:`, error);
        throw error;
      }
    }

    return producers;
  }

  /**
   * Close a producer
   */
  async closeProducer(source: ProducerSource): Promise<void> {
    const producer = this.producers.get(source);
    if (producer) {
      try {
        await this.signalingClient.closeProducer(producer.id);
        producer.close();
        this.producers.delete(source);
        this.emit("producerClosed", producer.id, source);
      } catch (error) {
        console.error("Failed to close producer:", error);
        throw error;
      }
    }
  }

  /**
   * Set producer muted state
   */
  async setProducerMuted(
    source: ProducerSource,
    muted: boolean
  ): Promise<void> {
    const producer = this.producers.get(source);
    if (producer) {
      try {
        await this.signalingClient.setProducerMuted(producer.id, muted);
        if (muted) {
          producer.pause();
        } else {
          producer.resume();
        }
      } catch (error) {
        console.error("Failed to set producer muted state:", error);
        throw error;
      }
    }
  }

  /**
   * Get MediaManager instance
   */
  getMediaManager(): MediaManager {
    return this.mediaManager;
  }

  /**
   * Get SignalingClient instance
   */
  getSignalingClient(): SignalingClient {
    return this.signalingClient;
  }

  /**
   * Get current connection status
   */
  getConnectionStatus(): CallConnectionStatus {
    return this.connectionStatus;
  }

  /**
   * Get MediaSoup device
   */
  getDevice(): Device {
    return this.device;
  }

  /**
   * Get RTP capabilities
   */
  getRtpCapabilities(): any {
    return this.device.rtpCapabilities;
  }

  private async createSendTransport(): Promise<void> {
    const transportData =
      await this.signalingClient.createWebRtcTransport("send");

    this.sendTransport = this.device.createSendTransport({
      id: transportData.id,
      iceParameters: transportData.iceParameters,
      iceCandidates: transportData.iceCandidates,
      dtlsParameters: transportData.dtlsParameters,
    });

    this.sendTransport.on(
      "connect",
      async ({ dtlsParameters }: any, callback: any, errback: any) => {
        try {
          await this.signalingClient.connectWebRtcTransport(
            "send",
            dtlsParameters
          );
          callback();
        } catch (error) {
          errback(error as Error);
        }
      }
    );

    this.sendTransport.on(
      "produce",
      async ({ kind, rtpParameters }: any, callback: any, errback: any) => {
        try {
          const response = await this.signalingClient.produce(
            kind as "audio" | "video",
            rtpParameters
          );
          callback({ id: response.id });
        } catch (error) {
          errback(error as Error);
        }
      }
    );
  }

  private async createRecvTransport(): Promise<void> {
    const transportData =
      await this.signalingClient.createWebRtcTransport("recv");

    this.recvTransport = this.device.createRecvTransport({
      id: transportData.id,
      iceParameters: transportData.iceParameters,
      iceCandidates: transportData.iceCandidates,
      dtlsParameters: transportData.dtlsParameters,
    });

    this.recvTransport.on(
      "connect",
      async ({ dtlsParameters }: any, callback: any, errback: any) => {
        try {
          await this.signalingClient.connectWebRtcTransport(
            "recv",
            dtlsParameters
          );
          callback();
        } catch (error) {
          errback(error as Error);
        }
      }
    );
  }

  private async handleNewProducer(data: any): Promise<void> {
    if (!this.recvTransport) {
      throw new Error("Receive transport not available");
    }

    try {
      await this.consumeProducer(data.id);
    } catch (error) {
      console.error("Failed to consume new producer:", error);
      throw error;
    }
  }

  private async consumeProducer(producerId: string): Promise<void> {
    if (!this.recvTransport) {
      throw new Error("Receive transport not available");
    }

    try {
      const consumeResponse = await this.signalingClient.consume(
        producerId,
        this.device.rtpCapabilities
      );

      const consumer = await this.recvTransport.consume({
        id: consumeResponse.id,
        producerId: consumeResponse.producerId,
        kind: consumeResponse.kind as "audio" | "video",
        rtpParameters: consumeResponse.rtpParameters,
      });

      this.consumers.set(consumer.id, consumer);

      // Handle consumer events
      consumer.on("transportclose", () => {
        this.consumers.delete(consumer.id);
        this.emit("consumerClosed", consumer.id);
      });

      consumer.on("producerclose", () => {
        this.consumers.delete(consumer.id);
        this.emit("consumerClosed", consumer.id);
      });

      this.emit(
        "newConsumer",
        consumer,
        consumeResponse.peerId,
        consumeResponse.displayName,
        consumeResponse.source
      );

      console.log(
        `Consumer created: ${consumer.id} for producer: ${producerId}`
      );
    } catch (error) {
      console.error("Failed to consume producer:", error);
      throw error;
    }
  }

  private handleProducerClosed(data: any): void {
    const consumer = Array.from(this.consumers.values()).find(
      (c) => (c as any).producerId === data.producerId
    );

    if (consumer) {
      consumer.close();
      this.consumers.delete(consumer.id);
      this.emit("consumerClosed", consumer.id);
    }
  }

  private getEncodings(kind: "audio" | "video"): any[] {
    if (kind === "video") {
      return [
        { maxBitrate: 100000 },
        { maxBitrate: 300000 },
        { maxBitrate: 900000 },
      ];
    }
    return [];
  }

  private getCodecOptions(kind: "audio" | "video"): any {
    if (kind === "audio") {
      return {
        opusStereo: true,
        opusDtx: true,
      };
    }
    if (kind === "video") {
      return {
        videoGoogleStartBitrate: 1000,
      };
    }
    return {};
  }

  private setConnectionStatus(status: CallConnectionStatus): void {
    this.connectionStatus = status;
    this.emit("connectionStatusChanged", status);
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.disconnect();
    this.mediaManager.destroy();
    this.removeAllListeners();
  }
}
