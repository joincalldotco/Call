"use client";

import { useMediasoupClient } from "@/hooks/useMediasoupClient";
import { useSession } from "@/components/providers/session";
import { createContext, useContext, useReducer, type ReactNode } from "react";

interface CallState {
  callId: string | null;
  joined: boolean;
  isCreator: boolean;
  hasAccess: boolean;
  isRequestingAccess: boolean;
  creatorInfo: {
    creatorId: string;
    creatorName: string;
    creatorEmail: string;
  } | null;
  videoDevices: MediaDeviceInfo[];
  audioDevices: MediaDeviceInfo[];
  selectedVideo: string | undefined;
  selectedAudio: string | undefined;
  previewStream: MediaStream | null;
  screenStream: MediaStream | null;
  isScreenSharing: boolean;
  isLocalMicOn: boolean;
  isChatOpen: boolean;
  isParticipantsSidebarOpen: boolean;
  remoteAudios: Array<{
    id: string;
    stream: MediaStream;
    peerId?: string;
    displayName?: string;
  }>;
  producers: any[];
  myProducerIds: string[];
  recvTransportReady: boolean;
}

type CallAction =
  | { type: "SET_CALL_ID"; payload: string }
  | { type: "SET_JOINED"; payload: boolean }
  | { type: "SET_CREATOR"; payload: boolean }
  | { type: "SET_HAS_ACCESS"; payload: boolean }
  | { type: "SET_REQUESTING_ACCESS"; payload: boolean }
  | { type: "SET_CREATOR_INFO"; payload: CallState["creatorInfo"] }
  | { type: "SET_VIDEO_DEVICES"; payload: MediaDeviceInfo[] }
  | { type: "SET_AUDIO_DEVICES"; payload: MediaDeviceInfo[] }
  | { type: "SET_SELECTED_VIDEO"; payload: string | undefined }
  | { type: "SET_SELECTED_AUDIO"; payload: string | undefined }
  | { type: "SET_PREVIEW_STREAM"; payload: MediaStream | null }
  | { type: "SET_SCREEN_STREAM"; payload: MediaStream | null }
  | { type: "SET_SCREEN_SHARING"; payload: boolean }
  | { type: "SET_LOCAL_MIC_ON"; payload: boolean }
  | { type: "SET_CHAT_OPEN"; payload: boolean }
  | { type: "SET_PARTICIPANTS_SIDEBAR_OPEN"; payload: boolean }
  | { type: "SET_REMOTE_AUDIOS"; payload: CallState["remoteAudios"] }
  | { type: "SET_PRODUCERS"; payload: any[] }
  | { type: "SET_MY_PRODUCER_IDS"; payload: string[] }
  | { type: "SET_RECV_TRANSPORT_READY"; payload: boolean }
  | { type: "RESET_CALL_STATE" };

const initialState: CallState = {
  callId: null,
  joined: false,
  isCreator: false,
  hasAccess: false,
  isRequestingAccess: false,
  creatorInfo: null,
  videoDevices: [],
  audioDevices: [],
  selectedVideo: undefined,
  selectedAudio: undefined,
  previewStream: null,
  screenStream: null,
  isScreenSharing: false,
  isLocalMicOn: true,
  isChatOpen: false,
  isParticipantsSidebarOpen: false,
  remoteAudios: [],
  producers: [],
  myProducerIds: [],
  recvTransportReady: false,
};

function callReducer(state: CallState, action: CallAction): CallState {
  switch (action.type) {
    case "SET_CALL_ID":
      return { ...state, callId: action.payload };
    case "SET_JOINED":
      return { ...state, joined: action.payload };
    case "SET_CREATOR":
      return { ...state, isCreator: action.payload };
    case "SET_HAS_ACCESS":
      return { ...state, hasAccess: action.payload };
    case "SET_REQUESTING_ACCESS":
      return { ...state, isRequestingAccess: action.payload };
    case "SET_CREATOR_INFO":
      return { ...state, creatorInfo: action.payload };
    case "SET_VIDEO_DEVICES":
      return { ...state, videoDevices: action.payload };
    case "SET_AUDIO_DEVICES":
      return { ...state, audioDevices: action.payload };
    case "SET_SELECTED_VIDEO":
      return { ...state, selectedVideo: action.payload };
    case "SET_SELECTED_AUDIO":
      return { ...state, selectedAudio: action.payload };
    case "SET_PREVIEW_STREAM":
      return { ...state, previewStream: action.payload };
    case "SET_SCREEN_STREAM":
      return { ...state, screenStream: action.payload };
    case "SET_SCREEN_SHARING":
      return { ...state, isScreenSharing: action.payload };
    case "SET_LOCAL_MIC_ON":
      return { ...state, isLocalMicOn: action.payload };
    case "SET_CHAT_OPEN":
      return { ...state, isChatOpen: action.payload };
    case "SET_PARTICIPANTS_SIDEBAR_OPEN":
      return { ...state, isParticipantsSidebarOpen: action.payload };
    case "SET_REMOTE_AUDIOS":
      return { ...state, remoteAudios: action.payload };
    case "SET_PRODUCERS":
      return { ...state, producers: action.payload };
    case "SET_MY_PRODUCER_IDS":
      return { ...state, myProducerIds: action.payload };
    case "SET_RECV_TRANSPORT_READY":
      return { ...state, recvTransportReady: action.payload };
    case "RESET_CALL_STATE":
      return initialState;
    default:
      return state;
  }
}

interface CallContextType {
  state: CallState;
  dispatch: React.Dispatch<CallAction>;
  mediasoup: ReturnType<typeof useMediasoupClient>;
  session: ReturnType<typeof useSession>;
}

const CallContext = createContext<CallContextType | null>(null);

export const CallProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(callReducer, initialState);
  const mediasoup = useMediasoupClient();
  const session = useSession();

  return (
    <CallContext.Provider value={{ state, dispatch, mediasoup, session }}>
      {children}
    </CallContext.Provider>
  );
};

export const useCallContext = () => {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error("useCallContext must be used within a CallProvider");
  }
  return context;
};
