"use client";

import { useEffect, useState } from "react";
import {
  RoomContext,
  GridLayout,
  ParticipantTile,
  TrackToggle,
  DisconnectButton,
  RoomAudioRenderer,
  useTracks,
} from "@livekit/components-react";
import { Room, Track } from "livekit-client";
import { useParams } from "next/navigation";
import "@livekit/components-styles";

// Set up LiveKit URL and helper function for token generation
const LIVEKIT_URL = process.env.NEXT_PUBLIC_LIVEKIT_URL!;

function randomName() {
  return "user-" + Math.random().toString(36).substring(2, 10);
}

async function fetchToken(roomName: string, participantName: string) {
  const resp = await fetch(
    `/api/livekit-token?room=${roomName}&username=${participantName}`
  );
  const data = await resp.json();
  return data.token;
}

export default function RoomPage() {
  const params = useParams();
  const roomName = params?.id as string;
  const [room, setRoom] = useState<Room | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [username] = useState(() => randomName());

  useEffect(() => {
    if (roomName && !token) {
      fetchToken(roomName, username).then(setToken);
    }
  }, [roomName, token, username]);

  useEffect(() => {
    if (token && !room) {
      const r = new Room();
      r.connect(LIVEKIT_URL, token).then(() => {
        setRoom(r);
        r.localParticipant.enableCameraAndMicrophone().catch(() => {});
      });
    }
    // Cleanup
    return () => {
      if (room) {
        room.disconnect();
      }
    };
  }, [token, room]);

  if (!token || !room) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Connecting...
      </div>
    );
  }

  return (
    <RoomContext.Provider value={room}>
      <div className="w-full min-h-screen bg-[#101010] flex">
        {/* Main video area */}
        <main className="flex-1 flex flex-col">
          {/* Video Layout */}
          <div className="flex-1 flex justify-center items-center">
            <MyVideoConference />
          </div>

          {/* Bottom control bar */}
          <div className="absolute bottom-8 left-0 right-0 flex justify-center z-10">
            <div className="flex gap-8 bg-[#101010] p-4 rounded-md shadow-lg">
              <TrackToggle
                style={{ color: "#fff" }}
                source={Track.Source.Microphone}
              />
              <TrackToggle
                style={{ color: "#fff" }}
                source={Track.Source.Camera}
              />
              <TrackToggle
                style={{ color: "#fff" }}
                source={Track.Source.ScreenShare}
              />

              <DisconnectButton
                style={{
                  background: "var(--primary)",
                  borderRadius: "var(--radius-md)",
                  paddingTop: "3px",
                  paddingBottom: "3px",
                  color: "var(--primary-foreground)",
                }}
              >
                Leave
              </DisconnectButton>
            </div>
          </div>
        </main>

        <RoomAudioRenderer />
      </div>
    </RoomContext.Provider>
  );
}

function MyVideoConference() {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false }
  );

  return (
    <GridLayout
      tracks={tracks}
      style={{ height: "calc(100vh - var(--lk-control-bar-height))" }}
    >
      <ParticipantTile />
    </GridLayout>
  );
}
