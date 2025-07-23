"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { useMediasoupClient } from "@/hooks/useMediasoupClient";

function generateUserId() {
  if (typeof window !== "undefined") {
    let id = localStorage.getItem("user-id");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("user-id", id);
    }
    return id;
  }
  return "";
}

function generateDisplayName() {
  if (typeof window !== "undefined") {
    let name = localStorage.getItem("display-name");
    if (!name) {
      name = `User-${Math.random().toString(36).slice(2, 8)}`;
      localStorage.setItem("display-name", name);
    }
    return name;
  }
  return "Anonymous";
}

const MediaControls = ({
  localStream,
  joined,
  onHangup,
  isScreenSharing,
  onToggleScreenShare,
}: {
  localStream: MediaStream | null;
  joined: boolean;
  onHangup: () => void;
  isScreenSharing: boolean;
  onToggleScreenShare: () => void;
}) => {
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);

  // Update states when localStream changes
  useEffect(() => {
    if (localStream) {
      const videoTracks = localStream.getVideoTracks();
      const audioTracks = localStream.getAudioTracks();

      if (videoTracks.length > 0) {
        setIsCameraOn(videoTracks[0]!.enabled);
      }
      if (audioTracks.length > 0) {
        setIsMicOn(audioTracks[0]!.enabled);
      }
    }
  }, [localStream]);

  const toggleCamera = () => {
    if (localStream) {
      const videoTracks = localStream.getVideoTracks();
      videoTracks.forEach((track) => {
        track.enabled = !isCameraOn;
        console.log(`[MediaControls] Video track enabled: ${track.enabled}`);
      });
      setIsCameraOn((prev) => !prev);
    }
  };

  const toggleMic = () => {
    if (localStream) {
      const audioTracks = localStream.getAudioTracks();
      audioTracks.forEach((track) => {
        track.enabled = !isMicOn;
        console.log(`[MediaControls] Audio track enabled: ${track.enabled}`);
      });
      setIsMicOn((prev) => !prev);
    }
  };

  return (
    <div className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 gap-4 rounded-lg">
      <button
        className={`rounded px-4 py-2 ${isCameraOn ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-800"}`}
        onClick={toggleCamera}
      >
        {isCameraOn ? "Turn off camera" : "Turn on camera"}
      </button>
      <button
        className={`rounded px-4 py-2 ${isMicOn ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-800"}`}
        onClick={toggleMic}
      >
        {isMicOn ? "Turn off microphone" : "Turn on microphone"}
      </button>
      <button
        className={`rounded px-4 py-2 ${isScreenSharing ? "bg-green-600 text-white" : "bg-gray-200 text-gray-800"}`}
        onClick={onToggleScreenShare}
      >
        {isScreenSharing ? "Stop sharing" : "Share screen"}
      </button>
      <button
        className="rounded bg-red-600 px-4 py-2 text-white"
        onClick={onHangup}
      >
        Hang up
      </button>
    </div>
  );
};

interface RemoteStream {
  id: string;
  stream: MediaStream;
  peerId: string;
  userId?: string; // For backward compatibility
  kind: "audio" | "video";
  source: "mic" | "webcam" | "screen";
  displayName: string;
  producerId?: string;
}

