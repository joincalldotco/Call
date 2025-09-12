"use client";

import { useCallContext } from "@/contexts/call-context";
import { useCallAccess } from "@/hooks/use-call-access";
import { useCallDevices } from "@/hooks/use-call-devices";
import { useCallJoin } from "@/hooks/use-call-join";
import { useSession } from "@/components/providers/session";
import { Button } from "@call/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@call/ui/components/dropdown-menu";
import { Icons } from "@call/ui/components/icons";
import { LoadingButton } from "@call/ui/components/loading-button";
import { cn } from "@call/ui/lib/utils";
import { ArrowRight, ChevronDown } from "lucide-react";
import { useEffect, useRef } from "react";

export const CallPreview = () => {
  const { state, dispatch, mediasoup } = useCallContext();
  const session = useSession();
  const {
    videoDevices,
    audioDevices,
    selectedVideo,
    selectedAudio,
    handleDeviceChange,
  } = useCallDevices();
  const { isCreator, hasAccess, isRequestingAccess, handleRequestAccess } =
    useCallAccess();
  const { handleJoin } = useCallJoin();
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleTogglePreviewCamera = () => {
    const stream = state.previewStream;
    if (!stream) {
      dispatch({
        type: "SET_LOCAL_CAMERA_ON",
        payload: !state.isLocalCameraOn,
      });
      return;
    }
    const videoTrack = stream.getVideoTracks()[0];
    if (videoTrack) {
      const next = !videoTrack.enabled;
      videoTrack.enabled = next;
      dispatch({ type: "SET_LOCAL_CAMERA_ON", payload: next });
    }
  };

  const handleTogglePreviewMic = () => {
    const stream = state.previewStream;
    if (!stream) {
      dispatch({ type: "SET_LOCAL_MIC_ON", payload: !state.isLocalMicOn });
      return;
    }
    const audioTrack = stream.getAudioTracks()[0];
    if (audioTrack) {
      const next = !audioTrack.enabled;
      audioTrack.enabled = next;
      dispatch({ type: "SET_LOCAL_MIC_ON", payload: next });
    }
  };

  useEffect(() => {
    let active = true;
    const getStream = async () => {
      if (state.joined) return;

      try {
        const constraints: MediaStreamConstraints = {
          video: selectedVideo ? { deviceId: { exact: selectedVideo } } : true,
          audio: selectedAudio ? { deviceId: { exact: selectedAudio } } : true,
        };
        const s = await navigator.mediaDevices.getUserMedia(constraints);
        if (active) {
          const v = s.getVideoTracks()[0];
          if (v) v.enabled = state.isLocalCameraOn;
          const a = s.getAudioTracks()[0];
          if (a) a.enabled = state.isLocalMicOn;
          dispatch({ type: "SET_PREVIEW_STREAM", payload: s });
        }
      } catch (err) {
        console.error("Error getting preview stream:", err);
        if (active) {
          dispatch({ type: "SET_PREVIEW_STREAM", payload: null });
        }
      }
    };
    getStream();
    return () => {
      active = false;
    };
  }, [
    selectedVideo,
    selectedAudio,
    state.joined,
    state.isLocalCameraOn,
    state.isLocalMicOn,
    dispatch,
  ]);

  useEffect(() => {
    if (videoRef.current && state.previewStream) {
      videoRef.current.srcObject = state.previewStream;
    }
  }, [state.previewStream]);

  useEffect(() => {
    if (!state.previewStream) return;
    const enumerate = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        dispatch({
          type: "SET_VIDEO_DEVICES",
          payload: devices.filter((d) => d.kind === "videoinput"),
        });
        dispatch({
          type: "SET_AUDIO_DEVICES",
          payload: devices.filter((d) => d.kind === "audioinput"),
        });
      } catch (error) {
        console.error("Failed to enumerate devices", error);
      }
    };
    enumerate();
  }, [state.previewStream, dispatch]);

  return (
    <div className="flex size-full items-center justify-center">
      <div className="flex w-full max-w-3xl flex-col gap-4">
        <div className="bg-sidebar aspect-video w-full overflow-hidden rounded-xl border">
          {state.isLocalCameraOn && state.previewStream ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="size-full object-cover"
            />
          ) : (
            <div className="flex size-full items-center justify-center bg-black">
              {session?.user?.image ? (
                <img
                  src={session.user.image}
                  alt="Your profile picture"
                  className="h-32 w-32 rounded-full border-4 border-white/20 object-cover"
                />
              ) : (
                <div className="flex h-32 w-32 items-center justify-center rounded-full border-4 border-white/20 bg-gray-600">
                  <Icons.users className="h-16 w-16 text-white/70" />
                </div>
              )}
            </div>
          )}
        </div>

        <div className="item-center flex justify-center gap-2.5">
          <CallPreviewButton>
            <Button
              onClick={handleTogglePreviewCamera}
              className={cn(
                "hover:bg-muted/90 flex size-7 items-center justify-center rounded-xl bg-transparent transition-all duration-300",
                !state.isLocalCameraOn &&
                  "bg-primary-red/10 hover:bg-primary-red/10 hover:text-primary-red"
              )}
              aria-label={
                state.isLocalCameraOn ? "Turn camera off" : "Turn camera on"
              }
            >
              {state.isLocalCameraOn ? (
                <Icons.videoIcon className="text-primary-blue size-5" />
              ) : (
                <Icons.videoOffIcon
                  className="size-5"
                  fill="fill-primary-red stroke-primary-red"
                />
              )}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-2.5 outline-none">
                <span className="text-lg font-medium">Camera</span>
                <ChevronDown className="fill-primary-icon size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="center"
                className="bg-inset-accent mt-2 space-y-1 rounded-xl shadow-none"
              >
                {videoDevices.map((device) => (
                  <DropdownMenuItem
                    key={device.deviceId}
                    onClick={() => handleDeviceChange("video", device.deviceId)}
                    className={cn(
                      "hover:bg-muted/50! cursor-pointer rounded-lg transition-all duration-300",
                      selectedVideo === device.deviceId && "bg-muted/50"
                    )}
                  >
                    {device.label ||
                      `Camera (${device.deviceId.slice(0, 8)}...)`}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </CallPreviewButton>
          <CallPreviewButton>
            <Button
              onClick={handleTogglePreviewMic}
              className={cn(
                "hover:bg-muted/90 flex size-7 items-center justify-center rounded-xl bg-transparent p-1 transition-all duration-300",
                !state.isLocalMicOn && "bg-primary-red/10"
              )}
              aria-label={
                state.isLocalMicOn ? "Mute microphone" : "Unmute microphone"
              }
            >
              {state.isLocalMicOn ? (
                <Icons.micIcon className="text-primary-blue size-5" />
              ) : (
                <Icons.micOffIcon className="size-5" fill="fill-primary-red" />
              )}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-2.5 outline-none">
                <span className="text-lg font-medium">Microphone</span>
                <ChevronDown className="size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="center"
                className="bg-inset-accent mt-2 space-y-1 rounded-xl shadow-none"
              >
                {audioDevices.map((device) => (
                  <DropdownMenuItem
                    key={device.deviceId}
                    onClick={() => {
                      handleDeviceChange("audio", device.deviceId);
                    }}
                    className={cn(
                      "hover:bg-muted/50! cursor-pointer rounded-lg transition-all duration-300",
                      selectedAudio === device.deviceId && "bg-muted/50"
                    )}
                  >
                    {device.label ||
                      `Microphone (${device.deviceId.slice(0, 8)}...)`}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </CallPreviewButton>

          {isCreator || hasAccess ? (
            <LoadingButton
              onClick={handleJoin}
              disabled={!mediasoup.connected}
              aria-label="Join call"
              loading={!mediasoup.connected}
              className="bg-primary-blue hover:bg-primary-blue/90 border-primary-blue flex items-center justify-center gap-2.5 rounded-3xl border px-3.5 py-2.5 text-lg text-white transition-all duration-300"
            >
              <span className="text-lg font-medium">Enter Call</span>
              <div className="flex size-7 items-center justify-center rounded-xl bg-white p-1">
                <ArrowRight className="text-primary-blue size-4" />
              </div>
            </LoadingButton>
          ) : (
            !isCreator && (
              <LoadingButton
                onClick={handleRequestAccess}
                disabled={!mediasoup.connected || isRequestingAccess}
                loading={isRequestingAccess}
                aria-label="Request access to join call"
                className="bg-primary-blue hover:bg-primary-blue/90 border-primary-blue flex items-center justify-center gap-2.5 rounded-3xl border px-3.5 py-2.5 text-lg text-white transition-all duration-300"
              >
                <span className="text-lg font-medium">
                  {isRequestingAccess ? "Sending Request..." : "Request Access"}
                </span>
                <div className="flex size-7 items-center justify-center rounded-xl bg-white p-1">
                  <ArrowRight className="text-primary-blue size-4" />
                </div>
              </LoadingButton>
            )
          )}
        </div>
      </div>
    </div>
  );
};

const CallPreviewButton = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <div
      className={cn(
        "bg-inset-accent border-inset-accent-forground flex items-center justify-center gap-2 rounded-3xl border px-3.5 py-2.5",
        className
      )}
    >
      {children}
    </div>
  );
};
