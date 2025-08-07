// Core client and services
export { CallClient } from "./services/call-client";
export { MediasoupService } from "./services/mediasoup-service";
export { SignalingClient } from "./services/signaling-client";
export { MediaManager } from "./services/media-manager";
export { PeerManager } from "./services/peer-manager";

// Core provider and hooks
export { CallProvider } from "./providers/CallProvider";
export { useCall } from "./hooks/useCall";
export { useParticipants } from "./hooks/useParticipants";
export { useMediaDevices } from "./hooks/useMediaDevices";

// Types
export type {
  CallConfig,
  CallState,
  CallEvent,
  CallStats,
  MediaSettings,
  RecordingOptions,
  ProducerSource,
} from "./types/call";

export type {
  Self,
  Participant,
  MediaState,
  BaseParticipant,
  MediaPermissions,
} from "./types/participant";

export { CallConnectionStatus } from "./types/call";

// Error handling
export {
  CallError,
  CallErrorType,
  ErrorHandler,
  errorHandler,
  createCallError,
  handleError,
  onError,
} from "./utils/error-handler";
export type { CallErrorDetails } from "./utils/error-handler";
