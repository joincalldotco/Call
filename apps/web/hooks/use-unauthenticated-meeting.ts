import { useState, useCallback, useEffect } from "react";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { CALLS_QUERY } from "@/lib/QUERIES";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import type { Call } from "@/lib/types";

const meetingSchema = z.object({
  name: z.string().min(1).max(20).trim(),
  meetingId: z.string().min(1).max(6).optional(),
});

type MeetingData = z.infer<typeof meetingSchema>;

interface UseUnauthenticatedMeetingReturn {
  formData: MeetingData;
  errors: Record<string, string>;
  isLoading: boolean;
  updateFormData: (field: keyof MeetingData, value: string) => void;
  validateForm: () => boolean;
  joinMeeting: (data: MeetingData) => Promise<void>;
  startMeeting: (data: MeetingData) => Promise<void>;
  clearErrors: () => void;
  resetForm: () => void;
}

const MAX_NAME_LENGTH = 20;
const MAX_MEETING_ID_LENGTH = 6;
const DISPLAY_NAME_KEY = "call_display_name";

const validationErrors: Record<string, string> = {
  name: `Name must be less than ${MAX_NAME_LENGTH} characters`,
  meetingId: `Meeting ID must be less than ${MAX_MEETING_ID_LENGTH} characters`,
};

export const useUnauthenticatedMeeting =
  (): UseUnauthenticatedMeetingReturn => {
    const router = useRouter();

    const [formData, setFormData] = useState<MeetingData>(() => {
      if (typeof window !== "undefined") {
        const storedName = localStorage.getItem(DISPLAY_NAME_KEY);
        return {
          name: storedName || "",
          meetingId: "",
        };
      }
      return {
        name: "",
        meetingId: "",
      };
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
      if (typeof window !== "undefined") {
        const storedName = localStorage.getItem(DISPLAY_NAME_KEY);
        if (storedName) {
          setFormData((prev) => ({ ...prev, name: storedName }));
        }
      }
    }, []);

    const updateFormData = useCallback(
      (field: keyof MeetingData, value: string) => {
        setFormData((prev) => ({ ...prev, [field]: value }));

        if (field === "name" && typeof window !== "undefined") {
          localStorage.setItem(DISPLAY_NAME_KEY, value);
        }

        if (errors[field]) {
          setErrors((prev) => ({ ...prev, [field]: "" }));
        }
      },
      []
    );

    const clearErrors = useCallback(() => {
      setErrors({});
    }, []);

    const resetForm = useCallback(() => {
      setFormData((prev) => ({ ...prev, meetingId: "" }));
      setErrors({});
    }, []);

    const validateForm = useCallback((): boolean => {
      const newErrors: Record<string, string> = {};

      if (!formData.name.trim()) {
        newErrors.name = "Name is required";
      } else if (formData.name.length > MAX_NAME_LENGTH) {
        newErrors.name = validationErrors.name || "";
      }

      if (
        formData.meetingId &&
        formData.meetingId.length > MAX_MEETING_ID_LENGTH
      ) {
        newErrors.meetingId = validationErrors.meetingId || "";
      }

      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    }, [formData]);

    const createCallMutation = useMutation({
      mutationFn: CALLS_QUERY.createCall,
      onSuccess: (data: { callId: string }) => {
        toast.success("Call created successfully!");
        router.push(`/r/${data.callId}`);
        resetForm();
      },
      onError: (error) => {
        console.error("Failed to create call:", error);
        toast.error("Failed to create call. Please try again.");
      },
    });

    const joinCallMutation = useMutation({
      mutationFn: async (meetingId: string) => {
        const res = await apiClient.get(`/calls/${meetingId}`);
        if (res.status === 200) {
          return res.data as { call: Call };
        }
        throw new Error("Failed to join call");
      },
      onSuccess: (data: { call: Call }) => {
        toast.success("Joined call successfully!");
        window.location.href = `/r/${data.call.id}`;
        resetForm();
      },
      onError: (error) => {
        console.error("Failed to join call:", error);
        toast.error("Failed to join call. Please check the meeting ID.");
      },
    });

    const joinMeeting = useCallback(
      async (data: MeetingData): Promise<void> => {
        if (!validateForm()) return;

        if (!data.meetingId) {
          setErrors((prev) => ({
            ...prev,
            meetingId: "Meeting ID is required to join",
          }));
          return;
        }

        try {
          const isUrl = data.meetingId.startsWith("https://");
          let meetingIdOrUrl = data.meetingId;

          if (isUrl) {
            const url = new URL(data.meetingId);
            meetingIdOrUrl = url.pathname.split("/").pop() ?? "";
          }

          if (!meetingIdOrUrl) {
            setErrors((prev) => ({
              ...prev,
              meetingId: validationErrors.meetingId || "",
            }));
            return;
          }

          if (meetingIdOrUrl.length > MAX_MEETING_ID_LENGTH) {
            setErrors((prev) => ({
              ...prev,
              meetingId: validationErrors.meetingId || "",
            }));
            return;
          }

          joinCallMutation.mutate(meetingIdOrUrl);
        } catch (error) {
          console.error("Error joining meeting:", error);
          setErrors((prev) => ({
            ...prev,
            meetingId: "Failed to join meeting",
          }));
        }
      },
      [validateForm, joinCallMutation]
    );

    const startMeeting = useCallback(
      async (data: MeetingData): Promise<void> => {
        if (!validateForm()) return;

        createCallMutation.mutate({
          name: data.name,
          members: [],
        });
      },
      [validateForm, createCallMutation]
    );

    const isLoading =
      createCallMutation.isPending || joinCallMutation.isPending;

    return {
      formData,
      errors,
      isLoading,
      updateFormData,
      validateForm,
      joinMeeting,
      startMeeting,
      clearErrors,
      resetForm,
    };
  };
