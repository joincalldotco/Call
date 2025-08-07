/**
 * PeerManager handles participant management and peer-to-peer connections
 */

import { EventEmitter } from "events";
import type { Participant, Self } from "../types/participant";
import type { CallState } from "../types/call";

export interface PeerManagerEvents {
  participantJoined: (participant: Participant) => void;
  participantLeft: (participantId: string) => void;
  participantUpdated: (participant: Participant) => void;
  dominantSpeakerChanged: (speakerId?: string) => void;
  audioLevelChanged: (participantId: string, level: number) => void;
}

export class PeerManager extends EventEmitter {
  private participants = new Map<string, Participant>();
  private self: Self | null = null;
  private dominantSpeakerId?: string;
  private pinnedParticipantId?: string;
  private audioLevels = new Map<string, number>();
  private dominantSpeakerTimer?: NodeJS.Timeout;

  constructor() {
    super();
  }

  /**
   * Get current call state
   */
  getState(): Pick<
    CallState,
    "self" | "participants" | "dominantSpeakerId" | "pinnedParticipantId"
  > {
    return {
      self: this.self,
      participants: new Map(this.participants),
      dominantSpeakerId: this.dominantSpeakerId,
      pinnedParticipantId: this.pinnedParticipantId,
    };
  }

  /**
   * Set local participant (self)
   */
  setSelf(self: Self): void {
    this.self = self;
  }

  /**
   * Get local participant
   */
  getSelf(): Self | null {
    return this.self;
  }

  /**
   * Add a new participant
   */
  addParticipant(participant: Participant): void {
    this.participants.set(participant.id, participant);
    this.emit("participantJoined", participant);
  }

  /**
   * Remove a participant
   */
  removeParticipant(participantId: string): void {
    const participant = this.participants.get(participantId);
    if (participant) {
      this.participants.delete(participantId);
      this.audioLevels.delete(participantId);

      // Clear dominant speaker if it was this participant
      if (this.dominantSpeakerId === participantId) {
        this.setDominantSpeaker(undefined);
      }

      // Clear pinned participant if it was this participant
      if (this.pinnedParticipantId === participantId) {
        this.pinnedParticipantId = undefined;
      }

      this.emit("participantLeft", participantId);
    }
  }

  /**
   * Update participant information
   */
  updateParticipant(
    participantUpdate: Partial<Participant> & { id: string }
  ): void {
    const existing = this.participants.get(participantUpdate.id);
    if (existing) {
      const updated = { ...existing, ...participantUpdate };
      this.participants.set(participantUpdate.id, updated);
      this.emit("participantUpdated", updated);
    }
  }

  /**
   * Get a participant by ID
   */
  getParticipant(participantId: string): Participant | undefined {
    return this.participants.get(participantId);
  }

  /**
   * Get all participants as an array
   */
  getParticipants(): Participant[] {
    return Array.from(this.participants.values());
  }

  /**
   * Get participants count
   */
  getParticipantCount(): number {
    return this.participants.size + (this.self ? 1 : 0);
  }

  /**
   * Set dominant speaker
   */
  setDominantSpeaker(speakerId?: string): void {
    if (this.dominantSpeakerId !== speakerId) {
      this.dominantSpeakerId = speakerId;
      this.emit("dominantSpeakerChanged", speakerId);
    }
  }

  /**
   * Get current dominant speaker
   */
  getDominantSpeaker(): string | undefined {
    return this.dominantSpeakerId;
  }

  /**
   * Update audio level for a participant
   */
  updateAudioLevel(participantId: string, level: number): void {
    this.audioLevels.set(participantId, level);
    this.emit("audioLevelChanged", participantId, level);

    // Auto-detect dominant speaker based on audio levels
    this.updateDominantSpeakerFromAudioLevels();
  }

  /**
   * Get audio level for a participant
   */
  getAudioLevel(participantId: string): number {
    return this.audioLevels.get(participantId) || 0;
  }

