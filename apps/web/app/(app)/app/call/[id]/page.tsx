'use client';
import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { useMediasoupClient } from '@/hooks/useMediasoupClient';

function generateUserId() {
  if (typeof window !== 'undefined') {
    let id = localStorage.getItem('user-id');
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem('user-id', id);
    }
    return id;
  }
  return '';
}

const MediaControls = ({ localStream, joined, onHangup }: { localStream: MediaStream | null, joined: boolean, onHangup: () => void }) => {
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const localStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    localStreamRef.current = localStream;
  }, [localStream]);

  const toggleCamera = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((track) => {
        track.enabled = !isCameraOn;
      });
      setIsCameraOn((prev) => !prev);
    }
  };

  const toggleMic = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !isMicOn;
      });
      setIsMicOn((prev) => !prev);
    }
  };

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 flex gap-4 rounded-lg z-50">
      <button
        className={`px-4 py-2 rounded ${isCameraOn ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800'}`}
        onClick={toggleCamera}
      >
        {isCameraOn ? 'Turn off camera' : 'Turn on camera'}
      </button>
      <button
        className={`px-4 py-2 rounded ${isMicOn ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800'}`}
        onClick={toggleMic}
      >
        {isMicOn ? 'Turn off microphone' : 'Turn on microphone'}
      </button>
      <button
        className="px-4 py-2 rounded bg-red-600 text-white"
        onClick={onHangup}
      >
        Hang up
      </button>
    </div>
  );
};

