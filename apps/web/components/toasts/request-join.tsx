"use client";

import { Button } from "@call/ui/components/button";
import { toast } from "sonner";

interface RequestJoinToastProps {
  name: string;
  reqId: string;
  roomId: string;
  peerId: string;
  socket: WebSocket;
  requesterId: string;
  toastId: string | number;
}

export const RequestJoinToast = ({
  name,
  reqId,
  roomId,
  peerId,
  socket,
  requesterId,
  toastId,
}: RequestJoinToastProps) => {
  const handleAccept = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/calls/${roomId}/approve-join`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({ requesterId: requesterId }),
        }
      );

      if (response.ok) {
        socket?.send(
          JSON.stringify({
            type: "acceptJoin",
            reqId,
            roomId,
            peerId,
          })
        );
        toast.dismiss(toastId);
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to approve request");
      }
    } catch (error) {
      console.error("Error approving join request:", error);
      toast.error("Failed to approve request");
    }
  };

  const handleReject = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/calls/${roomId}/reject-join`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({ requesterId: peerId }),
        }
      );

      if (response.ok) {
        socket?.send(
          JSON.stringify({
            type: "rejectJoin",
            reqId,
            roomId,
            peerId,
          })
        );
        toast.success(`${name} has been rejected from joining the call`);
        toast.dismiss(toastId);
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to reject request");
      }
    } catch (error) {
      console.error("Error rejecting join request:", error);
      toast.error("Failed to reject request");
    }
  };

  return (
    <div className="bg-sidebar flex size-full flex-col gap-2 rounded-lg border p-4">
      <p className="text-sm font-medium">
        <span className="font-bold">{name}</span> is requesting to join
      </p>
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={handleAccept}>
          Accept
        </Button>
        <Button
          variant="destructive"
          size="sm"
          onClick={handleReject}
          className="bg-primary-red hover:bg-primary-red/80"
        >
          Reject
        </Button>
      </div>
    </div>
  );
};
