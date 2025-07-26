import { useState, useCallback } from "react";
import type { Participant } from "./types";

export function useParticipants() {
  const [participants, setParticipants] = useState<Participant[]>([]);

  const updateFromPeers = useCallback((peers: any[]) => {
    setParticipants((prev) => {
      const newParticipants = [...prev];

      peers.forEach((peer) => {
        const existingParticipant = newParticipants.find((p) => p.id === peer.id);

        if (existingParticipant) {
          existingParticipant.displayName = peer.displayName;
          existingParticipant.isCreator = peer.isCreator || false;
          existingParticipant.connectionState = peer.connectionState;
        } else {
          newParticipants.push({
            id: peer.id,
            displayName: peer.displayName,
            isCreator: peer.isCreator || false,
            isMicOn: true, // Default, will be updated by stream events
            isCameraOn: true, // Default, will be updated by stream events
            connectionState: peer.connectionState,
          });
        }
      });

      return newParticipants;
    });
  }, []);

  const updateParticipant = useCallback(
    (id: string, updates: Partial<Participant>) => {
      setParticipants((prev) =>
        prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
      );
    },
    []
  );

  const addParticipant = useCallback((participant: Participant) => {
    setParticipants((prev) => {
      if (prev.find((p) => p.id === participant.id)) return prev;
      return [...prev, participant];
    });
  }, []);

  const removeParticipant = useCallback((id: string) => {
    setParticipants((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const getParticipant = useCallback(
    (id: string) => {
      return participants.find((p) => p.id === id);
    },
    [participants]
  );

  return {
    list: participants,
    updateFromPeers,
    updateParticipant,
    addParticipant,
    removeParticipant,
    getParticipant,
  };
}