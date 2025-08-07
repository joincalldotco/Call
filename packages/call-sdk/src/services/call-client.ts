import { EventEmitter } from "events";
import type {
  CallConfig,
  CallState,
  CallStats,
  MediaSettings,
} from "../types/call";
import { CallConnectionStatus } from "../types/call";
import type { Self, Participant, MediaPermissions } from "../types/participant";
import { MediasoupService } from "./mediasoup-service";
import { MediaManager } from "./media-manager";
import { SignalingClient } from "./signaling-client";

export interface CallClientEvents {
  connectionStatusChanged: (status: CallConnectionStatus) => void;
  participantJoined: (participant: Participant) => void;
  participantLeft: (participantId: string) => void;
  participantUpdated: (participant: Participant) => void;
  dominantSpeakerChanged: (participantId?: string) => void;
  localStreamChanged: (stream: MediaStream | null) => void;
  remoteStreamAdded: (stream: MediaStream, participantId: string) => void;
  remoteStreamRemoved: (streamId: string, participantId: string) => void;
  error: (error: Error) => void;
  statsUpdated: (stats: CallStats) => void;
}

export declare interface CallClient {
  on<U extends keyof CallClientEvents>(
    event: U,
    listener: CallClientEvents[U]
  ): this;
  emit<U extends keyof CallClientEvents>(
    event: U,
    ...args: Parameters<CallClientEvents[U]>
  ): boolean;
}

/**
 * Main CallClient class that orchestrates all call functionality
 */
export class CallClient extends EventEmitter {
  private mediasoupService: MediasoupService;
  private mediaManager: MediaManager;
  private signalingClient: SignalingClient;

  private state: CallState;
  private config: CallConfig | null = null;
  private localStream: MediaStream | null = null;
  private participants = new Map<string, Participant>();
  private dominantSpeakerId?: string;
  private statsInterval?: NodeJS.Timeout;

  constructor(signalingUrl: string) {
    super();

    this.mediasoupService = new MediasoupService(signalingUrl);
    this.mediaManager = this.mediasoupService.getMediaManager();
    this.signalingClient = this.mediasoupService.getSignalingClient();

    this.state = {
      connectionStatus: CallConnectionStatus.IDLE,
      self: null,
      participants: new Map(),
      permissions: {
        audio: false,
        video: false,
        screen: false,
      },
    };

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // MediaSoup service events
    this.mediasoupService.on("connectionStatusChanged", (status) => {
      this.state.connectionStatus = status;
      this.emit("connectionStatusChanged", status);
    });

    this.mediasoupService.on(
      "newConsumer",
      (consumer, peerId, displayName, source) => {
        this.handleNewConsumer(consumer, peerId, displayName, source);
      }
    );

    this.mediasoupService.on("consumerClosed", (consumerId) => {
      this.handleConsumerClosed(consumerId);
    });

    this.mediasoupService.on("error", (error) => {
      this.state.error = error;
      this.emit("error", error);
    });

    // Signaling client events
    this.signalingClient.on("peerJoined", (data) => {
      this.handlePeerJoined(data);
    });

    this.signalingClient.on("peerLeft", (data) => {
      this.handlePeerLeft(data);
    });

    this.signalingClient.on("audioLevel", (data) => {
      this.handleAudioLevel(data);
    });

    // Media manager events
    this.mediaManager.on("devicesChanged", () => {
      // Emit device change event if needed
    });

    this.mediaManager.on("streamCreated", (stream, source) => {
      if (source === "webcam") {
        this.localStream = stream;
        this.emit("localStreamChanged", stream);
      }
    });

    this.mediaManager.on("streamEnded", (source) => {
      if (source === "webcam") {
        this.localStream = null;
        this.emit("localStreamChanged", null);
      }
    });
  }

  /**
   * Join a call with the specified configuration
   */
  async joinCall(config: CallConfig): Promise<void> {
    try {
      this.config = config;

      // Check media permissions
      await this.checkMediaPermissions();

      // Connect to MediaSoup server
      await this.mediasoupService.connect(config);

      // Create local media stream if enabled
      if (config.initialAudioEnabled || config.initialVideoEnabled) {
        await this.enableLocalMedia({
          audio: config.initialAudioEnabled,
          video: config.initialVideoEnabled,
        });
      }

      // Create self participant
      this.state.self = {
        id: config.userId || crypto.randomUUID(),
        displayName: config.displayName,
        isLocal: true,
        audioEnabled: config.initialAudioEnabled || false,
        videoEnabled: config.initialVideoEnabled || false,
        screenShareEnabled: false,
        joinedAt: new Date(),
        lastActiveAt: new Date(),
        isSpeaking: false,
      };

      // Start stats collection
      this.startStatsCollection();
    } catch (error) {
      this.state.error = error as Error;
      throw error;
    }
  }

