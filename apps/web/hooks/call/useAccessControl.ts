import { useState, useEffect } from "react";
import { useSession } from "@/hooks/useSession";

interface CreatorInfo {
  id: string;
  name: string;
  email?: string;
}

export function useAccessControl(callId: string) {
  const { session } = useSession();
  const [hasAccess, setHasAccess] = useState(false);
  const [isCreator, setIsCreator] = useState(false);
  const [isRequestingAccess, setIsRequestingAccess] = useState(false);
  const [creatorInfo, setCreatorInfo] = useState<CreatorInfo | null>(null);

  // Fetch creator info
  useEffect(() => {
    if (!callId) return;

    const fetchCreatorInfo = async () => {
      try {
        const response = await fetch(
          `http://localhost:1284/api/calls/${callId}/creator`,
          {
            credentials: "include",
          }
        );

        if (response.ok) {
          const data = await response.json();
          setCreatorInfo({
            id: data.creator.creatorId,
            name: data.creator.creatorName,
            email: data.creator.creatorEmail,
          });
        }
      } catch (error) {
        console.error("Error fetching creator info:", error);
      }
    };

    fetchCreatorInfo();
  }, [callId]);

  // Check access periodically
  useEffect(() => {
    if (!callId || !session?.user?.id) return;

    const checkAccess = async () => {
      try {
        const response = await fetch(
          `http://localhost:1284/api/calls/${callId}/check-access`,
          {
            credentials: "include",
          }
        );

        if (response.ok) {
          const data = await response.json();
          setHasAccess(data.hasAccess);
          setIsCreator(data.isCreator);
        }
      } catch (error) {
        console.error("Error checking access:", error);
      }
    };

    checkAccess();
    const interval = setInterval(checkAccess, 3000);
    return () => clearInterval(interval);
  }, [callId, session?.user?.id]);

  const requestAccess = async () => {
    if (!callId || !session?.user?.id) {
      throw new Error("Must be logged in to request access");
    }

    setIsRequestingAccess(true);
    try {
      const response = await fetch(
        `http://localhost:1284/api/calls/${callId}/request-join`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to request access");
      }
    } finally {
      setIsRequestingAccess(false);
    }
  };

  return {
    hasAccess,
    isCreator,
    isRequestingAccess,
    requestAccess,
    creatorInfo,
  };
}
