import { EventEmitter } from "events";
import type { ProducerSource } from "../types/call";

// Use the native MediaDeviceInfo interface

export interface MediaManagerEvents {
  devicesChanged: (devices: MediaDeviceInfo[]) => void;
  streamCreated: (stream: MediaStream, source: ProducerSource) => void;
  streamEnded: (source: ProducerSource) => void;
  error: (error: Error) => void;
}

export declare interface MediaManager {
  on<U extends keyof MediaManagerEvents>(
    event: U,
    listener: MediaManagerEvents[U]
  ): this;
  emit<U extends keyof MediaManagerEvents>(
    event: U,
    ...args: Parameters<MediaManagerEvents[U]>
  ): boolean;
}

/**
 * Manages media devices and streams
 */
export class MediaManager extends EventEmitter {
  private audioDevices: MediaDeviceInfo[] = [];
  private videoDevices: MediaDeviceInfo[] = [];
  private audioOutputDevices: MediaDeviceInfo[] = [];
  private currentStreams = new Map<ProducerSource, MediaStream>();
  private selectedDevices = {
    audioInput: "",
    videoInput: "",
    audioOutput: "",
  };

  constructor() {
    super();
    this.initializeDeviceMonitoring();
  }

  /**
   * Initialize device monitoring
   */
  private async initializeDeviceMonitoring(): Promise<void> {
    try {
      // Request initial permissions to get device labels
      await navigator.mediaDevices.getUserMedia({ audio: true, video: true });

      // Get initial device list
      await this.updateDeviceList();

      // Monitor device changes
      navigator.mediaDevices.addEventListener("devicechange", () => {
        this.updateDeviceList();
      });
    } catch (error) {
      console.warn("Failed to initialize device monitoring:", error);
      // Still try to get device list without labels
      await this.updateDeviceList();
    }
  }

  /**
   * Update the list of available devices
   */
  private async updateDeviceList(): Promise<void> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();

      this.audioDevices = devices.filter(
        (device) => device.kind === "audioinput"
      );

      this.videoDevices = devices.filter(
        (device) => device.kind === "videoinput"
      );

      this.audioOutputDevices = devices.filter(
        (device) => device.kind === "audiooutput"
      );

      // Set default devices if none selected
      if (!this.selectedDevices.audioInput && this.audioDevices.length > 0) {
        this.selectedDevices.audioInput = this.audioDevices[0]!.deviceId;
      }
      if (!this.selectedDevices.videoInput && this.videoDevices.length > 0) {
        this.selectedDevices.videoInput = this.videoDevices[0]!.deviceId;
      }
      if (
        !this.selectedDevices.audioOutput &&
        this.audioOutputDevices.length > 0
      ) {
        this.selectedDevices.audioOutput = this.audioOutputDevices[0]!.deviceId;
      }

