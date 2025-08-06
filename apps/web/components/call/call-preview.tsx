"use client";

import { useEffect, useRef } from "react";
import { Button } from "@call/ui/components/button";
import { useCallContext } from "@/contexts/call-context";
import { useCallDevices } from "@/hooks/use-call-devices";
import { useCallAccess } from "@/hooks/use-call-access";
import { useCallJoin } from "@/hooks/use-call-join";

export const CallPreview = () => {
  const { state, dispatch, mediasoup } = useCallContext();
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

  // Get stream with the selected devices for preview
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
  }, [selectedVideo, selectedAudio, state.joined, dispatch]);

  // Assign stream to the preview video
  useEffect(() => {
    if (videoRef.current && state.previewStream) {
      videoRef.current.srcObject = state.previewStream;
    }
  }, [state.previewStream]);

  return (
    <div className="flex w-full max-w-xs flex-col gap-4">
      <label className="font-semibold">Camera</label>
      <select
        value={selectedVideo}
        onChange={(e) => handleDeviceChange("video", e.target.value)}
        className="rounded-md border p-2"
      >
        {videoDevices.map((device) => (
          <option key={device.deviceId} value={device.deviceId}>
            {device.label || `Camera ${device.deviceId}`}
          </option>
        ))}
      </select>

      <label className="font-semibold">Microphone</label>
      <select
        value={selectedAudio}
        onChange={(e) => handleDeviceChange("audio", e.target.value)}
        className="rounded-md border p-2"
      >
        {audioDevices.map((device) => (
          <option key={device.deviceId} value={device.deviceId}>
            {device.label || `Microphone ${device.deviceId}`}
          </option>
        ))}
      </select>

      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="aspect-video w-full rounded-lg bg-black"
      />

      {isCreator || hasAccess ? (
        <Button onClick={handleJoin} disabled={!mediasoup.connected}>
          Join Call
        </Button>
      ) : (
        !isCreator && (
          <Button
            onClick={handleRequestAccess}
            disabled={!mediasoup.connected || isRequestingAccess}
            variant="secondary"
          >
            {isRequestingAccess ? "Sending Request..." : "Request Access"}
          </Button>
        )
      )}
    </div>
  );
};
