"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@call/ui/components/button";
import { Icons } from "@call/ui/components/icons";
import { Input } from "@call/ui/components/input";
import { iconvVariants, UserProfile } from "@call/ui/components/use-profile";
import { cn } from "@call/ui/lib/utils";
import {
  Bell,
  Users,
  UserPlus,
  CheckCircle,
  XCircle,
  Clock,
  Video,
  Calendar,
  X,
  Loader2,
} from "lucide-react";
import SocialButton from "@/components/auth/social-button";
import { useSession } from "@/components/providers/session";

interface Notification {
  id: string;
  message: string;
  callId: string | null;
  callName?: string | null;
  invitationId?: string | null;
  invitationStatus?: string | null;
  inviterName?: string | null;
  inviterEmail?: string | null;
  inviterProfilePictureUrl?: string | null;
  createdAt: string;
  type?: "call" | "contact";
  contactRequestId?: string;
  contactRequestStatus?: "pending" | "accepted" | "rejected";
  senderName?: string;
  senderEmail?: string;
  senderProfilePictureUrl?: string | null;
}

// Sub-section options for notifications
const SECTIONS = {
  all: "All notifications",
  calls: "Calls",
  schedules: "Schedules",
  teams: "Teams",
  contacts: "Contacts",
};

interface NotificationSectionProps {
  section: string;
}

