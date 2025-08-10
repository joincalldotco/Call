import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import {
  type CallState,
  type CallConfig,
  type CallStats,
  CallConnectionStatus,
} from "../types/call";
import { CallClient } from "../services/call-client";

interface CallContextType {
  // Core state
  callState: CallState;
  isConnected: boolean;
  isConnecting: boolean;
  localStream: MediaStream | null;

  // Expose CallState properties directly for easier access
  self: CallState["self"];
  participants: CallState["participants"];
  dominantSpeakerId: CallState["dominantSpeakerId"];
  pinnedParticipantId: CallState["pinnedParticipantId"];

  stats?: CallStats;
  error?: Error;

  // Actions
  joinCall: (config: CallConfig) => Promise<void>;
  leaveCall: () => Promise<void>;
  toggleMicrophone: () => Promise<boolean>;
  toggleCamera: () => Promise<boolean>;
  startScreenShare: () => Promise<void>;
  stopScreenShare: () => Promise<void>;
  changeDevice: (type: "audio" | "video", deviceId: string) => Promise<void>;
  pinParticipant: (participantId: string) => void;
  unpinParticipant: () => void;

  // Device management
  audioInputDevices: MediaDeviceInfo[];
  videoInputDevices: MediaDeviceInfo[];
  audioOutputDevices: MediaDeviceInfo[];
  selectedDevices: {
    audioInput: string;
    videoInput: string;
    audioOutput: string;
  };

  // Call client instance (for advanced usage)
  callClient: CallClient | null;
}

const CallContext = createContext<CallContextType | undefined>(undefined);

interface CallProviderProps {
  children: React.ReactNode;
  signalingUrl: string;
}

