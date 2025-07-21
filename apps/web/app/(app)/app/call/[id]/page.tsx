"use client";

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@call/ui/components/card";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
} from "lucide-react";
import { Button } from "@call/ui/components/button";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export default function CallRoomPage() {
  const params = useParams();
  const callId = params?.id;
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [microphones, setMicrophones] = useState<MediaDeviceInfo[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string | null>(null);
  const [selectedMic, setSelectedMic] = useState<string | null>(null);

  const getDevices = async () => {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const cams = devices.filter((d) => d.kind === "videoinput");
    const mics = devices.filter((d) => d.kind === "audioinput");
    setCameras(cams);
    setMicrophones(mics);
   if (!selectedCamera && cams.length > 0) {
    const [defaultCam] = cams;
    if (defaultCam) setSelectedCamera(defaultCam.deviceId);
    }
    if (!selectedMic && mics.length > 0) {
      const [defaultMic] = mics;
    if (defaultMic) setSelectedMic(defaultMic.deviceId);
  }
  }
  const startStream = async (cameraId?: string, micId?: string) => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: cameraId ? { deviceId: { exact: cameraId } } : true,
        audio: micId ? { deviceId: { exact: micId } } : true,
      });

      // Stop old tracks
      stream?.getTracks().forEach((track) => track.stop());

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error("Error getting media:", err);
    }
  };

  useEffect(() => {
    getDevices();
  }, []);

  useEffect(() => {
    if (selectedCamera && selectedMic) {
      startStream(selectedCamera, selectedMic);
    }
  }, [selectedCamera, selectedMic]);

  const handleToggleCamera = () => {
    if (!stream) return;
    const videoTrack = stream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setIsCameraOn(videoTrack.enabled);
    }
  };

  const handleToggleMic = () => {
    if (!stream) return;
    const audioTrack = stream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsMicOn(audioTrack.enabled);
    }
  };

  const handleJoin = () => {
    console.log("Join call logic here");
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Call Room</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground mb-2">Call ID: {callId}</div>
          <div className="text-lg mb-4">
            You have created a call. Share the link to invite others.
          </div>

          {/* Video Preview */}
          <div className="w-full aspect-video bg-black rounded overflow-hidden mb-4">
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
            />
          </div>

          {/* Device Selectors */}
          <div className="mb-4">
            <label className="block mb-1 text-sm">Camera</label>
            <select
              className="w-full p-2 rounded bg-muted border"
              value={selectedCamera ?? ""}
              onChange={(e) => setSelectedCamera(e.target.value)}
            >
              {cameras.map((cam) => (
                <option key={cam.deviceId} value={cam.deviceId}>
                  {cam.label || `Camera ${cam.deviceId.slice(0, 5)}`}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-4">
            <label className="block mb-1 text-sm">Microphone</label>
            <select
              className="w-full p-2 rounded bg-muted border"
              value={selectedMic ?? ""}
              onChange={(e) => setSelectedMic(e.target.value)}
            >
              {microphones.map((mic) => (
                <option key={mic.deviceId} value={mic.deviceId}>
                  {mic.label || `Mic ${mic.deviceId.slice(0, 5)}`}
                </option>
              ))}
            </select>
          </div>

          {/* Toggle Buttons */}
          <div className="flex gap-4 justify-center mb-4">
            <Button
              variant={isCameraOn ? "default" : "outline"}
              onClick={handleToggleCamera}
            >
              {isCameraOn ? <Video/> : <VideoOff />}
            </Button>
            <Button
              variant={isMicOn ? "default" : "outline"}
              onClick={handleToggleMic}
            >
              {isMicOn ? <Mic/> : <MicOff/>}
            </Button>
          </div>

          {/* Join Button */}
          <Button onClick={handleJoin} disabled={!stream}>
            Join
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