const NotificationSection = ({ section }: NotificationSectionProps) => {
  const { user } = useSession();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();

  useEffect(() => {
    if (user.id === "guest") {
      setLoading(false);
      setNotifications([]);
      return;
    }
    const fetchNotifications = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch both call notifications and contact requests
        const [notificationsRes, contactRequestsRes] = await Promise.all([
          fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/notifications`, {
            credentials: "include",
          }),
          fetch(
            `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/contacts/requests`,
            {
              credentials: "include",
            }
          ),
        ]);

        if (!notificationsRes.ok)
          throw new Error("Failed to load notifications");
        if (!contactRequestsRes.ok)
          throw new Error("Failed to load contact requests");

        const [notificationsData, contactRequestsData] = await Promise.all([
          notificationsRes.json(),
          contactRequestsRes.json(),
        ]);

        // Transform contact requests into notifications format
        const contactNotifications = (contactRequestsData.requests || []).map(
          (req: any) => ({
            id: req.id,
            type: "contact",
            message: `${req.senderName || req.senderEmail} wants to connect with you`,
            callId: null,
            contactRequestId: req.id,
            contactRequestStatus: "pending",
            senderName: req.senderName,
            senderEmail: req.senderEmail,
            senderProfilePictureUrl: req.profilePictureUrl || null,
            createdAt: new Date().toISOString(), // Since we don't have the actual creation date
          })
        );

        // Combine both types of notifications
        setNotifications([
          ...contactNotifications,
          ...(notificationsData.notifications || []).map((n: any) => ({
            ...n,
            type: "call",
            inviterProfilePictureUrl: n.inviterProfilePictureUrl || null,
          })),
        ]);
      } catch (err: any) {
        setError(err.message || "Unknown error");
      } finally {
        setLoading(false);
      }
    };
    fetchNotifications();
  }, [user.id]);

  // Memoized filtered notifications
  const filteredNotifications = useMemo(() => {
    if (!notifications) return [];

    let filtered = [...notifications];

    // Apply section filter
    if (section === "calls") {
      filtered = filtered.filter(
        (n) =>
          n.type === "call" &&
          n.invitationId &&
          !(
            typeof n.message === "string" &&
            n.message.includes("started a meeting in team")
          )
      );
    } else if (section === "teams") {
      filtered = filtered.filter(
        (n) =>
          n.type === "call" &&
          typeof n.message === "string" &&
          n.message.includes("started a meeting in team")
      );
    } else if (section === "contacts") {
      filtered = filtered.filter((n) => n.type === "contact");
    } else if (section === "schedules") {
      // Placeholder for future schedule notifications
      filtered = [];
    }

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((notification) => {
        const searchableFields = [
          notification.message,
          notification.inviterName,
          notification.inviterEmail,
          notification.senderName,
          notification.senderEmail,
          notification.callName,
        ];

        return searchableFields.some((field) =>
          field?.toLowerCase().includes(query)
        );
      });
    }

    return filtered;
  }, [notifications, searchQuery, section]);

  const clearSearch = () => {
    setSearchQuery("");
  };

  const handleAccept = async (
    invitationId?: string,
    callId?: string | null
  ) => {
    if (!invitationId || !callId) return;
    setActionLoading(invitationId);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/calls/invitations/${invitationId}/accept`,
        {
          method: "PATCH",
          credentials: "include",
        }
      );
      const data = await res.json();
      if (res.ok && data.callId) {
        router.push(`/app/call/${data.callId}`);
      } else {
        setError(data.message || "Could not accept invitation");
      }
    } catch (err: any) {
      setError(err.message || "Unknown error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (invitationId?: string) => {
    if (!invitationId) return;
    setActionLoading(invitationId);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/calls/invitations/${invitationId}/reject`,
        {
          method: "PATCH",
          credentials: "include",
        }
      );
      if (res.ok) {
        setNotifications((prev) =>
          prev.filter((n) => n.invitationId !== invitationId)
        );
      } else {
        const data = await res.json();
        setError(data.message || "Could not reject invitation");
      }
    } catch (err: any) {
      setError(err.message || "Unknown error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleContactAction = async (
    requestId: string,
    action: "accept" | "reject"
  ) => {
    if (!requestId) return;
    setActionLoading(requestId);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/contacts/requests/${requestId}/${action}`,
        {
          method: "PATCH",
          credentials: "include",
        }
      );
      if (res.ok) {
        setNotifications((prev) =>
          prev.filter((n) => n.contactRequestId !== requestId)
        );
      } else {
        const data = await res.json();
        setError(data.message || `Could not ${action} contact request`);
      }
    } catch (err: any) {
      setError(err.message || "Unknown error");
    } finally {
      setActionLoading(null);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return "Just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400)
      return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 2592000)
      return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  const getNotificationType = (notification: Notification) => {
    if (notification.type === "contact") return "contact";
    if (notification.message?.includes("team")) return "team";
    return "call";
  };

  if (user.id === "guest") {
    return (
      <div className="space-y-6 px-10">
        <div className="flex flex-col gap-6">
          <NoNotificationsFound />
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex h-64 items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="text-primary h-6 w-6 animate-spin" />
            <p className="text-muted-foreground text-sm">
              Loading notifications...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex h-64 items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="rounded-full bg-red-50 p-3">
              <Bell className="h-8 w-8 text-red-500" />
            </div>
            <p className="text-sm text-red-500">Failed to load notifications</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.reload()}
            >
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const hasNotifications = notifications && notifications.length > 0;
  const hasSearchResults = filteredNotifications.length > 0;

  return (
    <div className="px-10">
      <div className="flex flex-col gap-6">
        {hasNotifications ? (
          <div className="flex items-center gap-2">
            <div className="relative w-full max-w-md">
              <Input
                type="text"
                placeholder="Search notifications..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="focus:ring-primary/20 h-11 rounded-md border py-2.5 pl-10 pr-10 text-sm focus:outline-none focus:ring-2"
              />
              <Icons.search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={clearSearch}
                  className="hover:bg-muted/50 absolute right-2 top-1/2 h-7 w-7 -translate-y-1/2 transform"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        ) : null}

        {/* No results message */}
        {hasNotifications && !hasSearchResults && (
          <div className="flex h-64 flex-col items-center justify-center text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="bg-muted/50 rounded-full p-4">
                <Bell className="text-muted-foreground h-8 w-8" />
              </div>
              <h3 className="text-lg font-medium">No notifications found</h3>
              <p className="text-muted-foreground max-w-sm">
                No notifications match your search criteria. Try adjusting your
                search terms.
              </p>
              {searchQuery && (
                <Button variant="outline" size="sm" onClick={clearSearch}>
                  Clear Search
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Notifications list */}
        {hasSearchResults && (
          <div className="flex flex-col gap-3">
            {filteredNotifications.map((notification) => (
              <NotificationCard
                key={notification.id}
                notification={notification}
                onAccept={handleAccept}
                onReject={handleReject}
                onContactAction={handleContactAction}
                isActionLoading={
                  actionLoading === notification.id ||
                  actionLoading === notification.invitationId ||
                  actionLoading === notification.contactRequestId
                }
                onJoinCall={() =>
                  notification.callId &&
                  router.push(`/app/call/${notification.callId}`)
                }
              />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!hasNotifications && <NoNotificationsFound />}
      </div>
    </div>
  );
};

interface NotificationCardProps {
  notification: Notification;
  onAccept: (invitationId?: string, callId?: string | null) => void;
  onReject: (invitationId?: string) => void;
  onContactAction: (requestId: string, action: "accept" | "reject") => void;
  isActionLoading: boolean;
  onJoinCall: () => void;
}

const NotificationCard = ({
  notification,
  onAccept,
  onReject,
  onContactAction,
  isActionLoading,
  onJoinCall,
}: NotificationCardProps) => {
  const getNotificationType = (notification: Notification) => {
    if (notification.type === "contact") return "contact";
    if (notification.message?.includes("team")) return "team";
    return "call";
  };

  const notificationType = getNotificationType(notification);
  const isContact = notification.type === "contact";
  const senderName = isContact
    ? notification.senderName
    : notification.inviterName;
  const senderEmail = isContact
    ? notification.senderEmail
    : notification.inviterEmail;
  const profilePictureUrl = isContact
    ? notification.senderProfilePictureUrl
    : notification.inviterProfilePictureUrl;
  const displayName = senderName || senderEmail || "Unknown User";

  const typeIcons: Record<string, React.ReactElement> = {
    call: <Icons.phoneIcon className="h-4 w-4" />,
    team: <Icons.users className="h-4 w-4" />,
    contact: <UserPlus className="h-4 w-4" />,
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return "Just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400)
      return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 2592000)
      return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="bg-inset-accent flex flex-col gap-3 rounded-md border p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {typeIcons[notificationType]}
          <h1 className="font-medium first-letter:uppercase">{displayName}</h1>
        </div>
        <div className="text-muted-foreground flex items-center gap-1 text-xs">
          <Clock className="h-3.5 w-3.5" />
          {formatTimeAgo(notification.createdAt)}
        </div>
      </div>

      <div className="text-muted-foreground text-sm">
        {notification.message}
      </div>

      <div className="flex items-center gap-2">
        <UserProfile
          name={displayName}
          url={profilePictureUrl}
          size="sm"
          className="border-inset-accent border"
        />
      </div>

      {/* Action buttons */}
      {isContact ? (
        <div className="flex gap-2">
          <Button
            onClick={() =>
              onContactAction(notification.contactRequestId!, "accept")
            }
            disabled={isActionLoading}
            className="h-8 rounded-lg border border-gray-200 bg-white px-3 text-xs font-medium text-gray-900 hover:bg-gray-50"
          >
            {isActionLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Accept"
            )}
          </Button>
          <Button
            variant="ghost"
            onClick={() =>
              onContactAction(notification.contactRequestId!, "reject")
            }
            disabled={isActionLoading}
            className="h-8 rounded-lg text-xs font-medium text-[#ff6347] hover:bg-white/5 hover:text-[#ff6347]/80"
          >
            {isActionLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Decline"
            )}
          </Button>
        </div>
      ) : notification.invitationStatus === "pending" &&
        notification.invitationId ? (
        <div className="flex gap-2">
          <Button
            onClick={() =>
              onAccept(
                notification.invitationId ?? undefined,
                notification.callId
              )
            }
            disabled={isActionLoading}
            className="h-8 flex-1 rounded-lg border border-gray-200 bg-white px-3 text-xs font-medium text-gray-900 hover:bg-gray-50"
          >
            {isActionLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Join Call"
            )}
          </Button>
          <Button
            variant="ghost"
            onClick={() => onReject(notification.invitationId ?? undefined)}
            disabled={isActionLoading}
            className="h-8 flex-1 rounded-lg text-xs font-medium text-[#ff6347] hover:bg-white/5 hover:text-[#ff6347]/80"
          >
            {isActionLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Decline"
            )}
          </Button>
        </div>
      ) : notification.invitationStatus === "accepted" ? (
        <div className="flex items-center gap-2 text-green-600">
          <CheckCircle className="h-4 w-4" />
          <span className="text-sm">Accepted</span>
        </div>
      ) : notification.invitationStatus === "rejected" ? (
        <div className="flex items-center gap-2 text-red-600">
          <XCircle className="h-4 w-4" />
          <span className="text-sm">Declined</span>
        </div>
      ) : notification.callId ? (
        <Button onClick={onJoinCall} className="w-full" size="sm">
          Join Meeting
        </Button>
      ) : null}
    </div>
  );
};

const NoNotificationsFound = () => {
  const { user } = useSession();
  const isGuest = !user?.id || user.id === "guest";

  return (
    <div className="bg-inset-accent border-inset-accent-foreground col-span-full flex h-96 flex-col items-center justify-center gap-4 rounded-xl border p-4 text-center">
      <div className="flex flex-col items-center">
        <h1 className="text-lg font-medium">
          {isGuest
            ? "Sign in to view notifications"
            : "You don\'t have any notifications yet."}
        </h1>
        <p className="text-muted-foreground">
          {isGuest
            ? "Access your notifications and stay updated."
            : "Notifications will appear here when you receive calls or contact requests."}
        </p>
      </div>
      {isGuest ? <SocialButton /> : null}
    </div>
  );
};

export default NotificationSection;