      this.emit("devicesChanged", [
        ...this.audioDevices,
        ...this.videoDevices,
        ...this.audioOutputDevices,
      ]);
    } catch (error) {
      this.emit("error", error as Error);
    }
  }

  /**
   * Get available audio input devices
   */
  getAudioInputDevices(): MediaDeviceInfo[] {
    return [...this.audioDevices];
  }

  /**
   * Get available video input devices
   */
  getVideoInputDevices(): MediaDeviceInfo[] {
    return [...this.videoDevices];
  }

  /**
   * Get available audio output devices
   */
  getAudioOutputDevices(): MediaDeviceInfo[] {
    return [...this.audioOutputDevices];
  }

  /**
   * Set selected audio input device
   */
  setAudioInputDevice(deviceId: string): void {
    this.selectedDevices.audioInput = deviceId;
  }

  /**
   * Set selected video input device
   */
  setVideoInputDevice(deviceId: string): void {
    this.selectedDevices.videoInput = deviceId;
  }

  /**
   * Set selected audio output device
   */
  setAudioOutputDevice(deviceId: string): void {
    this.selectedDevices.audioOutput = deviceId;
  }

  /**
   * Get selected device IDs
   */
  getSelectedDevices() {
    return { ...this.selectedDevices };
  }

  /**
   * Create user media stream for camera and microphone
   */
  async createUserMediaStream(
    options: {
      audio?: boolean;
      video?: boolean;
      audioDeviceId?: string;
      videoDeviceId?: string;
    } = {}
  ): Promise<MediaStream> {
    const {
      audio = true,
      video = true,
      audioDeviceId = this.selectedDevices.audioInput,
      videoDeviceId = this.selectedDevices.videoInput,
    } = options;

    try {
      const constraints: MediaStreamConstraints = {};

      if (audio) {
        constraints.audio = audioDeviceId
          ? {
              deviceId: { exact: audioDeviceId },
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            }
          : {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            };
      }

      if (video) {
        constraints.video = videoDeviceId
          ? {
              deviceId: { exact: videoDeviceId },
              width: { ideal: 1280 },
              height: { ideal: 720 },
              frameRate: { ideal: 30 },
            }
          : {
              width: { ideal: 1280 },
              height: { ideal: 720 },
              frameRate: { ideal: 30 },
            };
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      // Store the stream
      this.currentStreams.set("webcam", stream);
      this.emit("streamCreated", stream, "webcam");

      // Handle stream ending
      stream.getTracks().forEach((track) => {
        track.addEventListener("ended", () => {
          this.handleStreamEnded("webcam");
        });
      });

      return stream;
    } catch (error) {
      this.emit("error", error as Error);
      throw error;
    }
  }

  /**
   * Create display media stream for screen sharing
   */
  async createDisplayMediaStream(
    options: {
      video?: boolean;
      audio?: boolean;
    } = {}
  ): Promise<MediaStream> {
    const { video = true, audio = false } = options;

    try {
      const constraints: MediaStreamConstraints = {
        video: video
          ? {
              width: { ideal: 1920 },
              height: { ideal: 1080 },
              frameRate: { ideal: 30 },
            }
          : false,
        audio,
      };

      const stream = await navigator.mediaDevices.getDisplayMedia(constraints);

      // Store the stream
      this.currentStreams.set("screen", stream);
      this.emit("streamCreated", stream, "screen");

      // Handle stream ending (user stops sharing)
      stream.getVideoTracks().forEach((track) => {
        track.addEventListener("ended", () => {
          this.handleStreamEnded("screen");
        });
      });

      return stream;
    } catch (error) {
      this.emit("error", error as Error);
      throw error;
    }
  }

  /**
   * Replace a track in an existing stream
   */
  async replaceTrack(
    stream: MediaStream,
    kind: "audio" | "video",
    deviceId?: string
  ): Promise<MediaStreamTrack> {
    try {
      const constraints: MediaStreamConstraints = {};

      if (kind === "audio") {
        constraints.audio = deviceId
          ? {
              deviceId: { exact: deviceId },
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            }
          : {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            };
      } else {
        constraints.video = deviceId
          ? {
              deviceId: { exact: deviceId },
              width: { ideal: 1280 },
              height: { ideal: 720 },
              frameRate: { ideal: 30 },
            }
          : {
              width: { ideal: 1280 },
              height: { ideal: 720 },
              frameRate: { ideal: 30 },
            };
      }

      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      const newTrack = newStream
        .getTracks()
        .find((track) => track.kind === kind);

      if (!newTrack) {
        throw new Error(`No ${kind} track found in new stream`);
      }

      // Replace the old track
      const oldTracks =
        kind === "audio" ? stream.getAudioTracks() : stream.getVideoTracks();

      if (oldTracks.length > 0) {
        const oldTrack = oldTracks[0];
        if (oldTrack) {
          stream.removeTrack(oldTrack);
          oldTrack.stop();
        }
      }

      stream.addTrack(newTrack);
      return newTrack;
    } catch (error) {
      this.emit("error", error as Error);
      throw error;
    }
  }

  /**
   * Stop a stream by source
   */
  stopStream(source: ProducerSource): void {
    const stream = this.currentStreams.get(source);
    if (stream) {
      stream.getTracks().forEach((track) => {
        track.stop();
      });
      this.currentStreams.delete(source);
      this.emit("streamEnded", source);
    }
  }

  /**
   * Stop all streams
   */
  stopAllStreams(): void {
    this.currentStreams.forEach((stream, source) => {
      stream.getTracks().forEach((track) => {
        track.stop();
      });
      this.emit("streamEnded", source);
    });
    this.currentStreams.clear();
  }

  /**
   * Get current stream by source
   */
  getStream(source: ProducerSource): MediaStream | undefined {
    return this.currentStreams.get(source);
  }

  /**
   * Get all current streams
   */
  getAllStreams(): Map<ProducerSource, MediaStream> {
    return new Map(this.currentStreams);
  }

  /**
   * Check if a stream is active
   */
  isStreamActive(source: ProducerSource): boolean {
    const stream = this.currentStreams.get(source);
    return stream ? stream.active : false;
  }

  private handleStreamEnded(source: ProducerSource): void {
    this.currentStreams.delete(source);
    this.emit("streamEnded", source);
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.stopAllStreams();
    this.removeAllListeners();
  }
}
