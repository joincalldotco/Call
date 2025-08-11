"use client";

import { Avatar } from "@call/ui/components/avatar";
import { Badge } from "@call/ui/components/badge";
import { Button } from "@call/ui/components/button";
import { Separator } from "@call/ui/components/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@call/ui/components/sheet";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  FiCheck,
  FiClock,
  FiMic,
  FiMicOff,
  FiStar,
  FiUserPlus,
  FiUsers,
  FiVideo,
  FiVideoOff,
  FiX,
} from "react-icons/fi";
import { toast } from "sonner";
interface Participant {
  id: string;
  displayName: string;
  isCreator?: boolean;
  isMicOn?: boolean;
  isCameraOn?: boolean;
  connectionState?: string;
}

interface JoinRequest {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  timestamp: Date;
}

interface ParticipantsSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  callId: string;
  isCreator: boolean;
  participants: Participant[];
  currentUserId: string;
}

export function ParticipantsSidebar({
  open,
  onOpenChange,
  callId,
  isCreator,
  participants,
  currentUserId,
}: ParticipantsSidebarProps) {
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const previousJoinRequestsRef = useRef<JoinRequest[]>([]);

  const creator = participants.find((p) => p.isCreator);

  useEffect(() => {
    if (!isCreator || !open) return;

    const fetchJoinRequests = async () => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/calls/${callId}/join-requests`,
          {
            credentials: "include",
          }
        );

        if (response.ok) {
          const data = await response.json();
          const newJoinRequests = data.requests || [];

          const previousIds = new Set(
            previousJoinRequestsRef.current.map((req: JoinRequest) => req.id)
          );
          const newRequests = newJoinRequests.filter(
            (req: JoinRequest) => !previousIds.has(req.id)
          );

          previousJoinRequestsRef.current = newJoinRequests;
          setJoinRequests(newJoinRequests);
        }
      } catch (error) {
        console.error("Error fetching join requests:", error);
      }
    };

    fetchJoinRequests();

    const interval = setInterval(fetchJoinRequests, 5000);
    return () => clearInterval(interval);
  }, [callId, isCreator, open]);

  const handleApproveRequest = async (userId: string) => {
    setLoading(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/calls/${callId}/approve-join`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({ requesterId: userId }),
        }
      );

      if (response.ok) {
        setJoinRequests((prev) => prev.filter((req) => req.userId !== userId));
      } else {
        const data = await response.json();

        toast.error(data.error || "Failed to approve request");
      }
    } catch (error) {
      console.error("Error approving request:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRejectRequest = async (userId: string) => {
    setLoading(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/calls/${callId}/reject-join`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({ requesterId: userId }),
        }
      );

      if (response.ok) {
        setJoinRequests((prev) => prev.filter((req) => req.userId !== userId));
      } else {
        const data = await response.json();

        toast.error(data.error || "Failed to reject request");
      }
    } catch (error) {
      console.error("Error rejecting request:", error);
    } finally {
      setLoading(false);
    }
  };

  // Generate shareable invite URL for the current call
  const invitePath = usePathname();
  const inviteURL = `${window.location.origin}${invitePath}`;

  const copyInviteURL = async () => {
    try {
      await navigator.clipboard.writeText(inviteURL);
      toast.success("Invite link copied");
    } catch (error) {
      console.error("Error copying invite URL:", error);
      toast.error("Failed to copy invite link");
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-80 p-4">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <FiUsers className="h-5 w-5" />
            Participants
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <div>
            {creator && (
              <div className="mb-4">
                <h3 className="mb-3 flex items-center gap-2 font-medium">
                  <FiStar className="h-4 w-4 text-yellow-500" />
                  Meeting Creator
                </h3>
                <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-gradient-to-r from-blue-500/10 to-purple-500/10 p-3 dark:border-blue-800">
                  <Avatar className="h-10 w-10">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-purple-600 text-sm font-medium text-white ring-2 ring-white dark:ring-gray-900">
                      {creator.displayName.charAt(0).toUpperCase()}
                    </div>
                  </Avatar>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                        {creator.id === currentUserId
                          ? `${creator.displayName} (You)`
                          : creator.displayName}
                      </p>
                      <Badge
                        variant="secondary"
                        className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100 dark:hover:bg-yellow-900"
                      >
                        <FiStar className="mr-1 h-3 w-3" />
                        Creator
                      </Badge>
                    </div>
                    <div className="mt-1 flex items-center gap-1">
                      {creator.isMicOn ? (
                        <FiMic className="h-3 w-3 text-green-600 dark:text-green-500" />
                      ) : (
                        <FiMicOff className="h-3 w-3 text-red-500" />
                      )}
                      {creator.isCameraOn ? (
                        <FiVideo className="h-3 w-3 text-green-600 dark:text-green-500" />
                      ) : (
                        <FiVideoOff className="h-3 w-3 text-red-500" />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <h3 className="mb-3 flex items-center gap-2 font-medium">
              <FiUsers className="h-4 w-4" />
              {creator && creator.id !== currentUserId
                ? "Other Participants"
                : "Participants"}{" "}
              ({participants.filter((p) => !p.isCreator).length})
            </h3>
            <div className="space-y-2">
              {participants
                .filter((p) => !p.isCreator)
                .map((participant) => (
                  <div
                    key={participant.id}
                    className={`flex items-center gap-3 rounded-lg p-2 ${
                      participant.id === currentUserId
                        ? "bg-blue-50"
                        : "bg-muted/50"
                    }`}
                  >
                    <Avatar className="h-8 w-8">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-sm font-medium text-white">
                        {participant.displayName.charAt(0).toUpperCase()}
                      </div>
                    </Avatar>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium">
                          {participant.id === currentUserId
                            ? `${participant.displayName} (You)`
                            : participant.displayName}
                        </p>
                      </div>
                      <div className="mt-1 flex items-center gap-1">
                        {participant.isMicOn ? (
                          <FiMic className="h-3 w-3 text-green-600" />
                        ) : (
                          <FiMicOff className="h-3 w-3 text-red-500" />
                        )}
                        {participant.isCameraOn ? (
                          <FiVideo className="h-3 w-3 text-green-600" />
                        ) : (
                          <FiVideoOff className="h-3 w-3 text-red-500" />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {isCreator && (
            <>
              <Separator />
              <div>
                <h3 className="mb-3 flex items-center gap-2 font-medium">
                  <FiUserPlus className="h-4 w-4" />
                  Join Requests
                  {joinRequests.length > 0 && (
                    <Badge variant="destructive" className="ml-auto">
                      {joinRequests.length}
                    </Badge>
                  )}
                </h3>

                {joinRequests.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    No pending requests
                  </p>
                ) : (
                  <div className="space-y-3">
                    {joinRequests.map((request) => (
                      <div
                        key={request.id}
                        className="bg-background rounded-lg border p-3"
                      >
                        <div className="flex items-start gap-3">
                          <Avatar className="h-8 w-8">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-green-500 to-blue-600 text-sm font-medium text-white">
                              {request.userName.charAt(0).toUpperCase()}
                            </div>
                          </Avatar>

                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium">
                              {request.userName}
                            </p>
                            <p className="text-muted-foreground truncate text-xs">
                              {request.userEmail}
                            </p>
                            <div className="text-muted-foreground mt-1 flex items-center gap-1 text-xs">
                              <FiClock className="h-3 w-3" />
                              {new Date(request.timestamp).toLocaleTimeString()}
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleApproveRequest(request.userId)}
                            disabled={loading}
                            className="flex-1"
                          >
                            <FiCheck className="mr-1 h-3 w-3" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRejectRequest(request.userId)}
                            disabled={loading}
                            className="flex-1"
                          >
                            <FiX className="mr-1 h-3 w-3" />
                            Reject
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
        <div className="absolute bottom-4 left-4 right-4">
          <Button onClick={copyInviteURL} variant="outline" className="w-full">
            Invite
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
