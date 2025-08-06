"use client";

import { useCallback, useRef } from "react";
import { useCallContext } from "@/contexts/call-context";

export const useCallMediaControls = () => {
  const { state, dispatch, mediasoup } = useCallContext();
  const screenProducerRef = useRef<any>(null);

  const toggleCamera = useCallback(() => {
    if (mediasoup.localStream) {
      const videoTrack = mediasoup.localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
      }
    }
  }, [mediasoup.localStream]);

  const toggleMic = useCallback(() => {
    if (mediasoup.localStream) {
      const audioTrack = mediasoup.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        dispatch({ type: "SET_LOCAL_MIC_ON", payload: audioTrack.enabled });
      }
    }
  }, [mediasoup.localStream, dispatch]);

  const handleToggleScreenShare = useCallback(async () => {
    try {
      if (state.screenStream) {
        if (
          screenProducerRef.current &&
          mediasoup.socket?.readyState === WebSocket.OPEN
        ) {
          const producerId = screenProducerRef.current.id;
          mediasoup.socket.send(
            JSON.stringify({
              type: "closeProducer",
              producerId: producerId,
              reqId: crypto.randomUUID(),
            })
          );
          dispatch({
            type: "SET_MY_PRODUCER_IDS",
            payload: state.myProducerIds.filter((id) => id !== producerId),
          });
          screenProducerRef.current = null;
        }

        const stream: MediaStream = state.screenStream;
        stream.getTracks().forEach((track: MediaStreamTrack) => {
          track.stop();
          track.enabled = false;
        });
        dispatch({ type: "SET_SCREEN_STREAM", payload: null });
        dispatch({ type: "SET_SCREEN_SHARING", payload: false });
      } else {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: false,
        });

        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
          videoTrack.onended = () => {
            const currentStream = state.screenStream;
            if (currentStream) {
              if (
                screenProducerRef.current &&
                mediasoup.socket?.readyState === WebSocket.OPEN
              ) {
                const producerId = screenProducerRef.current.id;
                mediasoup.socket.send(
                  JSON.stringify({
                    type: "closeProducer",
                    producerId: producerId,
                    reqId: crypto.randomUUID(),
                  })
                );
                dispatch({
                  type: "SET_MY_PRODUCER_IDS",
                  payload: state.myProducerIds.filter(
                    (id) => id !== producerId
                  ),
                });
                screenProducerRef.current = null;
              }

              const stream: MediaStream = currentStream;
              stream.getTracks().forEach((track: MediaStreamTrack) => {
                track.stop();
                track.enabled = false;
              });
              dispatch({ type: "SET_SCREEN_STREAM", payload: null });
              dispatch({ type: "SET_SCREEN_SHARING", payload: false });
            }
          };
        }

        dispatch({ type: "SET_SCREEN_STREAM", payload: stream });
        dispatch({ type: "SET_SCREEN_SHARING", payload: true });

        if (state.joined && mediasoup.socket?.readyState === WebSocket.OPEN) {
          try {
            const producers = await mediasoup.produce(stream, {
              source: "screen",
            });
            const firstProducer = producers?.[0];
            if (
              producers &&
              producers.length > 0 &&
              firstProducer &&
              "id" in firstProducer
            ) {
              screenProducerRef.current = firstProducer;
              dispatch({
                type: "SET_MY_PRODUCER_IDS",
                payload: [...state.myProducerIds, firstProducer.id],
              });
            }
          } catch (error) {
            console.error("Error producing screen share:", error);
            stream.getTracks().forEach((track) => track.stop());
            dispatch({ type: "SET_SCREEN_STREAM", payload: null });
            dispatch({ type: "SET_SCREEN_SHARING", payload: false });
          }
        }
      }
    } catch (err) {
      console.error("Error toggling screen share:", err);
      dispatch({ type: "SET_SCREEN_SHARING", payload: false });
      dispatch({ type: "SET_SCREEN_STREAM", payload: null });
    }
  }, [
    state.screenStream,
    state.joined,
    state.myProducerIds,
    mediasoup,
    dispatch,
  ]);

  const handleHangup = useCallback(async () => {
    try {
      await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/calls/record-leave`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({ callId: state.callId }),
        }
      );
    } catch (error) {
      console.error("Failed to record call leave:", error);
    }

    if (state.screenStream) {
      state.screenStream.getTracks().forEach((track) => {
        track.stop();
        track.enabled = false;
      });
      dispatch({ type: "SET_SCREEN_STREAM", payload: null });
      dispatch({ type: "SET_SCREEN_SHARING", payload: false });
    }

    if (
      screenProducerRef.current &&
      mediasoup.socket?.readyState === WebSocket.OPEN
    ) {
      mediasoup.socket.send(
        JSON.stringify({
          type: "closeProducer",
          producerId: screenProducerRef.current.id,
        })
      );
      screenProducerRef.current = null;
    }

    dispatch({ type: "SET_REMOTE_AUDIOS", payload: [] });

    dispatch({ type: "SET_MY_PRODUCER_IDS", payload: [] });

    dispatch({ type: "SET_JOINED", payload: false });

    window.location.href = "/app/call";
  }, [state.screenStream, state.callId, mediasoup.socket, dispatch]);

  return {
    toggleCamera,
    toggleMic,
    handleToggleScreenShare,
    handleHangup,
    isScreenSharing: state.isScreenSharing,
    isMicOn: state.isLocalMicOn,
  };
};