  /**
   * Leave the current call
   */
  async leaveCall(): Promise<void> {
    try {
      // Stop stats collection
      this.stopStatsCollection();

      // Stop all local media
      this.mediaManager.stopAllStreams();

      // Disconnect from MediaSoup server
      await this.mediasoupService.disconnect();

      // Reset state
      this.state = {
        connectionStatus: CallConnectionStatus.DISCONNECTED,
        self: null,
        participants: new Map(),
        permissions: {
          audio: false,
          video: false,
          screen: false,
        },
      };

      this.participants.clear();
      this.localStream = null;
      this.dominantSpeakerId = undefined;
    } catch (error) {
      this.emit("error", error as Error);
      throw error;
    }
  }

  /**
   * Enable local media (camera and/or microphone)
   */
  async enableLocalMedia(
    options: { audio?: boolean; video?: boolean } = {}
  ): Promise<void> {
    try {
      const stream = await this.mediaManager.createUserMediaStream(options);

      // Produce the media stream
      await this.mediasoupService.produceMedia(stream, "webcam");

      // Update self state
      if (this.state.self) {
        this.state.self.audioEnabled = options.audio || false;
        this.state.self.videoEnabled = options.video || false;
        this.state.self.audioTrack = stream.getAudioTracks()[0];
        this.state.self.videoTrack = stream.getVideoTracks()[0];
      }
    } catch (error) {
      this.emit("error", error as Error);
      throw error;
    }
  }

  /**
   * Disable local media
   */
  async disableLocalMedia(
    options: { audio?: boolean; video?: boolean } = {}
  ): Promise<void> {
    try {
      if (options.audio) {
        await this.mediasoupService.closeProducer("mic");
        if (this.state.self) {
          this.state.self.audioEnabled = false;
          this.state.self.audioTrack = undefined;
        }
      }

      if (options.video) {
        await this.mediasoupService.closeProducer("webcam");
        if (this.state.self) {
          this.state.self.videoEnabled = false;
          this.state.self.videoTrack = undefined;
        }
      }
    } catch (error) {
      this.emit("error", error as Error);
      throw error;
    }
  }

  /**
   * Toggle microphone mute state
   */
  async toggleMicrophone(): Promise<boolean> {
    if (!this.state.self) return false;

    try {
      const newMutedState = !this.state.self.audioEnabled;
      await this.mediasoupService.setProducerMuted("mic", newMutedState);

      this.state.self.audioEnabled = !newMutedState;
      return this.state.self.audioEnabled;
    } catch (error) {
      this.emit("error", error as Error);
      throw error;
    }
  }

  /**
   * Toggle camera on/off state
   */
  async toggleCamera(): Promise<boolean> {
    if (!this.state.self) return false;

    try {
      if (this.state.self.videoEnabled) {
        await this.disableLocalMedia({ video: true });
      } else {
        await this.enableLocalMedia({ video: true });
      }

      return this.state.self.videoEnabled;
    } catch (error) {
      this.emit("error", error as Error);
      throw error;
    }
  }

  /**
   * Start screen sharing
   */
  async startScreenShare(): Promise<void> {
    try {
      const stream = await this.mediaManager.createDisplayMediaStream();
      await this.mediasoupService.produceMedia(stream, "screen");

      if (this.state.self) {
        this.state.self.screenShareEnabled = true;
        this.state.self.screenShareTrack = stream.getVideoTracks()[0];
      }
    } catch (error) {
      this.emit("error", error as Error);
      throw error;
    }
  }

  /**
   * Stop screen sharing
   */
  async stopScreenShare(): Promise<void> {
    try {
      await this.mediasoupService.closeProducer("screen");
      this.mediaManager.stopStream("screen");

      if (this.state.self) {
        this.state.self.screenShareEnabled = false;
        this.state.self.screenShareTrack = undefined;
      }
    } catch (error) {
      this.emit("error", error as Error);
      throw error;
    }
  }

  /**
   * Change media device
   */
  async changeDevice(type: "audio" | "video", deviceId: string): Promise<void> {
    try {
      if (type === "audio") {
        this.mediaManager.setAudioInputDevice(deviceId);
      } else {
        this.mediaManager.setVideoInputDevice(deviceId);
      }

      // If we have an active stream, replace the track
      if (this.localStream) {
        await this.mediaManager.replaceTrack(this.localStream, type, deviceId);
      }
    } catch (error) {
      this.emit("error", error as Error);
      throw error;
    }
  }

  /**
   * Get current call state
   */
  getState(): CallState {
    return {
      ...this.state,
      participants: new Map(this.participants),
    };
  }