export function CallProvider({ children, signalingUrl }: CallProviderProps) {
  const callClientRef = useRef<CallClient | null>(null);
  const [callState, setCallState] = useState<CallState>({
    connectionStatus: CallConnectionStatus.IDLE,
    self: null,
    participants: new Map(),
    permissions: {
      audio: false,
      video: false,
      screen: false,
    },
  });

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [stats, setStats] = useState<CallStats | undefined>();
  const [error, setError] = useState<Error | undefined>();

  // Device state
  const [audioInputDevices, setAudioInputDevices] = useState<MediaDeviceInfo[]>(
    []
  );
  const [videoInputDevices, setVideoInputDevices] = useState<MediaDeviceInfo[]>(
    []
  );
  const [audioOutputDevices, setAudioOutputDevices] = useState<
    MediaDeviceInfo[]
  >([]);
  const [selectedDevices, setSelectedDevices] = useState({
    audioInput: "",
    videoInput: "",
    audioOutput: "",
  });

  // Initialize CallClient
  useEffect(() => {
    if (!callClientRef.current) {
      callClientRef.current = new CallClient(signalingUrl);

      const client = callClientRef.current;

      // Set up event listeners
      client.on("connectionStatusChanged", (status) => {
        setCallState((prev) => ({ ...prev, connectionStatus: status }));
        if (status === CallConnectionStatus.DISCONNECTED) {
          setLocalStream(null);
          setCallState((prev) => ({
            ...prev,
            participants: new Map(),
            dominantSpeakerId: undefined,
            pinnedParticipantId: undefined,
          }));
          setError(undefined);
        }
      });

      client.on("participantJoined", (participant) => {
        setCallState((prev) => {
          const newParticipants = new Map(prev.participants);
          newParticipants.set(participant.id, participant);
          return { ...prev, participants: newParticipants };
        });
      });

      client.on("participantLeft", (participantId) => {
        setCallState((prev) => {
          const newParticipants = new Map(prev.participants);
          newParticipants.delete(participantId);
          return {
            ...prev,
            participants: newParticipants,
            dominantSpeakerId:
              prev.dominantSpeakerId === participantId
                ? undefined
                : prev.dominantSpeakerId,
            pinnedParticipantId:
              prev.pinnedParticipantId === participantId
                ? undefined
                : prev.pinnedParticipantId,
          };
        });
      });

      client.on("participantUpdated", (participant) => {
        setCallState((prev) => {
          const newParticipants = new Map(prev.participants);
          newParticipants.set(participant.id, participant);
          return { ...prev, participants: newParticipants };
        });
      });

      client.on("dominantSpeakerChanged", (speakerId) => {
        setCallState((prev) => ({ ...prev, dominantSpeakerId: speakerId }));
      });

      client.on("localStreamChanged", (stream) => {
        setLocalStream(stream);
      });

      client.on("error", (err) => {
        setError(err);
      });

      client.on("statsUpdated", (callStats) => {
        setStats(callStats);
      });

      // Update device lists
      const updateDevices = () => {
        const devices = client.getMediaDevices();
        setAudioInputDevices(devices.audioInputDevices);
        setVideoInputDevices(devices.videoInputDevices);
        setAudioOutputDevices(devices.audioOutputDevices);

        const settings = client.getMediaSettings();
        setSelectedDevices({
          audioInput: settings.audioInputDeviceId || "",
          videoInput: settings.videoInputDeviceId || "",
          audioOutput: settings.audioOutputDeviceId || "",
        });
      };

      // Initial device update
      updateDevices();

      // Listen for device changes
      navigator.mediaDevices?.addEventListener("devicechange", updateDevices);

      return () => {
        navigator.mediaDevices?.removeEventListener(
          "devicechange",
          updateDevices
        );
      };
    }
  }, [signalingUrl]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (callClientRef.current) {
        callClientRef.current.destroy();
        callClientRef.current = null;
      }
    };
  }, []);

  // Actions
  const joinCall = useCallback(async (config: CallConfig) => {
    if (!callClientRef.current) return;

    try {
      setError(undefined);
      await callClientRef.current.joinCall(config);
      setCallState(callClientRef.current.getState());
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, []);

  const leaveCall = useCallback(async () => {
    if (!callClientRef.current) return;

    try {
      await callClientRef.current.leaveCall();
      setCallState(callClientRef.current.getState());
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, []);

  const toggleMicrophone = useCallback(async () => {
    if (!callClientRef.current) return false;

    try {
      const isEnabled = await callClientRef.current.toggleMicrophone();
      setCallState(callClientRef.current.getState());
      return isEnabled;
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, []);

  const toggleCamera = useCallback(async () => {
    if (!callClientRef.current) return false;

    try {
      const isEnabled = await callClientRef.current.toggleCamera();
      setCallState(callClientRef.current.getState());
      return isEnabled;
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, []);

  const startScreenShare = useCallback(async () => {
    if (!callClientRef.current) return;

    try {
      await callClientRef.current.startScreenShare();
      setCallState(callClientRef.current.getState());
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, []);

  const stopScreenShare = useCallback(async () => {
    if (!callClientRef.current) return;

    try {
      await callClientRef.current.stopScreenShare();
      setCallState(callClientRef.current.getState());
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, []);

  const changeDevice = useCallback(
    async (type: "audio" | "video", deviceId: string) => {
      if (!callClientRef.current) return;

      try {
        await callClientRef.current.changeDevice(type, deviceId);

        // Update selected devices
        setSelectedDevices((prev) => ({
          ...prev,
          [type === "audio" ? "audioInput" : "videoInput"]: deviceId,
        }));
      } catch (err) {
        setError(err as Error);
        throw err;
      }
    },
    []
  );

  // Pin/unpin participant functions
  const pinParticipant = useCallback((participantId: string) => {
    setCallState((prev) => ({ ...prev, pinnedParticipantId: participantId }));
  }, []);

  const unpinParticipant = useCallback(() => {
    setCallState((prev) => ({ ...prev, pinnedParticipantId: undefined }));
  }, []);

  // Computed values
  const isConnected =
    callState.connectionStatus === CallConnectionStatus.CONNECTED;
  const isConnecting =
    callState.connectionStatus === CallConnectionStatus.CONNECTING;

  const contextValue: CallContextType = {
    // Core state
    callState,
    isConnected,
    isConnecting,
    localStream,

    // Expose CallState properties directly
    self: callState.self,
    participants: callState.participants,
    dominantSpeakerId: callState.dominantSpeakerId,
    pinnedParticipantId: callState.pinnedParticipantId,

    stats,
    error,

    // Actions
    joinCall,
    leaveCall,
    toggleMicrophone,
    toggleCamera,
    startScreenShare,
    stopScreenShare,
    changeDevice,
    pinParticipant,
    unpinParticipant,

    // Device management
    audioInputDevices,
    videoInputDevices,
    audioOutputDevices,
    selectedDevices,

    // Call client instance
    callClient: callClientRef.current,
  };

  return (
    <CallContext.Provider value={contextValue}>{children}</CallContext.Provider>
  );
}

export function useCall() {
  const context = useContext(CallContext);
  if (context === undefined) {
    throw new Error("useCall must be used within a CallProvider");
  }
  return context;
}
