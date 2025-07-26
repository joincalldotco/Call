import { useState, useCallback, useRef } from "react";
import { useMediasoupClient } from "@/hooks/useMediasoupClient";

export function useScreenShare() {
  const mediasoup = useMediasoupClient();
  const [isSharing, setIsSharing] = useState(false);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const screenProducerRef = useRef<any>(null);

  const startSharing = useCallback(async () => {
    if (isSharing || !mediasoup.connected) return;

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });

      // Handle when user stops sharing via browser UI
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.onended = () => {
          stopSharing();
        };
      }

      setScreenStream(stream);
      setIsSharing(true);

      // Produce screen share
      const producers = await mediasoup.produce(stream, { source: "screen" });
      if (producers && producers.length > 0) {
        screenProducerRef.current = producers[0];
      }

      return stream;
    } catch (error) {
      console.error("Error starting screen share:", error);
      throw error;
    }
  }, [isSharing, mediasoup]);

  const stopSharing = useCallback(() => {
    if (!isSharing) return;

    // Close producer
    if (
      screenProducerRef.current &&
      mediasoup.socket?.readyState === WebSocket.OPEN
    ) {
      mediasoup.socket.send(
        JSON.stringify({
          type: "closeProducer",
          producerId: screenProducerRef.current.id,
          reqId: crypto.randomUUID(),
        })
      );
      screenProducerRef.current = null;
    }

    // Stop stream
    if (screenStream) {
      screenStream.getTracks().forEach((track) => {
        track.stop();
        track.enabled = false;
      });
      setScreenStream(null);
    }

    setIsSharing(false);
  }, [isSharing, screenStream, mediasoup]);

  return {
    isSharing,
    screenStream,
    startSharing,
    stopSharing,
  };
}
