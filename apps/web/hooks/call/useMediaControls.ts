import { useState, useCallback, useRef, useEffect } from "react";
import { useMediasoupClient } from "@/hooks/useMediasoupClient";

export function useMediaControls() {
  const mediasoup = useMediasoupClient();
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const audioProducerIdRef = useRef<string | null>(null);
  const videoProducerIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (mediasoup.localStream) {
      setLocalStream(mediasoup.localStream);
    }
  }, [mediasoup.localStream]);

  const toggleMic = useCallback(() => {
    if (!localStream) return;

    const audioTrack = localStream.getAudioTracks()[0];
    if (audioTrack) {
      const newState = !audioTrack.enabled;
      audioTrack.enabled = newState;
      setIsMicOn(newState);

      if (audioProducerIdRef.current) {
        mediasoup.setProducerMuted(audioProducerIdRef.current, !newState);
      }
    }
  }, [localStream, mediasoup]);

  const toggleCamera = useCallback(() => {
    if (!localStream) return;

    const videoTrack = localStream.getVideoTracks()[0];
    if (videoTrack) {
      const newState = !videoTrack.enabled;
      videoTrack.enabled = newState;
      setIsCameraOn(newState);
    }
  }, [localStream]);

  const setMicEnabled = useCallback(
    (enabled: boolean) => {
      if (!localStream) return;

      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = enabled;
        setIsMicOn(enabled);

        if (audioProducerIdRef.current) {
          mediasoup.setProducerMuted(audioProducerIdRef.current, !enabled);
        }
      }
    },
    [localStream, mediasoup]
  );

  const setCameraEnabled = useCallback(
    (enabled: boolean) => {
      if (!localStream) return;

      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = enabled;
        setIsCameraOn(enabled);
      }
    },
    [localStream]
  );

  const replaceTrack = useCallback(async (track: MediaStreamTrack) => {
    if (track.kind === 'video' && videoProducerIdRef.current) {
      const videoProducer = mediasoup.producers.find(p => p.id === videoProducerIdRef.current);
      if (videoProducer) {
        await videoProducer.replaceTrack({ track });
      }
    } else if (track.kind === 'audio' && audioProducerIdRef.current) {
      const audioProducer = mediasoup.producers.find(p => p.id === audioProducerIdRef.current);
      if (audioProducer) {
        await audioProducer.replaceTrack({ track });
      }
    }
  }, [mediasoup.producers]);

  const cleanup = useCallback(() => {
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
      setLocalStream(null);
    }
    setIsMicOn(true);
    setIsCameraOn(true);
  }, [localStream]);

  const setProducerIds = useCallback(
    (audioId: string | null, videoId: string | null) => {
      audioProducerIdRef.current = audioId;
      videoProducerIdRef.current = videoId;
    },
    []
  );

  return {
    localStream,
    setLocalStream,
    isMicOn,
    isCameraOn,
    toggleMic,
    toggleCamera,
    setMicEnabled,
    setCameraEnabled,
    cleanup,
    setProducerIds,
    replaceTrack,
  };
}