export default function CallPreviewPage() {
  const params = useParams();
  const callId = params?.id as string;
  const userId = generateUserId();
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<string | undefined>();
  const [selectedAudio, setSelectedAudio] = useState<string | undefined>();
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);
  const [joined, setJoined] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Mediasoup hooks
  const {
    joinRoom,
    loadDevice,
    createSendTransport,
    createRecvTransport,
    produce,
    consume,
    localStream,
    connected,
    socket,
    device,
    createRecvTransport: createRecv,
  } = useMediasoupClient();

  // Local state for remote consumers

  const [remoteVideos, setRemoteVideos] = useState<{ id: string, stream: MediaStream, userId?: string }[]>([]);
  const [remoteAudios, setRemoteAudios] = useState<{ id: string, stream: MediaStream, userId?: string }[]>([]);
  const [recvTransportReady, setRecvTransportReady] = useState(false);
  const consumedProducers = useRef<Set<string>>(new Set());
  const [producers, setProducers] = useState<any[]>([]);
  const [myProducerIds, setMyProducerIds] = useState<string[]>([]);

  // Get available devices
  useEffect(() => {
    navigator.mediaDevices.enumerateDevices().then((devices) => {
      setVideoDevices(devices.filter((d) => d.kind === 'videoinput'));
      setAudioDevices(devices.filter((d) => d.kind === 'audioinput'));
    });
  }, []);

  // Get stream with the selected devices for preview
  useEffect(() => {
    let active = true;
    const getStream = async () => {
      try {
        const constraints: MediaStreamConstraints = {
          video: selectedVideo ? { deviceId: { exact: selectedVideo } } : true,
          audio: selectedAudio ? { deviceId: { exact: selectedAudio } } : true,
        };
        const s = await navigator.mediaDevices.getUserMedia(constraints);
        if (active) setPreviewStream(s);
      } catch {
        if (active) setPreviewStream(null);
      }
    };
    getStream();
    return () => {
      active = false;
      previewStream?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVideo, selectedAudio]);

// Assign stream to the preview video
  useEffect(() => {
    if (videoRef.current && previewStream) {
      videoRef.current.srcObject = previewStream;
    }
  }, [previewStream]);

 // Logic to join the call
const handleJoin = async () => {
  if (!callId) return;
  // 1. Join the room in the backend
  const joinRes = await joinRoom(callId);
  // 2. Get the RTP capabilities of the remote router
  const rtpCapabilities = (joinRes as any).rtpCapabilities || (joinRes as any).routerRtpCapabilities;
  if (!rtpCapabilities) {
    alert('No RTP capabilities received from the router');
    return;
  }
  setProducers((joinRes as any).producers || []);
  // 3. Load the mediasoup device
  await loadDevice(rtpCapabilities);
  // 4. Create send and receive transports
  await createSendTransport();
  await createRecv();
  setRecvTransportReady(true);
  // 5. Get the local stream with the selected devices
  let stream: MediaStream;
  try {
    if (previewStream) {
      stream = previewStream;
    } else {
      stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    }
    if (!stream.getTracks().length) {
      alert('No audio/video tracks detected in the local stream. Check permissions and devices.');
      console.error('Empty local stream:', stream);
      return;
    }
  } catch (err) {
    alert('Error accessing camera/microphone. Check permissions.');
    console.error('Error getUserMedia:', err);
    return;
  }
  // 6. Produce the local stream and save the IDs
  const myProducers = await produce(stream);
  if (!myProducers || !myProducers.length) {
    alert('Could not produce audio/video. Check console for more details.');
    console.error('Empty producers:', myProducers);
    return;
  }
  setMyProducerIds(myProducers.map((p: any) => p.id));
  setJoined(true);
};

// Consume existing producers when joining the call (only after the device and recv transport are ready)
useEffect(() => {
  if (!joined || !producers.length || !device || !recvTransportReady) return;
  producers.forEach((producer) => {
    if (!consumedProducers.current.has(producer.id) && !myProducerIds.includes(producer.id)) {
      consumedProducers.current.add(producer.id);
      consume(producer.id, device!.rtpCapabilities, (stream: MediaStream, kind?: string, remoteUserId?: string) => {
        if (!stream) return;
        if (kind === 'video' && stream.getVideoTracks().length > 0) {
          setRemoteVideos((prev) => prev.find(v => v.id === stream.id) ? prev : [...prev, { id: stream.id, stream, userId: remoteUserId }]);
        }
        if (kind === 'audio' && stream.getAudioTracks().length > 0) {
          setRemoteAudios((prev) => prev.find(a => a.id === stream.id) ? prev : [...prev, { id: stream.id, stream, userId: remoteUserId }]);
        }
        console.log('Consuming producer', producer.id, 'kind:', kind, 'stream:', stream, 'userId:', remoteUserId);
      });
    }
  });
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [joined, producers, device, myProducerIds, recvTransportReady]);

// Listen for new producers in real-time
useEffect(() => {
  if (!joined || !socket || !device || !recvTransportReady) return;
  const handler = (event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data);
      if (data.type === 'newProducer' && data.id) {
        if (!consumedProducers.current.has(data.id) && !myProducerIds.includes(data.id)) {
          consumedProducers.current.add(data.id);
          consume(data.id, device!.rtpCapabilities, (stream: MediaStream, kind?: string, remoteUserId?: string) => {
            if (!stream) return;
            if (kind === 'video' && stream.getVideoTracks().length > 0) {
              setRemoteVideos((prev) => prev.find(v => v.id === stream.id) ? prev : [...prev, { id: stream.id, stream, userId: remoteUserId ?? data.userId }]);
            }
            if (kind === 'audio' && stream.getAudioTracks().length > 0) {
              setRemoteAudios((prev) => prev.find(a => a.id === stream.id) ? prev : [...prev, { id: stream.id, stream, userId: remoteUserId ?? data.userId }]);
            }
          });
        }
      }
    } catch (err) {
      console.error('[WebSocket] Error processing message:', err);
    }
  };
  socket.addEventListener('message', handler);
  return () => {
    socket.removeEventListener('message', handler);
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [joined, socket, device, myProducerIds, recvTransportReady]);

// TODO: For full real-time, you should listen for new producers via signaling (e.g., broadcast to all users when someone produces)

return (
  <div className="flex flex-col items-center justify-center min-h-[70vh] gap-6">
    {!joined ? (
      <>
        <div className="w-full max-w-xs flex flex-col gap-4">
          <label className="font-semibold">Camera</label>
          <select
            className="border rounded px-2 py-1"
            value={selectedVideo}
            onChange={e => setSelectedVideo(e.target.value)}
          >
            <option value="">Select camera</option>
            {videoDevices.map((d) => (
              <option key={d.deviceId} value={d.deviceId}>{d.label || `Camera (${d.deviceId})`}</option>
            ))}
          </select>
          <label className="font-semibold mt-2">Microphone</label>
          <select
            className="border rounded px-2 py-1"
            value={selectedAudio}
            onChange={e => setSelectedAudio(e.target.value)}
          >
            <option value="">Select microphone</option>
            {audioDevices.map((d) => (
              <option key={d.deviceId} value={d.deviceId}>{d.label || `Microphone (${d.deviceId})`}</option>
            ))}
          </select>
        </div>
        <div className="rounded-lg shadow-lg overflow-hidden bg-black w-[320px] h-[240px] flex items-center justify-center">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
        </div>
        <button
          className="mt-4 px-6 py-2 rounded bg-blue-600 text-white font-semibold shadow hover:bg-blue-700 transition"
          onClick={handleJoin}
          disabled={!connected}
        >
          {connected ? 'Join the call' : 'Connecting...'}
        </button>
      </>
    ) : (
      <div className="flex flex-col items-center gap-4 w-full">
        <div className="text-lg font-semibold">In call</div>
        <div className="flex flex-wrap gap-4 justify-center w-full">
          {/* Local video */}
          {localStream && (
            <div className="relative">
              <video
                autoPlay
                playsInline
                muted
                className="rounded-lg shadow-lg w-[320px] h-[240px] bg-black"
                ref={el => {
                  if (el && localStream) {
                    el.srcObject = localStream;
                    el.onloadedmetadata = () => {
                      el.play().catch(e => console.warn('Error forcing play:', e));
                    };
                  }
                }}
              />
              <span className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">You ({userId.slice(0, 6)})</span>
            </div>
          )}
          {/* Remote videos */}
          {remoteVideos.map(({ id, stream, userId: remoteUserId }) => (
            <div className="relative" key={id}>
              <video
                autoPlay
                playsInline
                muted={false}
                className="rounded-lg shadow-lg w-[320px] h-[240px] bg-black"
                ref={el => {
                  if (el) {
                    el.srcObject = stream;
                    el.onloadedmetadata = () => {
                      el.play().catch(e => console.warn('Error forcing play:', e));
                    };
                  }
                }}
              />
              <span className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">{remoteUserId ? remoteUserId.slice(0, 6) : 'User'}</span>
            </div>
          ))}
          {/* Remote audios */}
          {remoteAudios.map(({ id, stream }) => (
            <audio
              key={id + '-audio'}
              autoPlay
              controls={false}
              ref={el => { if (el) el.srcObject = stream; }}
            />
          ))}
        </div>
        <MediaControls localStream={localStream} joined={joined} onHangup={() => window.location.reload()} />
      </div>
    )}
  </div>
);
} 