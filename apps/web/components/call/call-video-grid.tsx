"use client";

import { useCallContext } from "@/contexts/call-context";
import { cn } from "@call/ui/lib/utils";
import { MicOff } from "lucide-react";

export const CallVideoGrid = () => {
  const { state, mediasoup } = useCallContext();

  const remoteVideoStreams = mediasoup.remoteStreams.filter((stream) => {
    if (!stream?.stream) return false;

    const videoTracks = stream.stream.getVideoTracks();
    if (!videoTracks.length) return false;

    const hasValidTrack = videoTracks.some(
      (track) => track.readyState === "live" && track.enabled
    );

    const isVideoKind = stream.kind === "video";
    const isVideoSource = stream.source === "webcam";
    const isNotScreenShare = stream.source !== "screen";

    return isVideoSource && isVideoKind && hasValidTrack && isNotScreenShare;
  });

  const remoteScreenStreams = mediasoup.remoteStreams.filter((stream) => {
    if (!stream?.stream) return false;

    const videoTracks = stream.stream.getVideoTracks();
    if (!videoTracks.length) return false;

    const hasValidTrack = videoTracks.some(
      (track) => track.readyState === "live" && track.enabled
    );

    return (
      stream.source === "screen" && stream.kind === "video" && hasValidTrack
    );
  });

  const peerAudioStatus = mediasoup.remoteStreams.reduce(
    (acc, stream) => {
      if (stream.kind === "audio") {
        acc[stream.peerId] = { muted: stream.muted };
      }
      return acc;
    },
    {} as Record<string, { muted: boolean }>
  );

  return (
    <div className="relative flex size-full flex-wrap items-center justify-center gap-4 p-4">
      <div className="flex flex-wrap items-center justify-center gap-4">
        {mediasoup.localStream && (
          <div className="relative aspect-video max-h-[500px] min-h-[240px] w-auto overflow-hidden rounded-lg bg-black shadow-lg">
            <video
              autoPlay
              playsInline
              muted
              className="size-full object-cover"
              ref={(el) => {
                if (el && mediasoup.localStream) {
                  el.srcObject = mediasoup.localStream;
                }
              }}
            />
            <span className="absolute bottom-2 left-2 rounded bg-black/70 px-2 py-1 text-xs text-white">
              You
            </span>
          </div>
        )}

        {state.screenStream &&
          state.screenStream.getVideoTracks().length > 0 &&
          state.screenStream
            .getVideoTracks()
            .some((track) => track.readyState === "live" && track.enabled) && (
            <div className="relative">
              <video
                autoPlay
                playsInline
                muted
                className="aspect-video min-h-[240px] w-auto rounded-lg bg-black shadow-lg"
                ref={(el) => {
                  if (el && state.screenStream) {
                    el.srcObject = state.screenStream;
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

        {remoteVideoStreams.map(
          ({ stream, peerId, displayName: peerDisplayName, producerId }) => (
            <div
              className="relative aspect-video max-h-[500px] min-h-[240px] w-auto overflow-hidden rounded-lg bg-black shadow-lg"
              key={producerId || peerId}
            >
              <video
                autoPlay
                playsInline
                className="size-full object-cover"
                ref={(el) => {
                  if (el && stream) {
                    el.srcObject = stream;
                    el.onloadedmetadata = () => {
                      el.play().catch((e) =>
                        console.warn(
                          `Error playing remote video for ${peerDisplayName}:`,
                          e
                        )
                      );
                    };
                  }
                }}
              />
              <div className="absolute bottom-2 left-2 rounded bg-black/70 px-2 py-1 text-white">
                <div className="flex items-center gap-2">
                  <span className="text-xs">{peerDisplayName || "User"}</span>
                  {peerAudioStatus[peerId]?.muted && <MicOff size={12} />}
                </div>
              </div>
            </div>
          )
        )}

        {remoteScreenStreams.map(
          ({ stream, peerId, displayName: peerDisplayName, producerId }) => {
            if (
              !stream
                ?.getVideoTracks()
                .some((track) => track.readyState === "live" && track.enabled)
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
                      el.srcObject = stream;
                      el.onloadedmetadata = () => {
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

        {state.remoteAudios.map(({ stream, id, peerId, displayName }) => (
          <audio
            key={id}
            autoPlay
            playsInline
            ref={(el) => {
              if (el) {
                el.srcObject = stream;
                el.onloadedmetadata = () => {
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
    </div>
  );
};
