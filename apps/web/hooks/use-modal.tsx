import type { Team, Participant } from "@/lib/types";
import { create } from "zustand";

type ModalType =
  | "create-team"
  | "add-member"
  | "start-call"
  | "create-contact"
  | "thoughts"
  | "add-member-to-team"
  | "view-participants";

interface CallInfo {
  id: string;
  name: string;
}

interface ModalData {
  team?: Team;
  participants?: Participant[];
  callInfo?: CallInfo;
  selectedContact?: string;
}

interface ModalStore {
  type: ModalType | null;
  isOpen: boolean;
  onOpen: (type: ModalType, data?: ModalData) => void;
  onClose: () => void;
  data: ModalData;
}

export const useModal = create<ModalStore>((set) => ({
  type: null,
  isOpen: false,
  data: {},
  onOpen: (type, data = {}) => set({ isOpen: true, type, data }),
  onClose: () => set({ type: null, isOpen: false, data: {} }),
}));