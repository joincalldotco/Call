"use client";

import { useSession } from "@/components/providers/session";
import { useModal } from "@/hooks/use-modal";
import { Skeletons } from "@/components/skeletons";
import { CALLS_QUERY } from "@/lib/QUERIES";
import type { Call } from "@/lib/types";
import { formatCallDuration, formatCustomDate } from "@/lib/utils";
import { Button } from "@call/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@call/ui/components/dropdown-menu";
import { Icons } from "@call/ui/components/icons";
import { Input } from "@call/ui/components/input";
import { iconvVariants, UserProfile } from "@call/ui/components/use-profile";
import { cn } from "@call/ui/lib/utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MoreVertical, Trash, Users, X, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import SocialButton from "@/components/auth/social-button";

type FilterType = "all" | "my-calls" | "shared-with-me";

export function CallHistory() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const { user } = useSession();

  const {
    data: calls,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["calls"],
    queryFn: () => CALLS_QUERY.getCalls(),
    enabled: user.id !== "guest",
  });

  const filteredCalls = useMemo(() => {
    if (!calls) return [];

    let filtered = [...calls];

    if (activeFilter === "my-calls") {
      filtered = filtered.filter((call) => call.creatorId === user.id);
    } else if (activeFilter === "shared-with-me") {
      filtered = filtered.filter((call) => call.creatorId !== user.id);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((call) => {
        const searchableFields = [
          call.name,
          ...call.participants.map((p) => p.name),
          ...call.participants.map((p) => p.email),
        ];

        return searchableFields.some((field) =>
          field?.toLowerCase().includes(query)
        );
      });
    }

    return filtered;
  }, [calls, searchQuery, activeFilter, user.id]);

  const clearSearch = () => {
    setSearchQuery("");
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="relative w-full max-w-md">
          <Input
            type="text"
            placeholder="Search by call name or participant..."
            disabled
            className="focus:ring-primary/20 h-11 !rounded-md border py-2.5 pl-10 pr-10 text-sm focus:outline-none focus:ring-2"
          />
          <Icons.search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-50" />
        </div>

        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeletons.callHistory key={index} />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6 py-6">
        <div className="flex h-64 items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="rounded-full bg-red-50 p-3">
              <Icons.phoneIcon className="size-8 text-red-500" />
            </div>
            <p className="text-sm text-red-500">Failed to load call history</p>
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

  const hasCallHistory = calls && calls.length > 0;
  const hasSearchResults = filteredCalls.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-6">
        {hasCallHistory ? (
          <div className="flex items-center gap-2">
            <div className="relative w-full max-w-md">
              <Input
                type="text"
                placeholder="Search by call name or participant..."
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

        {hasCallHistory && !hasSearchResults && (
          <div className="flex h-64 flex-col items-center justify-center text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="bg-muted/50 rounded-full p-4">
                <Icons.phoneIcon className="text-muted-foreground size-8" />
              </div>
              <h3 className="text-lg font-medium">No calls found</h3>
              <p className="text-muted-foreground max-w-sm">
                No calls match your search criteria. Try adjusting your search
                terms.
              </p>
              {searchQuery && (
                <Button variant="outline" size="sm" onClick={clearSearch}>
                  Clear Search
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Call grid */}
        {hasSearchResults && (
          <div className="flex flex-col gap-3">
            {filteredCalls.map((call) => (
              <CallHistoryCard key={call.id} call={call} />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!hasCallHistory && <NoCallsFound />}
      </div>
    </div>
  );
}

interface CallHistoryCardProps {
  call: Call;
}

const CallHistoryCard = ({ call }: CallHistoryCardProps) => {
  const participantsToShow = 3;
  const remainingParticipants = call.participants.length - participantsToShow;
  const queryClient = useQueryClient();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleHideCall = async () => {
    try {
      setIsDeleting(true);
      await CALLS_QUERY.hideCall(call.id);
      queryClient.invalidateQueries({ queryKey: ["calls"] });
    } catch (error) {
      console.error("Failed to hide call:", error);
    } finally {
      setIsDeleting(false);
    }
  };
  const { onOpen } = useModal();
  const handleViewUsers = () => {
    onOpen("view-participants", {
      participants: call.participants.map((p) => ({
        id: p.id,
        name: p.name,
        email: p.email,
        image: p.image ?? undefined,
        joinedAt: p.joinedAt ?? undefined,
        leftAt: p.leftAt ?? undefined,
      })),
      callInfo: {
        id: call.id,
        name: call.name,
      },
    });
  };

  return (
    <div className="bg-inset-accent flex flex-col gap-3 rounded-md border p-4">
      <div className="flex items-center justify-between">
        <h1 className="font-medium first-letter:uppercase">{call.name}</h1>

        <div className="flex">
          <Button
            className="flex items-center justify-center"
            variant="ghost"
            size="icon"
            onClick={handleViewUsers}
          >
            <Users className="h-4 w-4" />
          </Button>
          <Button
            className="flex items-center justify-center text-[#ff6347] hover:text-[#ff6347]/80"
            variant="ghost"
            size="icon"
            onClick={handleHideCall}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Icons.scheduleIcon className="size-4" />
            <span className="text-muted-foreground text-sm">
              {formatCustomDate(call.joinedAt)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Icons.timer className="size-4" />
            <span className="text-muted-foreground text-sm">
              {formatCallDuration(call.joinedAt, call.leftAt)}
            </span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Icons.users className="size-4" />
        <div className="flex items-center">
          {call.participants
            .slice(0, participantsToShow)
            .map((participant, index) => (
              <UserProfile
                key={index}
                name={participant.name}
                url={participant.image}
                size="sm"
                className={cn("border-inset-accent -ml-2 border", {
                  "-ml-0": index === 0,
                })}
              />
            ))}
          {remainingParticipants > 0 && (
            <div
              className={cn(
                iconvVariants({ size: "sm" }),
                "bg-muted z-10 -ml-2 border"
              )}
            >
              <span className="text-xs">+{remainingParticipants}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const NoCallsFound = () => {
  const { onOpen } = useModal();
  const { user } = useSession();

  const isGuest = !user?.id || user.id === "guest";

  return (
    <div className="bg-inset-accent border-inset-accent-foreground col-span-full flex h-96 flex-col items-center justify-center gap-4 rounded-xl border p-4 text-center">
      <div className="flex flex-col items-center">
        <h1 className="text-lg font-medium">
          {isGuest ? (
            "Sign in to access your call history"
          ) : (
            <>
              Ops <span className="first-letter:uppercase">{user.name}</span>!
              You don&apos;t have any calls yet.
            </>
          )}
        </h1>
        <p className="text-muted-foreground">
          {isGuest
            ? "Create meetings and view your call history."
            : "You can create a call to start a conversation with your friends."}
        </p>
      </div>
      {isGuest ? (
        <SocialButton />
      ) : (
        <Button
          onClick={() => onOpen("start-call")}
          className="hover:bg-muted-foreground/80 border border-gray-200 bg-white text-gray-900 hover:bg-gray-50"
        >
          Start a call
        </Button>
      )}
    </div>
  );
};