  /**
   * Pin a participant
   */
  pinParticipant(participantId: string): void {
    if (
      this.participants.has(participantId) ||
      participantId === this.self?.id
    ) {
      this.pinnedParticipantId = participantId;
    }
  }

  /**
   * Unpin the currently pinned participant
   */
  unpinParticipant(): void {
    this.pinnedParticipantId = undefined;
  }

  /**
   * Get pinned participant ID
   */
  getPinnedParticipant(): string | undefined {
    return this.pinnedParticipantId;
  }

  /**
   * Check if a participant is currently speaking (has high audio level)
   */
  isParticipantSpeaking(participantId: string): boolean {
    const level = this.audioLevels.get(participantId) || 0;
    return level > 0.1; // Threshold for considering someone as speaking
  }

  /**
   * Get participants sorted by activity (speaking, screen sharing, etc.)
   */
  getSortedParticipants(): Participant[] {
    const participants = this.getParticipants();

    return participants.sort((a, b) => {
      // Pinned participant first
      if (a.id === this.pinnedParticipantId) return -1;
      if (b.id === this.pinnedParticipantId) return 1;

      // Screen sharing participants next
      if (a.screenShareEnabled && !b.screenShareEnabled) return -1;
      if (!a.screenShareEnabled && b.screenShareEnabled) return 1;

      // Dominant speaker next
      if (a.id === this.dominantSpeakerId) return -1;
      if (b.id === this.dominantSpeakerId) return 1;

      // Speaking participants next
      const aLevel = this.audioLevels.get(a.id) || 0;
      const bLevel = this.audioLevels.get(b.id) || 0;
      if (aLevel > 0.1 && bLevel <= 0.1) return -1;
      if (aLevel <= 0.1 && bLevel > 0.1) return 1;

      // Sort by join time
      return a.joinedAt.getTime() - b.joinedAt.getTime();
    });
  }

  /**
   * Get active participants (speaking or sharing screen)
   */
  getActiveParticipants(): Participant[] {
    return this.getParticipants().filter(
      (participant) =>
        participant.screenShareEnabled ||
        participant.id === this.dominantSpeakerId ||
        this.isParticipantSpeaking(participant.id)
    );
  }

  /**
   * Clear all participants (used when leaving call)
   */
  clear(): void {
    this.participants.clear();
    this.audioLevels.clear();
    this.self = null;
    this.dominantSpeakerId = undefined;
    this.pinnedParticipantId = undefined;

    if (this.dominantSpeakerTimer) {
      clearTimeout(this.dominantSpeakerTimer);
      this.dominantSpeakerTimer = undefined;
    }
  }

  /**
   * Update dominant speaker based on audio levels
   */
  private updateDominantSpeakerFromAudioLevels(): void {
    // Clear existing timer
    if (this.dominantSpeakerTimer) {
      clearTimeout(this.dominantSpeakerTimer);
    }

    // Find participant with highest audio level above threshold
    let maxLevel = 0.1; // Minimum threshold
    let newDominantSpeaker: string | undefined;

    for (const [participantId, level] of this.audioLevels) {
      if (level > maxLevel) {
        maxLevel = level;
        newDominantSpeaker = participantId;
      }
    }

    // Set new dominant speaker if different
    if (newDominantSpeaker !== this.dominantSpeakerId) {
      this.setDominantSpeaker(newDominantSpeaker);
    }

    // Clear dominant speaker after period of silence
    if (newDominantSpeaker) {
      this.dominantSpeakerTimer = setTimeout(() => {
        // Check if still speaking
        const currentLevel = this.audioLevels.get(newDominantSpeaker!) || 0;
        if (currentLevel <= 0.1) {
          this.setDominantSpeaker(undefined);
        }
      }, 2000); // 2 seconds of silence
    }
  }

  /**
   * Destroy the peer manager
   */
  destroy(): void {
    this.clear();
    this.removeAllListeners();
  }
}
