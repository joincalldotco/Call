"use client";

import { useCallContext } from "@/contexts/call-context";
import { useCallback } from "react";
import { toast } from "sonner";
import { useSidebar } from "@call/ui/components/sidebar";
export const useCallJoin = () => {
  const { state, dispatch, mediasoup, session } = useCallContext();
  const { open, setOpen } = useSidebar();

  const recordCallParticipation = async (callId: string) => {
    try {
      await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/calls/record-participation`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({ callId }),
        }
      );
    } catch (error) {
      console.error("Error recording call participation:", error);
    }
  };

  const handleJoin = useCallback(async () => {
    if (!state.callId || !mediasoup.connected) {
      return;
    }

    try {
      console.log("[Call] Starting join process...");

      const joinRes = await mediasoup.joinRoom(state.callId);
      console.log("[Call] Join response:", joinRes);

      const rtpCapabilities = joinRes.rtpCapabilities;
      if (!rtpCapabilities) {
        return;
      }
      dispatch({ type: "SET_PRODUCERS", payload: joinRes.producers || [] });
      console.log("[Call] Joined room with producers:", joinRes.producers);
      console.log("[Call] Peers in room:", joinRes.peers);

      await mediasoup.loadDevice(rtpCapabilities);

      await mediasoup.createSendTransport();
      await mediasoup.createRecvTransport();
      dispatch({ type: "SET_RECV_TRANSPORT_READY", payload: true });

      let stream: MediaStream;
      try {
        if (state.previewStream) {
          console.log(
            "[Call] Stopping preview stream before getting call stream"
          );
          state.previewStream.getTracks().forEach((track) => track.stop());
          dispatch({ type: "SET_PREVIEW_STREAM", payload: null });
        }

        const constraints: MediaStreamConstraints = {
          video: state.selectedVideo
            ? { deviceId: { exact: state.selectedVideo } }
            : true,
          audio: state.selectedAudio
            ? { deviceId: { exact: state.selectedAudio } }
            : { echoCancellation: true, noiseSuppression: true },
        };

        console.log(
          "[Call] Getting fresh media stream with constraints:",
          constraints
        );
        stream = await navigator.mediaDevices.getUserMedia(constraints);

        if (!stream || !stream.getTracks().length) {
          toast.error(
            "No audio/video tracks detected. Check permissions and devices."
          );
          console.error("Empty local stream:", stream);
          return;
        }

        console.log(
          "[Call] Got stream with tracks:",
          stream.getTracks().map((t) => ({
            kind: t.kind,
            enabled: t.enabled,
            readyState: t.readyState,
            id: t.id,
          }))
        );

        const audioTrack = stream.getAudioTracks()[0];
        if (audioTrack) {
          audioTrack.enabled = state.isLocalMicOn;
          console.log(
            `[Call] Set audio track enabled=${audioTrack.enabled}:`,
            audioTrack.id
          );
        }
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
          videoTrack.enabled = state.isLocalCameraOn;
          console.log(
            `[Call] Set video track enabled=${videoTrack.enabled}:`,
            videoTrack.id
          );
        }
      } catch (err) {
        console.error("Error getUserMedia:", err);
        return;
      }

      console.log("[Call] Starting production...");
      const myProducers = await mediasoup.produce(stream);
      console.log("[Call] Production result:", myProducers);

      if (!myProducers || !myProducers.length) {
        console.error("Empty producers:", myProducers);
        return;
      }

      dispatch({
        type: "SET_MY_PRODUCER_IDS",
        payload: myProducers.map((p: any) => p.id),
      });
      dispatch({
        type: "SET_MY_PRODUCERS",
        payload: myProducers.map((p: any) => ({
          id: p.id,
          kind: p.kind,
          source: p.appData?.source || "unknown"
        })),
      });
      dispatch({ type: "SET_JOINED", payload: true });
      console.log(
        "[Call] Successfully joined with producers:",
        myProducers.map((p) => p.id)
      );

      if (session?.user?.id && session.user.id !== "guest") {
        await recordCallParticipation(state.callId);
      }
    } catch (error) {
      console.error("Error joining call:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      toast.error(`Failed to join call: ${errorMessage}`);
    }
    if (open) {
      setOpen(false);
    }
  }, [state, mediasoup, dispatch, open, setOpen]);

  return { handleJoin };
};
