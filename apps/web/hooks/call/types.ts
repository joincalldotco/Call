export type CallStatus =
  | "idle"
  | "preview"
  | "connecting"
  | "connected"
  | "error"
  | "disconnected";

export interface Participant {
  id: string;
  displayName: string;
  isCreator?: boolean;
  isMicOn: boolean;
  isCameraOn: boolean;
  isScreenSharing?: boolean;
  connectionState?: string;
  isSpeaking?: boolean;
}

export interface VideoStream {
  id: string;
  stream: MediaStream;
  participantId: string;
  type: "camera" | "screen";
  displayName?: string;
}

export interface CallError {
  code: string;
  message: string;
  details?: any;
}

export interface DeviceInfo {
  deviceId: string;
  label: string;
  kind: "videoinput" | "audioinput";
}

export interface UseVideoCallOptions {
  callId: string;
  userId?: string;
  displayName?: string;
  onError?: (error: CallError) => void;
  onParticipantJoined?: (participant: Participant) => void;
  onParticipantLeft?: (participantId: string) => void;
  autoJoin?: boolean;
}

export interface MediaState {
  isMicOn: boolean;
  isCameraOn: boolean;
  isScreenSharing: boolean;
}

export interface AccessInfo {
  hasAccess: boolean;
  isCreator: boolean;
  isRequestingAccess: boolean;
  creatorInfo: {
    id: string;
    name: string;
    email?: string;
  } | null;
}
