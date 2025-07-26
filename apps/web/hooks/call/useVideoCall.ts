import { useCallback, useEffect, useState, useRef } from "react";
import { useMediasoupClient } from "@/hooks/useMediasoupClient";
import { useDevices } from "./useDevices";
import { useMediaControls } from "./useMediaControls";
import { useScreenShare } from "./useScreenShare";
import { useAccessControl } from "./useAccessControl";
import { useParticipants } from "./useParticipants";
import type {
  CallStatus,
  UseVideoCallOptions,
  VideoStream,
  CallError,
  Participant,
} from "./types";
import { Device } from "mediasoup-client";

export function useVideoCall(options: UseVideoCallOptions): any {
  const { callId, userId, displayName, onError, onParticipantLeft } = options;

  const [status, setStatus] = useState<CallStatus>("idle");
  const [error, setError] = useState<CallError | null>(null);
  const [videoStreams, setVideoStreams] = useState<VideoStream[]>([]);
  const deviceRef = useRef<Device | null>(null);
  const participantsHook = useParticipants();
  const mediasoup = useMediasoupClient();
  const devices = useDevices();
  const mediaControls = useMediaControls();
  const screenShare = useScreenShare();
  const access = useAccessControl(callId);

  const hasJoinedRef = useRef(false);

  const onParticipantJoined = (participant: Participant) => {
    participantsHook.addParticipant(participant);
  };

  useEffect(() => {
    if (
      status === "idle" &&
      devices.selectedVideoDevice &&
      devices.selectedAudioDevice
    ) {
      setStatus("preview");
      initializePreview();
    }
  }, [devices.selectedVideoDevice, devices.selectedAudioDevice, status]);

  const initializePreview = async () => {
    try {
      const stream = await devices.getStreamWithDevices();
      mediaControls.setLocalStream(stream);
      setStatus("preview");
    } catch (err) {
      handleError({
        code: "MEDIA_ACCESS_ERROR",
        message: "Failed to access camera/microphone",
        details: err,
      });
    }
  };

  const handleError = (error: CallError) => {
    setError(error);
    setStatus("error");
    if (onError) {
      onError(error);
    }
  };

  const join = async () => {
    if (hasJoinedRef.current || !mediasoup.connected || !userId) {
      handleError({
        code: "JOIN_ERROR",
        message:
          "Cannot join the call. You must be logged in and connected to the server.",
      });
      return;
    }

    try {
      setStatus("connecting");

      const joinResponse = await mediasoup.joinRoom(callId);
      console.log("[useVideoCall] Joining room...", joinResponse);

      // if (joinResponse.error) {
      //   throw new Error(joinResponse.error);
      // }

      if (!joinResponse.rtpCapabilities) {
        throw new Error("Invalid rtpCapabilities from server.");
      }

      if (!deviceRef.current || !deviceRef.current.loaded) {
        console.log("[useVideoCall] Loading device...");
        const device = await mediasoup.loadDevice(joinResponse.rtpCapabilities);
        deviceRef.current = device;
        console.log("[useVideoCall] Device loaded ", device);
      }

      // console.log("[useVideoCall] Device:: ", mediasoup.device);

      if (!deviceRef.current) {
        throw new Error("Mediasoup device not loaded");
      }

      hasJoinedRef.current = true;

      const stream = await devices.getStreamWithDevices();
      mediaControls.setLocalStream(stream);

      await mediasoup.createSendTransport();
      await mediasoup.createRecvTransport();

      const producers = await mediasoup.produce(stream);
      if (!producers || producers.length === 0) {
        throw new Error("Failed to produce media");
      }

      const audioProducer = producers.find((p) => p.track?.kind === "audio");
      const videoProducer = producers.find((p) => p.track?.kind === "video");
      mediaControls.setProducerIds(
        audioProducer?.id || null,
        videoProducer?.id || null
      );

      participantsHook.updateFromPeers(joinResponse.peers);

      for (const producer of joinResponse.producers) {
        if (producer.peerId !== mediasoup.userId) {
          await mediasoup.consume(
            producer.id,
            deviceRef.current!.rtpCapabilities,
            undefined,
            producer.muted
          );
        }
      }

      setStatus("connected");
      await recordCallParticipation(callId);
    } catch (err) {
      hasJoinedRef.current = false;
      handleError({
        code: "JOIN_ERROR",
        message: "Failed to join call",
        details: err,
      });
    }
  };

  const leave = async () => {
    if (!hasJoinedRef.current) return;

    try {
      await recordCallLeave(callId);
      await screenShare.stopSharing();
      mediaControls.cleanup();
      hasJoinedRef.current = false;
      setStatus("idle");
      window.location.href = "/app/call";
    } catch (err) {
      console.error("Error leaving call:", err);
    }
  };

  const handleDeviceChange = async (
    type: "video" | "audio",
    deviceId: string
  ) => {
    if (type === "video") {
      devices.selectVideoDevice(deviceId);
    } else {
      devices.selectAudioDevice(deviceId);
    }

    const newStream = await devices.getStreamWithDevices();
    const newTrack = newStream.getTracks()[0];

    if (newTrack) {
      mediaControls.replaceTrack(newTrack);
    }
  };

  useEffect(() => {
    const newStreams: VideoStream[] = mediasoup.remoteStreams.map((rs) => ({
      id: rs.producerId,
      stream: rs.stream,
      participantId: rs.peerId,
      type: rs.source === "screen" ? "screen" : "camera",
      displayName: rs.displayName,
    }));
    setVideoStreams(newStreams);
  }, [mediasoup.remoteStreams]);

  useEffect(() => {
    if (mediasoup.peers) {
      participantsHook.updateFromPeers(mediasoup.peers);
    }
  }, [mediasoup.peers]);

  useEffect(() => {
    return () => {
      if (hasJoinedRef.current) {
        leave();
      }
    };
  }, []);

  return {
    status,
    error,
    localStream: mediaControls.localStream,
    videoStreams,
    participants: participantsHook.list,
    join,
    leave,
    devices,
    media: mediaControls,
    screenShare,
    access,
    canJoin: access.hasAccess && status === "preview",
    onParticipantJoined,
    onParticipantLeft,
    handleDeviceChange,
  };
}

async function recordCallParticipation(callId: string) {
  try {
    await fetch(`/api/calls/record-participation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ callId }),
    });
  } catch (error) {
    console.error("Error recording participation:", error);
  }
}

async function recordCallLeave(callId: string) {
  try {
    await fetch(`/api/calls/record-leave`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ callId }),
    });
  } catch (error) {
    console.error("Error recording leave:", error);
  }
}