export default function CallPreviewPage() {
  const params = useParams();
  const callId = params?.id as string;
  const userId = generateUserId();
  const displayName = generateDisplayName();
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<string | undefined>();
  const [selectedAudio, setSelectedAudio] = useState<string | undefined>();
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);
  const [joined, setJoined] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const screenProducerRef = useRef<any>(null);

  // Mediasoup hooks with cleanupAll
  const {
    joinRoom,
    loadDevice,
    createSendTransport,
    createRecvTransport,
    produce,
    consume,
    localStream,
    remoteStreams: hookRemoteStreams,
    peers,
    connected,
    socket,
    device,
    currentRoomId,
  } = useMediasoupClient();

  // Local state for remote consumers
  const [remoteAudios, setRemoteAudios] = useState<
    { id: string; stream: MediaStream; peerId?: string; displayName?: string }[]
  >([]);
  const [recvTransportReady, setRecvTransportReady] = useState(false);
  const consumedProducers = useRef<Set<string>>(new Set());
  const [producers, setProducers] = useState<any[]>([]);
  const [myProducerIds, setMyProducerIds] = useState<string[]>([]);

  // Get available devices
  useEffect(() => {
    navigator.mediaDevices.enumerateDevices().then((devices) => {
      setVideoDevices(devices.filter((d) => d.kind === "videoinput"));
      setAudioDevices(devices.filter((d) => d.kind === "audioinput"));
    });
  }, []);

  // Get stream with the selected devices for preview
  useEffect(() => {
    let active = true;
    const getStream = async () => {
      // Don't create preview stream if already joined
      if (joined) return;

      try {
        const constraints: MediaStreamConstraints = {
          video: selectedVideo ? { deviceId: { exact: selectedVideo } } : true,
          audio: selectedAudio ? { deviceId: { exact: selectedAudio } } : true,
        };
        const s = await navigator.mediaDevices.getUserMedia(constraints);
        if (active) setPreviewStream(s);
      } catch (err) {
        console.error("Error getting preview stream:", err);
        if (active) setPreviewStream(null);
      }
    };
    getStream();
    return () => {
      active = false;
      // Don't stop preview stream here - let it be cleaned up properly
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVideo, selectedAudio, joined]);

  // Assign stream to the preview video
  useEffect(() => {
    if (videoRef.current && previewStream) {
      videoRef.current.srcObject = previewStream;
    }
  }, [previewStream]);

  // Logic to join the call
  const handleJoin = async () => {
    if (!callId || !connected) {
      alert("Not connected to server");
      return;
    }

    try {
      console.log("[Call] Starting join process...");

      // 1. Join the room in the backend
      const joinRes = await joinRoom(callId);
      console.log("[Call] Join response:", joinRes);

      // 2. Get the RTP capabilities of the remote router
      const rtpCapabilities = joinRes.rtpCapabilities;
      if (!rtpCapabilities) {
        alert("No RTP capabilities received from the router");
        return;
      }
      setProducers(joinRes.producers || []);
      console.log("[Call] Joined room with producers:", joinRes.producers);
      console.log("[Call] Peers in room:", joinRes.peers);

      // 3. Load the mediasoup device
      await loadDevice(rtpCapabilities);

      // 4. Create send and receive transports
      await createSendTransport();
      await createRecvTransport();
      setRecvTransportReady(true);

      // 5. Get a fresh stream for the call - this ensures we have clean active tracks
      let stream: MediaStream;
      try {
        // Stop preview stream first to free up the camera
        if (previewStream) {
          console.log(
            "[Call] Stopping preview stream before getting call stream"
          );
          previewStream.getTracks().forEach((track) => track.stop());
          setPreviewStream(null);
        }

        // Always get a fresh stream for the call with simple constraints
        const constraints: MediaStreamConstraints = {
          video: selectedVideo ? { deviceId: { exact: selectedVideo } } : true,
          audio: selectedAudio
            ? { deviceId: { exact: selectedAudio } }
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

        // Ensure all tracks are enabled
        stream.getTracks().forEach((track) => {
          track.enabled = true;
          console.log(`[Call] Enabled ${track.kind} track:`, track.id);
        });
      } catch (err) {
        alert("Error accessing camera/microphone. Check permissions.");
        console.error("Error getUserMedia:", err);
        return;
      }

      // 6. Produce the local stream and save the IDs - let the produce function auto-detect sources
      console.log("[Call] Starting production...");
      const myProducers = await produce(stream);
      console.log("[Call] Production result:", myProducers);

      if (!myProducers || !myProducers.length) {
        alert("Could not produce audio/video. Check console for more details.");
        console.error("Empty producers:", myProducers);
        return;
      }

      setMyProducerIds(myProducers.map((p: any) => p.id));
      setJoined(true);
      console.log(
        "[Call] Successfully joined with producers:",
        myProducers.map((p) => p.id)
      );
    } catch (error: any) {
      console.error("Error joining call:", error);
      alert(`Failed to join call: ${error.message || "Unknown error"}`);
    }
  };

  // Handle screen sharing
  const handleToggleScreenShare = async () => {
    try {
      if (screenStream) {
        // Stop screen sharing
        screenStream
          .getTracks()
          .forEach((track: MediaStreamTrack) => track.stop());
        setScreenStream(null);
        setIsScreenSharing(false);

        // Close screen share producer if exists
        if (
          screenProducerRef.current &&
          socket?.readyState === WebSocket.OPEN
        ) {
          socket.send(
            JSON.stringify({
              type: "closeProducer",
              producerId: screenProducerRef.current.id,
            })
          );
          screenProducerRef.current = null;
        }
      } else {
        // Start screen sharing
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: false,
        });

        // Handle when user stops sharing via browser UI
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
          videoTrack.onended = () => {
            if (screenStream) {
              (screenStream as MediaStream)
                .getTracks()
                .forEach((track: MediaStreamTrack) => track.stop());
            }
            setScreenStream(null);
            setIsScreenSharing(false);
            if (
              screenProducerRef.current &&
              socket?.readyState === WebSocket.OPEN
            ) {
              socket.send(
                JSON.stringify({
                  type: "closeProducer",
                  producerId: screenProducerRef.current.id,
                })
              );
              screenProducerRef.current = null;
            }
          };
        }

        setScreenStream(stream);
        setIsScreenSharing(true);

        // Produce screen sharing stream separately
        if (joined && socket?.readyState === WebSocket.OPEN) {
          const producers = await produce(stream, { source: "screen" });
          const firstProducer = producers?.[0];
          if (
            producers &&
            producers.length > 0 &&
            firstProducer &&
            "id" in firstProducer
          ) {
            screenProducerRef.current = firstProducer;
            setMyProducerIds((prev) => [...prev, firstProducer.id]);
          }
        }
      }
    } catch (err) {
      console.error("Error toggling screen share:", err);
      setIsScreenSharing(false);
      setScreenStream(null);
    }
  };

  // Consume existing producers
  useEffect(() => {
    if (!joined || !producers.length || !device || !recvTransportReady) return;

    console.log("[Call] Processing existing producers:", producers);
    console.log("[Call] Current userId:", userId);

    producers.forEach((producer) => {
      console.log(
        `[Call] Checking producer ${producer.id} from peer ${producer.peerId}`
      );

      if (
        !consumedProducers.current.has(producer.id) &&
        producer.peerId !== userId
      ) {
        console.log(`[Call] Consuming existing producer: ${producer.id}`);
        consumedProducers.current.add(producer.id);
        consume(producer.id, device.rtpCapabilities);
      } else {
        console.log(
          `[Call] Skipping producer ${producer.id}: already consumed or own producer`
        );
      }
    });
  }, [joined, producers, device, recvTransportReady, consume, userId]);

  // Listen for new producers in real-time
  useEffect(() => {
    if (!joined || !socket || !device || !recvTransportReady) return;

    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);

        // Handle new producers
        if (data.type === "newProducer" && data.id) {
          console.log("[Call] New producer message:", data);

          if (data.peerId === userId) {
            console.log("[Call] Ignoring own producer");
            return;
          }

          if (!consumedProducers.current.has(data.id)) {
            console.log(
              `[Call] Consuming new producer: ${data.id} from peer: ${data.peerId}`
            );
            consumedProducers.current.add(data.id);
            consume(data.id, device.rtpCapabilities);
          } else {
            console.log(`[Call] Producer ${data.id} already consumed`);
          }
        }

        // Handle producer closed
        if (data.type === "producerClosed") {
          console.log("[Call] Producer closed:", data);
          const producerId = data.producerId;

          setRemoteAudios((prev) => {
            const remainingAudios = prev.filter(
              (audio) => audio.id !== producerId
            );
            // Stop tracks for removed audio stream
            prev.forEach((audio) => {
              if (audio.id === producerId) {
                audio.stream.getTracks().forEach((track) => track.stop());
              }
            });
            return remainingAudios;
          });

          // Remove from consumed producers
          consumedProducers.current.delete(producerId);
        }
      } catch (err) {
        console.error("[WebSocket] Error processing message:", err);
      }
    };

    socket.addEventListener("message", handleMessage);
    return () => {
      socket.removeEventListener("message", handleMessage);
    };
  }, [joined, socket, device, recvTransportReady, consume, userId]);

  // Handle remote audio streams from hook
  useEffect(() => {
    console.log("[Call] Hook remote streams updated:", hookRemoteStreams);

    // Extract audio streams and add them to remoteAudios - check for both 'mic' and 'webcam' sources
    const audioStreams = hookRemoteStreams.filter(
      (stream) =>
        stream.kind === "audio" &&
        (stream.source === "mic" || stream.source === "webcam")
    );

    console.log("[Call] Found audio streams:", audioStreams);

    setRemoteAudios((prev) => {
      // Create new audio array from hook streams
      const newAudios = audioStreams.map((stream) => ({
        id: stream.producerId,
        stream: stream.stream,
        peerId: stream.peerId,
        displayName: stream.displayName,
      }));

      console.log("[Call] Setting remote audios:", newAudios);
      return newAudios;
    });
  }, [hookRemoteStreams]);

  // Handle leaving the call
  const handleHangup = useCallback(() => {
    // Stop screen sharing if active
    if (screenStream) {
      screenStream.getTracks().forEach((track) => {
        track.stop();
        track.enabled = false;
      });
      setScreenStream(null);
      setIsScreenSharing(false);
    }

    // Close screen share producer if exists
    if (screenProducerRef.current && socket?.readyState === WebSocket.OPEN) {
      socket.send(
        JSON.stringify({
          type: "closeProducer",
          producerId: screenProducerRef.current.id,
        })
      );
      screenProducerRef.current = null;
    }

    // Clear all remote audios
    setRemoteAudios((prev) => {
      prev.forEach((audio) => {
        if (audio.stream) {
          audio.stream.getTracks().forEach((track) => {
            track.stop();
            track.enabled = false;
          });
        }
      });
      return [];
    });

    // Clear consumed producers set
    consumedProducers.current.clear();

    // Reset producer IDs
    setMyProducerIds([]);

    // Reset join state
    setJoined(false);

    // Navigate back to calls page
    window.location.href = "/app/call";
  }, [screenStream, socket, callId, userId]);

  // Cleanup when component unmounts or user navigates away
  useEffect(() => {
    const cleanup = () => {
      console.log("[Call] Cleaning up component...");

      // Stop preview stream
      if (previewStream) {
        previewStream.getTracks().forEach((track) => track.stop());
      }

      // Stop screen sharing if active
      if (screenStream) {
        screenStream.getTracks().forEach((track) => track.stop());
      }

      // Clear all states
      setRemoteAudios([]);
      consumedProducers.current.clear();
      setMyProducerIds([]);
    };

    // Add beforeunload listener for page refresh/close
    const handleBeforeUnload = () => {
      cleanup();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    // Cleanup function for component unmount
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      cleanup();
    };
  }, [previewStream, screenStream]);

  // Handle screen sharing cleanup
  useEffect(() => {
    if (screenStream) {
      const handleStreamEnded = () => {
        screenStream.getTracks().forEach((track) => track.stop());
        setScreenStream(null);
        setIsScreenSharing(false);
        if (
          screenProducerRef.current &&
          socket?.readyState === WebSocket.OPEN
        ) {
          socket.send(
            JSON.stringify({
              type: "closeProducer",
              producerId: screenProducerRef.current.id,
            })
          );
          screenProducerRef.current = null;
        }
      };

      screenStream.getVideoTracks().forEach((track) => {
        track.onended = handleStreamEnded;
      });

      return () => {
        screenStream.getVideoTracks().forEach((track) => {
          track.onended = null;
        });
      };
    }
  }, [screenStream, socket]);

  // Add comprehensive stream diagnostics
  useEffect(() => {
    console.log("=== STREAM DIAGNOSTICS ===");
    console.log("[Call] Local stream:", localStream);
    if (localStream) {
      console.log("[Call] Local stream active:", localStream.active);
      console.log(
        "[Call] Local stream tracks:",
        localStream.getTracks().map((t) => ({
          kind: t.kind,
          enabled: t.enabled,
          readyState: t.readyState,
          muted: t.muted,
          id: t.id,
        }))
      );
    }
    console.log("[Call] Hook remote streams count:", hookRemoteStreams.length);
    hookRemoteStreams.forEach((stream, index) => {
      console.log(`[Call] Remote stream ${index}:`, {
        producerId: stream.producerId,
        peerId: stream.peerId,
        kind: stream.kind,
        source: stream.source,
        displayName: stream.displayName,
        streamActive: stream.stream.active,
        tracks: stream.stream.getTracks().map((t) => ({
          kind: t.kind,
          enabled: t.enabled,
          readyState: t.readyState,
          muted: t.muted,
        })),
      });
    });
    console.log("[Call] Current userId:", userId);
    console.log("[Call] Peers:", peers);
    console.log("=========================");
  }, [localStream, hookRemoteStreams, userId, peers]);

  // Filter remote streams by type from the hook
  console.log("[Call] All remote streams:", hookRemoteStreams);

  const remoteVideoStreams = hookRemoteStreams.filter((stream) => {
    console.log("[Call] Checking video stream:", {
      producerId: stream.producerId,
      peerId: stream.peerId,
      kind: stream.kind,
      source: stream.source,
      streamValid: !!stream?.stream,
    });

    // Check if stream is valid
    if (!stream?.stream) {
      console.log("[Call] Stream is invalid");
      return false;
    }

    // Get video tracks
    const videoTracks = stream.stream.getVideoTracks();
    if (!videoTracks.length) {
      console.log("[Call] No video tracks for", stream.producerId);
      return false;
    }

    // Check if any track is valid
    const hasValidTrack = videoTracks.some(
      (track) => track.readyState === "live" && track.enabled
    );

    const isVideoKind = stream.kind === "video";
    const isVideoSource = stream.source === "webcam";

    console.log("[Call] Video stream analysis:", {
      producerId: stream.producerId,
      kind: stream.kind,
      source: stream.source,
      isVideoKind,
      isVideoSource,
      hasValidTrack,
      videoTracksCount: videoTracks.length,
      trackStates: videoTracks.map((t) => ({
        readyState: t.readyState,
        enabled: t.enabled,
      })),
    });

    const isValidVideoStream = isVideoSource && isVideoKind && hasValidTrack;

    console.log("[Call] Video stream valid:", isValidVideoStream);
    return isValidVideoStream;
  });

  const remoteScreenStreams = hookRemoteStreams.filter((stream) => {
    // Check if stream is valid
    if (!stream?.stream) return false;

    // Get video tracks
    const videoTracks = stream.stream.getVideoTracks();
    if (!videoTracks.length) return false;

    // Check if any track is valid
    const hasValidTrack = videoTracks.some(
      (track) => track.readyState === "live" && track.enabled
    );

    const isValidScreenStream =
      stream.source === "screen" && stream.kind === "video" && hasValidTrack;

    console.log("[Call] Screen stream valid:", isValidScreenStream);
    return isValidScreenStream;
  });

  console.log("[Call] Filtered video streams:", remoteVideoStreams);
  console.log("[Call] Filtered screen streams:", remoteScreenStreams);
  console.log("[Call] Remote audios:", remoteAudios);

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-6">
      {!joined ? (
        <>
          <div className="flex w-full max-w-xs flex-col gap-4">
            <label className="font-semibold">Camera</label>
            <select
              className="rounded border px-2 py-1"
              value={selectedVideo}
              onChange={(e) => setSelectedVideo(e.target.value)}
            >
              <option value="">Select camera</option>
              {videoDevices.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label || `Camera (${d.deviceId})`}
                </option>
              ))}
            </select>
            <label className="mt-2 font-semibold">Microphone</label>
            <select
              className="rounded border px-2 py-1"
              value={selectedAudio}
              onChange={(e) => setSelectedAudio(e.target.value)}
            >
              <option value="">Select microphone</option>
              {audioDevices.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label || `Microphone (${d.deviceId})`}
                </option>
              ))}
            </select>
          </div>
          <div className="flex h-[240px] w-[320px] items-center justify-center overflow-hidden rounded-lg bg-black shadow-lg">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="h-full w-full object-cover"
            />
          </div>
          <button
            className="mt-4 rounded bg-blue-600 px-6 py-2 font-semibold text-white shadow transition hover:bg-blue-700"
            onClick={handleJoin}
            disabled={!connected}
          >
            {connected ? "Join the call" : "Connecting..."}
          </button>
        </>
      ) : (
        <div className="flex w-full flex-col items-center gap-4">
          <div className="text-lg font-semibold">In call</div>
          <div className="flex w-full flex-wrap justify-center gap-4">
            {/* Local video */}
            {localStream && (
              <div className="relative">
                <video
                  autoPlay
                  playsInline
                  muted
                  className="h-[240px] w-[320px] rounded-lg bg-black shadow-lg"
                  ref={(el) => {
                    if (el && localStream) {
                      console.log(
                        "[Call] Setting local video element with stream:",
                        {
                          streamId: localStream.id,
                          active: localStream.active,
                          videoTracks: localStream
                            .getVideoTracks()
                            .map((t) => ({
                              id: t.id,
                              kind: t.kind,
                              enabled: t.enabled,
                              readyState: t.readyState,
                              muted: t.muted,
                            })),
                        }
                      );
                      el.srcObject = localStream;
                      el.onloadedmetadata = () => {
                        console.log("[Call] Local video metadata loaded");
                        el.play().catch((e) =>
                          console.warn("Error playing local video:", e)
                        );
                      };
                      el.oncanplay = () => {
                        console.log("[Call] Local video can play");
                      };
                      el.onerror = (e) => {
                        console.error("[Call] Local video error:", e);
                      };
                    }
                  }}
                />
                <span className="absolute bottom-2 left-2 rounded bg-black/70 px-2 py-1 text-xs text-white">
                  You ({displayName})
                </span>
              </div>
            )}

            {/* Local screen share */}
            {screenStream &&
              screenStream.getVideoTracks().length > 0 &&
              screenStream
                .getVideoTracks()
                .some(
                  (track) => track.readyState === "live" && track.enabled
                ) && (
                <div className="relative">
                  <video
                    autoPlay
                    playsInline
                    muted
                    className="h-[240px] w-[320px] rounded-lg bg-black shadow-lg"
                    ref={(el) => {
                      if (el && screenStream) {
                        el.srcObject = screenStream;
                        el.onloadedmetadata = () => {
                          el.play().catch((e) =>
                            console.warn("Error forcing play:", e)
                          );
                        };
                      }
                    }}
                  />
                  <span className="absolute bottom-2 left-2 rounded bg-black/70 px-2 py-1 text-xs text-white">
                    Your screen
                  </span>
                </div>
              )}

            {/* Remote cameras */}
            {remoteVideoStreams.map(
              ({
                stream,
                peerId,
                displayName: peerDisplayName,
                producerId,
              }) => {
                console.log(
                  `[Call] Rendering remote video for ${peerDisplayName}:`,
                  {
                    streamId: stream.id,
                    active: stream.active,
                    videoTracks: stream.getVideoTracks().map((t) => ({
                      id: t.id,
                      kind: t.kind,
                      enabled: t.enabled,
                      readyState: t.readyState,
                      muted: t.muted,
                    })),
                  }
                );

                return (
                  <div className="relative" key={producerId || peerId}>
                    <video
                      autoPlay
                      playsInline
                      className="h-[240px] w-[320px] rounded-lg bg-black shadow-lg"
                      ref={(el) => {
                        if (el && stream) {
                          console.log(
                            `[Call] Setting remote video element for ${peerDisplayName}`
                          );
                          el.srcObject = stream;
                          el.onloadedmetadata = () => {
                            console.log(
                              `[Call] Remote video metadata loaded for ${peerDisplayName}`
                            );
                            el.play().catch((e) =>
                              console.warn(
                                `Error playing remote video for ${peerDisplayName}:`,
                                e
                              )
                            );
                          };
                          el.oncanplay = () => {
                            console.log(
                              `[Call] Remote video can play for ${peerDisplayName}`
                            );
                          };
                          el.onerror = (e) => {
                            console.error(
                              `[Call] Remote video error for ${peerDisplayName}:`,
                              e
                            );
                          };
                        }
                      }}
                    />
                    <span className="absolute bottom-2 left-2 rounded bg-black/70 px-2 py-1 text-xs text-white">
                      {peerDisplayName || "User"}
                    </span>
                  </div>
                );
              }
            )}

            {/* Remote screens */}
            {remoteScreenStreams.map(
              ({
                stream,
                peerId,
                displayName: peerDisplayName,
                producerId,
              }) => {
                if (
                  !stream
                    ?.getVideoTracks()
                    .some(
                      (track) => track.readyState === "live" && track.enabled
                    )
                ) {
                  return null;
                }

                return (
                  <div className="relative" key={producerId || peerId}>
                    <video
                      autoPlay
                      playsInline
                      className="h-[240px] w-[320px] rounded-lg bg-black shadow-lg"
                      ref={(el) => {
                        if (el) {
                          console.log(
                            `[Call] Setting screen share stream for ${peerDisplayName}:`,
                            stream
                          );
                          el.srcObject = stream;
                          el.onloadedmetadata = () => {
                            console.log(
                              `[Call] Screen share metadata loaded for ${peerDisplayName}`
                            );
                            el.play().catch((e) =>
                              console.warn(
                                `Error playing screen share for ${peerDisplayName}:`,
                                e
                              )
                            );
                          };
                        }
                      }}
                    />
                    <span className="absolute bottom-2 left-2 rounded bg-black/70 px-2 py-1 text-xs text-white">
                      {`${peerDisplayName || "User"}'s screen`}
                    </span>
                  </div>
                );
              }
            )}

            {/* Remote audios */}
            {remoteAudios.map(({ stream, id, peerId, displayName }) => (
              <audio
                key={id}
                autoPlay
                playsInline
                ref={(el) => {
                  if (el) {
                    console.log(
                      `[Call] Setting audio stream for ${displayName || peerId}:`,
                      stream
                    );
                    el.srcObject = stream;
                    el.onloadedmetadata = () => {
                      console.log(
                        `[Call] Audio metadata loaded for ${displayName || peerId}`
                      );
                      el.play().catch((e) =>
                        console.warn(
                          `Error playing audio for ${displayName || peerId}:`,
                          e
                        )
                      );
                    };
                  }
                }}
              />
            ))}
          </div>
          <MediaControls
            localStream={localStream}
            joined={joined}
            onHangup={handleHangup}
            isScreenSharing={isScreenSharing}
            onToggleScreenShare={handleToggleScreenShare}
          />
        </div>
      )}
    </div>
  );
}
