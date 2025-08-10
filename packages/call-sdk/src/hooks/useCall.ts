import { useCallback, useEffect, useState } from "react";
import { useCall as useCallContext } from "../providers/CallProvider";
import type { CallConfig, CallStats } from "../types/call";
import type { Participant, Self } from "../types/participant";

export interface UseCallReturn {
  // Connection state
  isConnected: boolean;
  isConnecting: boolean;
  isReconnecting: boolean;
  connectionError?: Error;

  // Participants
  self: Self | null;
  participants: Participant[];
  participantCount: number;
  dominantSpeaker?: Participant;
  pinnedParticipant?: Participant;

  // Media state
  localStream: MediaStream | null;
  isMicrophoneEnabled: boolean;
  isCameraEnabled: boolean;
  isScreenShareEnabled: boolean;

  // Call actions
  joinCall: (config: CallConfig) => Promise<void>;
  leaveCall: () => Promise<void>;

  // Media controls
  toggleMicrophone: () => Promise<boolean>;
  toggleCamera: () => Promise<boolean>;
  startScreenShare: () => Promise<void>;
  stopScreenShare: () => Promise<void>;

  // Participant management
  pinParticipant: (participantId: string) => void;
  unpinParticipant: () => void;
  getParticipantById: (participantId: string) => Participant | undefined;

  // Device management
  changeAudioDevice: (deviceId: string) => Promise<void>;
  changeVideoDevice: (deviceId: string) => Promise<void>;

  // Call statistics
  stats?: CallStats;

  // Advanced
  callClient: any; // CallClient instance for advanced usage
}

/**
 * Main hook for call functionality
 * Provides a comprehensive interface for managing video calls
 */
export function useCall(): UseCallReturn {
  const context = useCallContext();
  const [isReconnecting, setIsReconnecting] = useState(false);

  // Derived state
  const participantsArray = Array.from(context.participants.values());
  const dominantSpeaker = context.dominantSpeakerId
    ? context.participants.get(context.dominantSpeakerId)
    : undefined;
  const pinnedParticipant = context.pinnedParticipantId
    ? context.participants.get(context.pinnedParticipantId)
    : undefined;

  // Media state derived from self
  const isMicrophoneEnabled = context.self?.audioEnabled ?? false;
  const isCameraEnabled = context.self?.videoEnabled ?? false;
  const isScreenShareEnabled = context.self?.screenShareEnabled ?? false;

  // Handle reconnection logic
  useEffect(() => {
    if (context.callState.connectionStatus === "reconnecting") {
      setIsReconnecting(true);
    } else {
      setIsReconnecting(false);
    }
  }, [context.callState.connectionStatus]);

  // Device management helpers
  const changeAudioDevice = useCallback(
    async (deviceId: string) => {
      await context.changeDevice("audio", deviceId);
    },
    [context.changeDevice]
  );

  const changeVideoDevice = useCallback(
    async (deviceId: string) => {
      await context.changeDevice("video", deviceId);
    },
    [context.changeDevice]
  );

  // Participant helpers
  const getParticipantById = useCallback(
    (participantId: string) => {
      return context.participants.get(participantId);
    },
    [context.participants]
  );

  return {
    // Connection state
    isConnected: context.isConnected,
    isConnecting: context.isConnecting,
    isReconnecting,
    connectionError: context.error,

    // Participants
    self: context.self,
    participants: participantsArray,
    participantCount: participantsArray.length + (context.self ? 1 : 0),
    dominantSpeaker,
    pinnedParticipant,

    // Media state
    localStream: context.localStream,
    isMicrophoneEnabled,
    isCameraEnabled,
    isScreenShareEnabled,

    // Call actions
    joinCall: context.joinCall,
    leaveCall: context.leaveCall,

    // Media controls
    toggleMicrophone: context.toggleMicrophone,
    toggleCamera: context.toggleCamera,
    startScreenShare: context.startScreenShare,
    stopScreenShare: context.stopScreenShare,

    // Participant management
    pinParticipant: context.pinParticipant,
    unpinParticipant: context.unpinParticipant,
    getParticipantById,

    // Device management
    changeAudioDevice,
    changeVideoDevice,

    // Call statistics
    stats: context.stats,

    // Advanced
    callClient: context.callClient,
  };
}
