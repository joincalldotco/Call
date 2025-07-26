"use client";

import { useSession } from "@/hooks/useSession";
import { useParams } from "next/navigation";
import { useVideoCall } from "@/hooks/call/useVideoCall";
import { Button } from "@call/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@call/ui/components/dropdown-menu";
import {
  FiChevronDown,
  FiMessageCircle,
  FiMic,
  FiMicOff,
  FiMonitor,
  FiPhoneOff,
  FiUsers,
  FiVideo,
  FiVideoOff,
} from "react-icons/fi";
import { cn } from "@call/ui/lib/utils";
import { MicOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ChatSidebar } from "@/components/rooms/chat-sidebar";
import { ParticipantsSidebar } from "@/components/rooms/participants-sidebar";

// A simple video player component
const VideoPlayer = ({
  stream,
  muted = false,
}: {
  stream: MediaStream;
  muted?: boolean;
}) => {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <video
      ref={ref}
      autoPlay
      playsInline
      muted={muted}
      className="h-[240px] w-[320px] rounded-lg bg-black shadow-lg"
    />
  );
};

const MediaControls = ({
  isMicOn,
  isCameraOn,
  isScreenSharing,
  onToggleMic,
  onToggleCamera,
  onToggleScreenShare,
  onHangup,
  onToggleChat,
  onToggleParticipants,
  videoDevices,
  audioDevices,
  selectedVideo,
  selectedAudio,
  onDeviceChange,
}: {
  isMicOn: boolean;
  isCameraOn: boolean;
  isScreenSharing: boolean;
  onToggleMic: () => void;
  onToggleCamera: () => void;
  onToggleScreenShare: () => void;
  onHangup: () => void;
  onToggleChat: () => void;
  onToggleParticipants: () => void;
  videoDevices: { deviceId: string; label: string }[];
  audioDevices: { deviceId: string; label: string }[];
  selectedVideo: string;
  selectedAudio: string;
  onDeviceChange: (type: "video" | "audio", deviceId: string) => void;
}) => {
  return (
    <div className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 gap-2 rounded-lg bg-black/80 p-3 backdrop-blur-sm">
      {/* Mic toggle */}
      <Button
        variant="ghost"
        size="icon"
        className={`relative h-12 w-12 rounded-full ${
          isMicOn
            ? "bg-gray-700 text-white hover:bg-gray-600"
            : "bg-red-600 text-white hover:bg-red-700"
        }`}
        onClick={onToggleMic}
      >
        {isMicOn ? <FiMic size={20} /> : <FiMicOff size={20} />}
      </Button>
      {/* Mic selector */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full bg-gray-700 text-white hover:bg-gray-600"
          >
            <FiChevronDown size={14} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="mb-2 w-56">
          {audioDevices?.map((device) => (
            <DropdownMenuItem
              key={device.deviceId}
              onClick={() => onDeviceChange("audio", device.deviceId)}
              className={selectedAudio === device.deviceId ? "bg-blue-50" : ""}
            >
              {device.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Camera toggle */}
      <Button
        variant="ghost"
        size="icon"
        className={`relative h-12 w-12 rounded-full ${
          isCameraOn
            ? "bg-gray-700 text-white hover:bg-gray-600"
            : "bg-red-600 text-white hover:bg-red-700"
        }`}
        onClick={onToggleCamera}
      >
        {isCameraOn ? <FiVideo size={20} /> : <FiVideoOff size={20} />}
      </Button>
      {/* Camera selector */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full bg-gray-700 text-white hover:bg-gray-600"
          >
            <FiChevronDown size={14} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="mb-2 w-56">
          {videoDevices?.map((device) => (
            <DropdownMenuItem
              key={device.deviceId}
              onClick={() => onDeviceChange("video", device.deviceId)}
              className={selectedVideo === device.deviceId ? "bg-blue-50" : ""}
            >
              {device.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Screen share */}
      <Button
        variant="ghost"
        size="icon"
        className={`h-12 w-12 rounded-full ${
          isScreenSharing
            ? "bg-green-600 text-white hover:bg-green-700"
            : "bg-gray-700 text-white hover:bg-gray-600"
        }`}
        onClick={onToggleScreenShare}
      >
        <FiMonitor size={20} />
      </Button>

      {/* Participants */}
      <Button
        variant="ghost"
        size="icon"
        className="relative h-12 w-12 rounded-full bg-gray-700 text-white hover:bg-gray-600"
        onClick={onToggleParticipants}
      >
        <FiUsers size={20} />
      </Button>

      {/* Chat */}
      <Button
        variant="ghost"
        size="icon"
        className="relative h-12 w-12 rounded-full bg-gray-700 text-white hover:bg-gray-600"
        onClick={onToggleChat}
      >
        <FiMessageCircle size={20} />
      </Button>

      {/* Hangup */}
      <Button
        variant="ghost"
        size="icon"
        className="relative h-12 w-12 rounded-full bg-red-600 text-white hover:bg-red-700"
        onClick={onHangup}
      >
        <FiPhoneOff size={20} />
      </Button>
    </div>
  );
};

export default function CallPage() {
  const { session } = useSession();
  const callId = "2znl78";

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isParticipantsSidebarOpen, setIsParticipantsSidebarOpen] =
    useState(false);

  const {
    status,
    localStream,
    videoStreams,
    participants,
    join,
    leave,
    devices,
    media,
    screenShare,
    access,
    error,
    handleDeviceChange,
  } = useVideoCall({
    callId,
    userId: session?.user?.id,
    displayName: session?.user?.name || "Guest",
    onError: (e: any) => console.error("Call Error:", e),
  });

  const handleToggleScreenShare = () => {
    if (screenShare.isSharing) {
      screenShare.stopSharing();
    } else {
      screenShare.startSharing();
    }
  };

  if (status === "error") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <h2 className="text-2xl font-bold text-red-500">Error</h2>
        <p>{error?.message}</p>
        <Button onClick={() => window.location.reload()} className="mt-4">
          Try Again
        </Button>
      </div>
    );
  }

  if (status === "idle" || status === "preview") {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-6">
        <div className="flex w-full max-w-xs flex-col gap-4">
          <h1 className="text-2xl font-bold">Ready to join?</h1>

          {localStream && <VideoPlayer stream={localStream} muted />}

          <label className="font-semibold">Camera</label>
          <select
            value={devices.selectedVideoDevice}
            onChange={(e) => handleDeviceChange("video", e.target.value)}
            className="rounded-md border p-2"
            disabled={devices.isLoading}
          >
            {devices.videoDevices.map((device) => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label}
              </option>
            ))}
          </select>

          <label className="font-semibold">Microphone</label>
          <select
            value={devices.selectedAudioDevice}
            onChange={(e) => handleDeviceChange("audio", e.target.value)}
            className="rounded-md border p-2"
            disabled={devices.isLoading}
          >
            {devices.audioDevices.map((device) => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label}
              </option>
            ))}
          </select>

          <Button
            onClick={join}
            disabled={status === "connecting" || !session?.user?.id}
          >
            {status === "connecting" ? "Joining..." : "Join Call"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-6">
      <div className="relative flex flex-wrap items-start justify-center gap-4">
        {/* Local Video */}
        {localStream && media.isCameraOn && (
          <div className="relative">
            <VideoPlayer stream={localStream} muted />
            <span className="absolute bottom-2 left-2 rounded bg-black/70 px-2 py-1 text-xs text-white">
              You
            </span>
          </div>
        )}

        {/* Local Screen Share */}
        {screenShare.screenStream && (
          <div className="relative">
            <VideoPlayer stream={screenShare.screenStream} muted />
            <span className="absolute bottom-2 left-2 rounded bg-black/70 px-2 py-1 text-xs text-white">
              Your Screen
            </span>
          </div>
        )}

        {/* Remote Videos */}
        {videoStreams
          .filter((vs: any) => vs.type === "camera")
          .map((videoStream: any) => (
            <div className="relative" key={videoStream.id}>
              <VideoPlayer stream={videoStream.stream} />
              <span className="absolute bottom-2 left-2 rounded bg-black/70 px-2 py-1 text-xs text-white">
                {videoStream.displayName || "Guest"}
              </span>
            </div>
          ))}

        {/* Remote Screen Shares */}
        {videoStreams
          .filter((vs: any) => vs.type === "screen")
          .map((videoStream: any) => (
            <div className="relative" key={videoStream.id}>
              <VideoPlayer stream={videoStream.stream} />
              <span className="absolute bottom-2 left-2 rounded bg-black/70 px-2 py-1 text-xs text-white">
                {videoStream.displayName}'s Screen
              </span>
            </div>
          ))}
      </div>

      <MediaControls
        isMicOn={media.isMicOn}
        isCameraOn={media.isCameraOn}
        isScreenSharing={screenShare.isSharing}
        onToggleMic={media.toggleMic}
        onToggleCamera={media.toggleCamera}
        onToggleScreenShare={handleToggleScreenShare}
        onHangup={leave}
        onToggleChat={() => setIsChatOpen(!isChatOpen)}
        onToggleParticipants={() =>
          setIsParticipantsSidebarOpen(!isParticipantsSidebarOpen)
        }
        videoDevices={devices.videoDevices}
        audioDevices={devices.audioDevices}
        selectedVideo={devices.selectedVideoDevice}
        selectedAudio={devices.selectedAudioDevice}
        onDeviceChange={handleDeviceChange}
      />

      {/* <ChatSidebar
        open={isChatOpen}
        onOpenChange={setIsChatOpen}
        // socket={...} // socket is not exposed by the hook, need to consider how to handle chat
        userId={session?.user?.id || ''}
        displayName={session?.user?.name || 'Guest'}
      /> */}

      <ParticipantsSidebar
        open={isParticipantsSidebarOpen}
        onOpenChange={setIsParticipantsSidebarOpen}
        callId={callId}
        isCreator={access.isCreator}
        participants={participants}
        currentUserId={session?.user?.id || ""}
      />
    </div>
  );
}
