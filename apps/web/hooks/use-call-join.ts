"use client";

import { useCallContext } from "@/contexts/call-context";
import { useCallback } from "react";

export const useCallJoin = () => {
  const { state, dispatch, mediasoup } = useCallContext();

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
      alert("Not connected to server");
      return;
    }

    try {
      console.log("[Call] Starting join process...");

      const joinRes = await mediasoup.joinRoom(state.callId);
      console.log("[Call] Join response:", joinRes);

      const rtpCapabilities = joinRes.rtpCapabilities;
      if (!rtpCapabilities) {
        alert("No RTP capabilities received from the router");
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
          alert(
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

        stream.getTracks().forEach((track) => {
          track.enabled = true;
          console.log(`[Call] Enabled ${track.kind} track:`, track.id);
        });
      } catch (err) {
        alert("Error accessing camera/microphone. Check permissions.");
        console.error("Error getUserMedia:", err);
        return;
      }

      console.log("[Call] Starting production...");
      const myProducers = await mediasoup.produce(stream);
      console.log("[Call] Production result:", myProducers);

      if (!myProducers || !myProducers.length) {
        alert("Could not produce audio/video. Check console for more details.");
        console.error("Empty producers:", myProducers);
        return;
      }

      dispatch({
        type: "SET_MY_PRODUCER_IDS",
        payload: myProducers.map((p: any) => p.id),
      });
      dispatch({ type: "SET_JOINED", payload: true });
      console.log(
        "[Call] Successfully joined with producers:",
        myProducers.map((p) => p.id)
      );

      await recordCallParticipation(state.callId);
    } catch (error) {
      console.error("Error joining call:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      alert(`Failed to join call: ${errorMessage}`);
    }
  }, [state, mediasoup, dispatch]);

  return { handleJoin };
};
