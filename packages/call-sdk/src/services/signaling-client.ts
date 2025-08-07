import { EventEmitter } from "events";
import type {
  ServerMessage,
  JoinRoomResponse,
  CreateTransportResponse,
  ProduceResponse,
  ConsumeResponse,
  NewProducerNotification,
  ProducerClosedNotification,
  AudioLevelNotification,
  PeerJoinedNotification,
  PeerLeftNotification,
} from "../types/call";

export interface SignalingClientEvents {
  connected: () => void;
  disconnected: () => void;
  error: (error: Error) => void;
  newProducer: (data: NewProducerNotification) => void;
  producerClosed: (data: ProducerClosedNotification) => void;
  audioLevel: (data: AudioLevelNotification) => void;
  peerJoined: (data: PeerJoinedNotification) => void;
  peerLeft: (data: PeerLeftNotification) => void;
  producerMuted: (data: {
    peerId: string;
    producerId: string;
    muted: boolean;
  }) => void;
}

export declare interface SignalingClient {
  on<U extends keyof SignalingClientEvents>(
    event: U,
    listener: SignalingClientEvents[U]
  ): this;
  emit<U extends keyof SignalingClientEvents>(
    event: U,
    ...args: Parameters<SignalingClientEvents[U]>
  ): boolean;
}

/**
 * WebSocket signaling client that matches the MediaSoup server protocol
 */
export class SignalingClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private url: string;
  private pendingRequests = new Map<
    string,
    {
      resolve: (value: any) => void;
      reject: (error: Error) => void;
      timeout: NodeJS.Timeout;
    }
  >();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isConnected = false;

  constructor(url: string) {
    super();
    this.url = url;
  }

  /**
   * Connect to the WebSocket server
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.emit("connected");
          resolve();
        };

        this.ws.onclose = () => {
          this.isConnected = false;
          this.emit("disconnected");
          this.handleReconnect();
        };

        this.ws.onerror = (event) => {
          const error = new Error("WebSocket connection error");
          this.emit("error", error);
          reject(error);
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event);
        };
      } catch (error) {
        reject(error as Error);
      }
    });
  }

  /**
   * Disconnect from the WebSocket server
   */
  disconnect(): void {
    this.isConnected = false;
    this.reconnectAttempts = this.maxReconnectAttempts; // Prevent reconnection

    // Reject all pending requests
    this.pendingRequests.forEach(({ reject, timeout }) => {
      clearTimeout(timeout);
      reject(new Error("Connection closed"));
    });
    this.pendingRequests.clear();

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * Send a request and wait for response
   */
  async sendRequest<T = any>(type: string, data: any = {}): Promise<T> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error("WebSocket not connected");
    }

    const reqId = this.generateRequestId();
    const message = { type, reqId, ...data };

    return new Promise<T>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(reqId);
        reject(new Error(`Request timeout for ${type}`));
      }, 10000);

      this.pendingRequests.set(reqId, { resolve, reject, timeout });
      this.ws!.send(JSON.stringify(message));
    });
  }

  /**
   * Join a room
   */
  async joinRoom(
    roomId: string,
    peerId: string,
    displayName: string
  ): Promise<JoinRoomResponse> {
    return this.sendRequest<JoinRoomResponse>("joinRoom", {
      roomId,
      peerId,
      displayName,
    });
  }

  /**
   * Create WebRTC transport
   */
  async createWebRtcTransport(
    direction: "send" | "recv"
  ): Promise<CreateTransportResponse> {
    return this.sendRequest<CreateTransportResponse>("createWebRtcTransport", {
      direction,
    });
  }

  /**
   * Connect WebRTC transport
   */
  async connectWebRtcTransport(
    direction: "send" | "recv",
    dtlsParameters: any
  ): Promise<void> {
    return this.sendRequest("connectWebRtcTransport", {
      direction,
      dtlsParameters,
    });
  }

  /**
   * Produce media
   */
  async produce(
    kind: "audio" | "video",
    rtpParameters: any,
    source?: string
  ): Promise<ProduceResponse> {
    return this.sendRequest<ProduceResponse>("produce", {
      kind,
      rtpParameters,
      source,
    });
  }

  /**
   * Consume media
   */
  async consume(
    producerId: string,
    rtpCapabilities: any
  ): Promise<ConsumeResponse> {
    return this.sendRequest<ConsumeResponse>("consume", {
      producerId,
      rtpCapabilities,
    });
  }

  /**
   * Set producer muted state
   */
  async setProducerMuted(producerId: string, muted: boolean): Promise<void> {
    return this.sendRequest("setProducerMuted", {
      producerId,
      muted,
    });
  }

  /**
   * Close producer
   */
  async closeProducer(producerId: string): Promise<void> {
    return this.sendRequest("closeProducer", {
      producerId,
    });
  }

  /**
   * Send chat message
   */
  async sendChatMessage(message: string): Promise<void> {
    return this.sendRequest("chat", {
      message,
    });
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const message: ServerMessage = JSON.parse(event.data);

      // Handle responses to requests
      if (message.reqId && this.pendingRequests.has(message.reqId)) {
        const { resolve, reject, timeout } = this.pendingRequests.get(
          message.reqId
        )!;
        this.pendingRequests.delete(message.reqId);
        clearTimeout(timeout);

        if (message.error) {
          reject(new Error(message.error));
        } else {
          resolve(message);
        }
        return;
      }

      // Handle notifications
      switch (message.type) {
        case "newProducer":
          this.emit("newProducer", message as NewProducerNotification);
          break;
        case "producerClosed":
          this.emit("producerClosed", message as ProducerClosedNotification);
          break;
        case "audioLevel":
          this.emit("audioLevel", message as AudioLevelNotification);
          break;
        case "peerJoined":
          this.emit("peerJoined", message as PeerJoinedNotification);
          break;
        case "peerLeft":
          this.emit("peerLeft", message as PeerLeftNotification);
          break;
        case "producerMuted":
          this.emit("producerMuted", {
            peerId: message.peerId,
            producerId: message.producerId,
            muted: message.muted,
          });
          break;
        case "chat":
          // Handle chat messages if needed
          break;
        default:
          console.warn("Unknown message type:", message.type);
      }
    } catch (error) {
      console.error("Error parsing WebSocket message:", error);
    }
  }

  private handleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    setTimeout(() => {
      if (!this.isConnected) {
        this.connect().catch((error) => {
          console.error("Reconnection failed:", error);
        });
      }
    }, delay);
  }

  private generateRequestId(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  get connected(): boolean {
    return this.isConnected;
  }
}
