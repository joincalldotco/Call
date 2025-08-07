/**
 * Represents the media capabilities and state of a participant
 */
export interface MediaState {
  /**
   * Whether the participant's audio is enabled
   */
  audioEnabled: boolean;

  /**
   * Whether the participant's video is enabled
   */
  videoEnabled: boolean;

  /**
   * Whether the participant is sharing their screen
   */
  screenShareEnabled: boolean;

  /**
   * The participant's audio track, if available
   */
  audioTrack?: MediaStreamTrack;

  /**
   * The participant's video track, if available
   */
  videoTrack?: MediaStreamTrack;

  /**
   * The participant's screen share track, if available
   */
  screenShareTrack?: MediaStreamTrack;
}

/**
 * Base interface for both local and remote participants
 */
export interface BaseParticipant extends MediaState {
  /**
   * Unique identifier for the participant
   */
  id: string;

  /**
   * Display name of the participant
   */
  displayName: string;

  /**
   * Timestamp when the participant joined the call
   */
  joinedAt: Date;

  /**
   * Timestamp of the participant's last activity
   */
  lastActiveAt: Date;

  /**
   * Timestamp when the participant last spoke
   */
  lastSpoke?: Date;

  /**
   * Whether the participant is currently speaking
   */
  isSpeaking: boolean;
}

/**
 * Represents the local participant (self) in the call
 */
export interface Self extends BaseParticipant {
  /**
   * Flag to identify local participant
   */
  isLocal: true;
}

/**
 * Represents a remote participant in the call
 */
export interface Participant extends BaseParticipant {
  /**
   * Flag to identify remote participant
   */
  isLocal: false;

  /**
   * Connection quality metric (0-1)
   */
  connectionQuality: number;
}

/**
 * Union type for any participant type
 */
export type AnyParticipant = Self | Participant;

/**
 * Type guard to check if a participant is the local participant
 */
export function isSelf(participant: AnyParticipant): participant is Self {
  return participant.isLocal === true;
}

/**
 * Type guard to check if a participant is a remote participant
 */
export function isRemoteParticipant(
  participant: AnyParticipant
): participant is Participant {
  return participant.isLocal === false;
}

/**
 * Represents the connection status of a participant
 */
export enum ParticipantConnectionStatus {
  CONNECTING = "connecting",
  CONNECTED = "connected",
  DISCONNECTED = "disconnected",
  RECONNECTING = "reconnecting",
  FAILED = "failed",
}

/**
 * Media device permissions status
 */
export interface MediaPermissions {
  audio: boolean;
  video: boolean;
  screen: boolean;
}
