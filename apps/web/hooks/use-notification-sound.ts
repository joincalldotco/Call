import { useCallback, useRef } from "react";

type NotificationSound =
  | "call-started"
  | "call-ended"
  | "call-joined"
  | "call-left"
  | "request-joined";

const sounds: Record<NotificationSound, string> = {
  "call-started": "/sounds/call-started.mp3",
  "call-ended": "/sounds/call-ended.mp3",
  "call-joined": "/sounds/call-joined.mp3",
  "call-left": "/sounds/call-left.mp3",
  "request-joined": "/sounds/sonnette.mp3",
};

export const useNotificationSound = (sound: NotificationSound) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playNotificationSound = useCallback(() => {
    try {
      if (!audioRef.current) {
        audioRef.current = new Audio(sounds[sound]);
        audioRef.current.volume = 1;
      }

      audioRef.current.play().catch((error) => {
        console.error("Failed to play notification sound:", error);
      });
    } catch (error) {
      console.error("Error playing notification sound:", error);
    }
  }, []);

  return { playNotificationSound };
};
