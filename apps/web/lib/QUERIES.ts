import { apiClient } from "./api-client";
import type { Call, Team } from "./types";

export const CONTACTS_QUERY = {
  getContacts: async () => {
    const res = await apiClient.get("/contacts");
    if (res.status === 200) {
      return res.data;
    }
    throw new Error("Failed to fetch contacts");
  },
  createContact: async (data: { email: string }) => {
    const res = await apiClient.post("/contacts/invite", {
      receiverEmail: data.email,
    });
    if (res.status === 200 || res.status === 201) {
      return res.data;
    }
    throw new Error("Failed to create contact");
  },
};

export const CALLS_QUERY = {
  createCall: async (data: { name: string; members: string[] }) => {
    const res = await apiClient.post("/calls/create", data);
    if (res.status === 200) {
      return res.data;
    }
    throw new Error("Failed to fetch calls");
  },
  getCalls: async () => {
    const res = await apiClient.get("/calls/participated");
    if (res.status === 200) {
      return res.data.calls as Call[];
    }
    throw new Error("Failed to fetch calls");
  },
  hideCall: async (callId: string) => {
    const res = await apiClient.post(`/calls/${callId}/hide`);
    if (res.status === 200) {
      return res.data;
    }
    throw new Error("Failed to hide call");
  },
};

export const TEAMS_QUERY = {
  createTeam: async (data: { name: string; members: string[] }) => {
    const res = await apiClient.post("/teams/create", data);
    if (res.status === 200) {
      return res.data;
    }
    throw new Error("Failed to create team");
  },
  getTeams: async () => {
    const res = await apiClient.get("/teams");
    if (res.status === 200) {
      return res.data.teams as Team[];
    }
    throw new Error("Failed to fetch teams");
  },
  deleteTeam: async (teamId: string) => {
    const res = await apiClient.post(`/teams/${teamId}/leave`);
    if (res.status === 200) {
      return res.data;
    }
    throw new Error("Failed to delete team");
  },
  addMembers: async (teamId: string, data: { emails: string[] }) => {
    const res = await apiClient.post(`/teams/${teamId}/add-members`, data);
    if (res.status === 200) {
      return res.data;
    }
    throw new Error("Failed to add members");
  },
};

export const THOUGHTS_QUERY = {
  createThought: async (data: { type: string; description: string }) => {
    const res = await apiClient.post("/thoughts/create", data);
    if (res.status === 200) {
      return res.data;
    }
    throw new Error("Failed to create thought");
  },
};
