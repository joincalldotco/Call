import { useState, useEffect, useCallback } from "react";
import type { DeviceInfo } from "./types";

export function useDevices() {
  const [videoDevices, setVideoDevices] = useState<DeviceInfo[]>([]);
  const [audioDevices, setAudioDevices] = useState<DeviceInfo[]>([]);
  const [selectedVideoDevice, setSelectedVideoDevice] = useState<string>("");
  const [selectedAudioDevice, setSelectedAudioDevice] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  const loadDevices = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Get user media to request permissions and get device labels.
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      // Stop tracks immediately, we just needed them for permissions.
      stream.getTracks().forEach(track => track.stop());

      const devices = await navigator.mediaDevices.enumerateDevices();

      const videoInputs = devices
        .filter((d) => d.kind === "videoinput")
        .map((d) => ({
          deviceId: d.deviceId,
          label: d.label || `Camera ${d.deviceId.slice(0, 5)}`,
          kind: "videoinput" as const,
        }));

      const audioInputs = devices
        .filter((d) => d.kind === "audioinput")
        .map((d) => ({
          deviceId: d.deviceId,
          label: d.label || `Microphone ${d.deviceId.slice(0, 5)}`,
          kind: "audioinput" as const,
        }));

      setVideoDevices(videoInputs);
      setAudioDevices(audioInputs);

      if (videoInputs.length > 0 && !selectedVideoDevice) {
        setSelectedVideoDevice(videoInputs[0]!.deviceId);
      }
      if (audioInputs.length > 0 && !selectedAudioDevice) {
        setSelectedAudioDevice(audioInputs[0]!.deviceId);
      }
    } catch (error) {
      console.error("Error loading devices:", error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedAudioDevice, selectedVideoDevice]);

  useEffect(() => {
    loadDevices();
    navigator.mediaDevices.addEventListener("devicechange", loadDevices);
    return () => {
      navigator.mediaDevices.removeEventListener("devicechange", loadDevices);
    };
  }, [loadDevices]);

  const selectVideoDevice = useCallback(async (deviceId: string) => {
    setSelectedVideoDevice(deviceId);
  }, []);

  const selectAudioDevice = useCallback(async (deviceId: string) => {
    setSelectedAudioDevice(deviceId);
  }, []);

  const getStreamWithDevices = useCallback(async () => {
    const constraints: MediaStreamConstraints = {
      video: selectedVideoDevice
        ? { deviceId: { exact: selectedVideoDevice } }
        : true,
      audio: selectedAudioDevice
        ? {
            deviceId: { exact: selectedAudioDevice },
            echoCancellation: true,
            noiseSuppression: true,
          }
        : true,
    };

    return navigator.mediaDevices.getUserMedia(constraints);
  }, [selectedVideoDevice, selectedAudioDevice]);

  return {
    videoDevices,
    audioDevices,
    selectedVideoDevice,
    selectedAudioDevice,
    selectVideoDevice,
    selectAudioDevice,
    getStreamWithDevices,
    isLoading,
  };
}
