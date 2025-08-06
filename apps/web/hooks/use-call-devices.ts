"use client";

import { useCallContext } from "@/contexts/call-context";
import { useCallback, useEffect } from "react";

export const useCallDevices = () => {
  const { state, dispatch, mediasoup } = useCallContext();

  useEffect(() => {
    navigator.mediaDevices.enumerateDevices().then((devices) => {
      dispatch({
        type: "SET_VIDEO_DEVICES",
        payload: devices.filter((d) => d.kind === "videoinput"),
      });
      dispatch({
        type: "SET_AUDIO_DEVICES",
        payload: devices.filter((d) => d.kind === "audioinput"),
      });
    });
  }, [dispatch]);

  const handleDeviceChange = useCallback(
    async (type: "video" | "audio", deviceId: string) => {
      if (!state.joined || !mediasoup.localStream) {
        console.warn(
          "[Call] Cannot change device - not joined or no local stream"
        );
        return;
      }

      try {
        console.log(`[Call] Switching ${type} device to:`, deviceId);

        const constraints: MediaStreamConstraints = {};

        if (type === "video") {
          constraints.video = deviceId
            ? { deviceId: { exact: deviceId } }
            : true;
          constraints.audio = false;
          dispatch({ type: "SET_SELECTED_VIDEO", payload: deviceId });
        } else if (type === "audio") {
          constraints.audio = deviceId
            ? {
                deviceId: { exact: deviceId },
                echoCancellation: true,
                noiseSuppression: true,
              }
            : true;
          constraints.video = false;
          dispatch({ type: "SET_SELECTED_AUDIO", payload: deviceId });
        }

        const newStream =
          await navigator.mediaDevices.getUserMedia(constraints);

        if (!newStream || !newStream.getTracks().length) {
          throw new Error(`No ${type} tracks in new stream`);
        }

        const newTrack = newStream.getTracks()[0];
        if (!newTrack) {
          throw new Error(`No ${type} track found`);
        }

        const oldTracks =
          type === "video"
            ? mediasoup.localStream.getVideoTracks()
            : mediasoup.localStream.getAudioTracks();

        if (oldTracks.length > 0) {
          const oldTrack = oldTracks[0];

          if (oldTrack) {
            mediasoup.localStream.removeTrack(oldTrack);
            mediasoup.localStream.addTrack(newTrack);
            oldTrack.stop();

            if (mediasoup.device && mediasoup.device.loaded) {
              console.log(
                `[Call] Device is loaded, attempting to replace ${type} track`
              );
            }

            console.log(`[Call] Successfully switched ${type} device`);
          }
        } else {
          mediasoup.localStream.addTrack(newTrack);
          console.log(`[Call] Added new ${type} track to stream`);
        }

        mediasoup.setLocalStream(mediasoup.localStream);
      } catch (error) {
        console.error(`[Call] Error switching ${type} device:`, error);
        alert(`Failed to switch ${type} device. Please try again.`);
      }
    },
    [
      state.joined,
      mediasoup.localStream,
      mediasoup.device,
      mediasoup.setLocalStream,
      dispatch,
    ]
  );

  return {
    videoDevices: state.videoDevices,
    audioDevices: state.audioDevices,
    selectedVideo: state.selectedVideo,
    selectedAudio: state.selectedAudio,
    handleDeviceChange,
  };
};