  /**
   * Get available media devices
   */
  getMediaDevices() {
    return {
      audioInputDevices: this.mediaManager.getAudioInputDevices(),
      videoInputDevices: this.mediaManager.getVideoInputDevices(),
      audioOutputDevices: this.mediaManager.getAudioOutputDevices(),
    };
  }

  /**
   * Get current media settings
   */
  getMediaSettings(): MediaSettings {
    const selectedDevices = this.mediaManager.getSelectedDevices();
    return {
      audioInputDeviceId: selectedDevices.audioInput,
      audioOutputDeviceId: selectedDevices.audioOutput,
      videoInputDeviceId: selectedDevices.videoInput,
    };
  }

  /**
   * Get connection statistics
   */
  async getStats(): Promise<CallStats> {
    // This would need to be implemented based on MediaSoup stats API
    return {
      rtt: 0,
      packetLoss: 0,
      bitrate: 0,
      duration: this.state.self
        ? Date.now() - this.state.self.joinedAt.getTime()
        : 0,
    };
  }

  private async checkMediaPermissions(): Promise<void> {
    try {
      // Check camera permission
      try {
        const videoStream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
        videoStream.getTracks().forEach((track) => track.stop());
        this.state.permissions.video = true;
      } catch {
        this.state.permissions.video = false;
      }

      // Check microphone permission
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        audioStream.getTracks().forEach((track) => track.stop());
        this.state.permissions.audio = true;
      } catch {
        this.state.permissions.audio = false;
      }

      // Screen sharing permission is checked when requested
      this.state.permissions.screen = true;
    } catch (error) {
      console.warn("Error checking media permissions:", error);
    }
  }

  private handleNewConsumer(
    consumer: any,
    peerId: string,
    displayName: string,
    source: any
  ): void {
    let participant = this.participants.get(peerId);

    if (!participant) {
      participant = {
        id: peerId,
        displayName,
        isLocal: false,
        audioEnabled: false,
        videoEnabled: false,
        screenShareEnabled: false,
        joinedAt: new Date(),
        lastActiveAt: new Date(),
        isSpeaking: false,
        connectionQuality: 1,
      };
      this.participants.set(peerId, participant);
      this.emit("participantJoined", participant);
    }

    // Update participant based on consumer type
    const stream = new MediaStream([consumer.track]);

    if (consumer.kind === "audio") {
      participant.audioEnabled = true;
      participant.audioTrack = consumer.track;
    } else if (consumer.kind === "video") {
      if (source === "webcam") {
        participant.videoEnabled = true;
        participant.videoTrack = consumer.track;
      } else if (source === "screen") {
        participant.screenShareEnabled = true;
        participant.screenShareTrack = consumer.track;
      }
    }

    this.emit("remoteStreamAdded", stream, peerId);
    this.emit("participantUpdated", participant);
  }

  private handleConsumerClosed(consumerId: string): void {
    // Find and update the participant who lost the consumer
    for (const [peerId, participant] of this.participants) {
      // This would need more sophisticated tracking of consumer IDs
      this.emit("remoteStreamRemoved", consumerId, peerId);
      this.emit("participantUpdated", participant);
    }
  }

  private handlePeerJoined(data: any): void {
    const participant: Participant = {
      id: data.peerId,
      displayName: data.displayName,
      isLocal: false,
      audioEnabled: false,
      videoEnabled: false,
      screenShareEnabled: false,
      joinedAt: new Date(),
      lastActiveAt: new Date(),
      isSpeaking: false,
      connectionQuality: 1,
    };

    this.participants.set(data.peerId, participant);
    this.emit("participantJoined", participant);
  }

  private handlePeerLeft(data: any): void {
    this.participants.delete(data.peerId);
    this.emit("participantLeft", data.peerId);
  }

  private handleAudioLevel(data: any): void {
    const participant = this.participants.get(data.peerId);
    if (participant) {
      participant.isSpeaking = data.volume > -50; // Threshold for speaking
      participant.lastActiveAt = new Date();
      if (participant.isSpeaking) {
        participant.lastSpoke = new Date();
      }
      this.emit("participantUpdated", participant);
    }

    // Update dominant speaker
    if (data.volume > -50 && this.dominantSpeakerId !== data.peerId) {
      this.dominantSpeakerId = data.peerId;
      this.emit("dominantSpeakerChanged", data.peerId);
    }
  }

  private startStatsCollection(): void {
    this.statsInterval = setInterval(async () => {
      try {
        const stats = await this.getStats();
        this.emit("statsUpdated", stats);
      } catch (error) {
        console.warn("Error collecting stats:", error);
      }
    }, 5000); // Collect stats every 5 seconds
  }

  private stopStatsCollection(): void {
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
      this.statsInterval = undefined;
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.stopStatsCollection();
    this.mediasoupService.destroy();
    this.removeAllListeners();
  }
}
