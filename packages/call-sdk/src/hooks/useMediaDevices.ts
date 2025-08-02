import { useState, useEffect, useCallback } from "react";

export interface MediaDeviceState {
  audioInputDevices: MediaDeviceInfo[];
  audioOutputDevices: MediaDeviceInfo[];
  videoInputDevices: MediaDeviceInfo[];
  selectedAudioInput: string | null;
  selectedAudioOutput: string | null;
  selectedVideoInput: string | null;
  hasAudioPermission: boolean;
  hasVideoPermission: boolean;
  isLoading: boolean;
  error: Error | null;
}

const initialState: MediaDeviceState = {
  audioInputDevices: [],
  audioOutputDevices: [],
  videoInputDevices: [],
  selectedAudioInput: null,
  selectedAudioOutput: null,
  selectedVideoInput: null,
  hasAudioPermission: false,
  hasVideoPermission: false,
  isLoading: true,
  error: null,
};

export function useMediaDevices() {
  const [state, setState] = useState<MediaDeviceState>(initialState);

  const updateDevices = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter(
        (device) => device.kind === "audioinput"
      );
      const audioOutputs = devices.filter(
        (device) => device.kind === "audiooutput"
      );
      const videoInputs = devices.filter(
        (device) => device.kind === "videoinput"
      );

      setState((prev) => ({
        ...prev,
        audioInputDevices: audioInputs,
        audioOutputDevices: audioOutputs,
        videoInputDevices: videoInputs,
        selectedAudioInput:
          prev.selectedAudioInput || audioInputs[0]?.deviceId || null,
        selectedAudioOutput:
          prev.selectedAudioOutput || audioOutputs[0]?.deviceId || null,
        selectedVideoInput:
          prev.selectedVideoInput || videoInputs[0]?.deviceId || null,
        isLoading: false,
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error as Error,
      }));
    }
  }, []);

  const checkPermissions = useCallback(async () => {
    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      audioStream.getTracks().forEach((track) => track.stop());
      const videoStream = await navigator.mediaDevices.getUserMedia({
        video: true,
      });
      videoStream.getTracks().forEach((track) => track.stop());

      setState((prev) => ({
        ...prev,
        hasAudioPermission: true,
        hasVideoPermission: true,
      }));
    } catch (error) {
      const permissionError = error as Error;
      setState((prev) => ({
        ...prev,
        hasAudioPermission: !permissionError.message.includes("audio"),
        hasVideoPermission: !permissionError.message.includes("video"),
      }));
    }
  }, []);

  useEffect(() => {
    checkPermissions();
    updateDevices();

    // Listen for device changes
    navigator.mediaDevices.addEventListener("devicechange", updateDevices);

    return () => {
      navigator.mediaDevices.removeEventListener("devicechange", updateDevices);
    };
  }, [checkPermissions, updateDevices]);

  const setAudioInput = useCallback(async (deviceId: string) => {
    try {
      // Test if we can access the device
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { deviceId: { exact: deviceId } },
      });
      stream.getTracks().forEach((track) => track.stop());

      setState((prev) => ({
        ...prev,
        selectedAudioInput: deviceId,
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error as Error,
      }));
      throw error;
    }
  }, []);

  const setAudioOutput = useCallback((deviceId: string) => {
    setState((prev) => ({
      ...prev,
      selectedAudioOutput: deviceId,
    }));
  }, []);

  const setVideoInput = useCallback(async (deviceId: string) => {
    try {
      // Test if we can access the device
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: deviceId } },
      });
      stream.getTracks().forEach((track) => track.stop());

      setState((prev) => ({
        ...prev,
        selectedVideoInput: deviceId,
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error as Error,
      }));
      throw error;
    }
  }, []);

  const requestPermissions = useCallback(async () => {
    await checkPermissions();
    await updateDevices();
  }, [checkPermissions, updateDevices]);

  return {
    ...state,
    setAudioInput,
    setAudioOutput,
    setVideoInput,
    refreshDevices: updateDevices,
    requestPermissions,
  };
}
