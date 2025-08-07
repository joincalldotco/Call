/**
 * Types for call management and state
 */

import type { Participant, Self, MediaPermissions } from "./participant";

/**
 * Supported media types in a call
 */
export type MediaType = "audio" | "video" | "screen";

/**
 * Producer source types matching server implementation
 */
export type ProducerSource = "mic" | "webcam" | "screen";

/**
 * Call connection status
 */
export enum CallConnectionStatus {
  IDLE = "idle",
  CONNECTING = "connecting",
  CONNECTED = "connected",
  RECONNECTING = "reconnecting",
  DISCONNECTED = "disconnected",
  FAILED = "failed",
}

/**
 * Configuration options for initializing a call
 */
export interface CallConfig {
  /**
   * Unique identifier for the room
   */
  roomId: string;

  /**
   * Initial display name for the local participant
   */
  displayName: string;

  /**
   * Optional user ID for the local participant
   */
  userId?: string;

  /**
   * Whether to join with audio enabled
   * @default false
   */
  initialAudioEnabled?: boolean;

  /**
   * Whether to join with video enabled
   * @default false
   */
  initialVideoEnabled?: boolean;

  /**
   * Maximum number of participants allowed in the call
   * @default 16
   */
  maxParticipants?: number;

  /**
   * WebRTC configuration options
   */
  rtcConfig?: RTCConfiguration;
}

/**
 * Core call state
 */
export interface CallState {
  /**
   * Current connection status of the call
   */
  connectionStatus: CallConnectionStatus;

  /**
   * Local participant information
   */
  self: Self | null;

  /**
   * Map of remote participants indexed by their IDs
   */
  participants: Map<string, Participant>;

  /**
   * ID of the currently dominant speaker
   */
  dominantSpeakerId?: string;

  /**
   * ID of the currently pinned participant
   */
  pinnedParticipantId?: string;

  /**
   * Current error state, if any
   */
  error?: Error;

  /**
   * Current media device permissions
   */
  permissions: MediaPermissions;
}

/**
 * Call statistics and metrics
 */
export interface CallStats {
  /**
   * Round trip time in milliseconds
   */
  rtt: number;

  /**
   * Packet loss percentage
   */
  packetLoss: number;

  /**
   * Bitrate in kilobits per second
   */
  bitrate: number;

  /**
   * Call duration in seconds
   */
  duration: number;
}

/**
 * Events that can be emitted during a call
 */
export enum CallEvent {
  PARTICIPANT_JOINED = "participantJoined",
  PARTICIPANT_LEFT = "participantLeft",
  DOMINANT_SPEAKER_CHANGED = "dominantSpeakerChanged",
  CONNECTION_STATUS_CHANGED = "connectionStatusChanged",
  MEDIA_STATUS_CHANGED = "mediaStatusChanged",
  ERROR = "error",
}

/**
 * Media device settings for the call
 */
export interface MediaSettings {
  /**
   * Selected audio input device ID
   */
  audioInputDeviceId?: string;

  /**
   * Selected audio output device ID
   */
  audioOutputDeviceId?: string;

  /**
   * Selected video input device ID
   */
  videoInputDeviceId?: string;

  /**
   * Audio constraints for the call
   */
  audioConstraints?: MediaTrackConstraints;

  /**
   * Video constraints for the call
   */
  videoConstraints?: MediaTrackConstraints;
}

/**
 * Recording options for the call
 */
export interface RecordingOptions {
  /**
   * Whether to record audio
   */
  audio: boolean;

  /**
   * Whether to record video
   */
  video: boolean;

  /**
   * Recording format
   */
  format: "webm" | "mp4";

  /**
   * Quality of the recording (0-1)
   */
  quality?: number;
}

/**
 * Server message types matching MediaSoup server protocol
 */
export interface ServerMessage {
  type: string;
  reqId?: string;
  [key: string]: any;
}

export interface JoinRoomRequest extends ServerMessage {
  type: "joinRoom";
  roomId: string;
  peerId: string;
  displayName: string;
}

export interface JoinRoomResponse extends ServerMessage {
  type: "joinRoomResponse";
  rtpCapabilities: any;
  peers: Array<{
    id: string;
    displayName: string;
    connectionState: string;
  }>;
  producers: Array<{
    id: string;
    peerId: string;
    kind: "audio" | "video";
    source: ProducerSource;
    displayName: string;
    muted: boolean;
  }>;
}

export interface CreateTransportRequest extends ServerMessage {
  type: "createWebRtcTransport";
  direction: "send" | "recv";
}

export interface CreateTransportResponse extends ServerMessage {
  type: "createWebRtcTransportResponse";
  id: string;
  iceParameters: any;
  iceCandidates: any[];
  dtlsParameters: any;
  sctpParameters?: any;
}

export interface ConnectTransportRequest extends ServerMessage {
  type: "connectWebRtcTransport";
  direction: "send" | "recv";
  dtlsParameters: any;
}

export interface ProduceRequest extends ServerMessage {
  type: "produce";
  kind: "audio" | "video";
  rtpParameters: any;
  source?: ProducerSource;
}

export interface ProduceResponse extends ServerMessage {
  type: "produceResponse";
  id: string;
}

export interface ConsumeRequest extends ServerMessage {
  type: "consume";
  producerId: string;
  rtpCapabilities: any;
}

export interface ConsumeResponse extends ServerMessage {
  type: "consumeResponse";
  id: string;
  producerId: string;
  kind: "audio" | "video";
  rtpParameters: any;
  peerId: string;
  displayName: string;
  source: ProducerSource;
  muted: boolean;
}

export interface NewProducerNotification extends ServerMessage {
  type: "newProducer";
  id: string;
  peerId: string;
  kind: "audio" | "video";
  source: ProducerSource;
  displayName: string;
  muted: boolean;
}

export interface ProducerClosedNotification extends ServerMessage {
  type: "producerClosed";
  peerId: string;
  producerId: string;
}

export interface SetProducerMutedRequest extends ServerMessage {
  type: "setProducerMuted";
  producerId: string;
  muted: boolean;
}

export interface AudioLevelNotification extends ServerMessage {
  type: "audioLevel";
  peerId: string;
  volume: number;
}

export interface PeerJoinedNotification extends ServerMessage {
  type: "peerJoined";
  peerId: string;
  displayName: string;
  isCreator: boolean;
}

export interface PeerLeftNotification extends ServerMessage {
  type: "peerLeft";
  peerId: string;
  displayName: string;
}
