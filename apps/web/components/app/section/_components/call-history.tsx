"use client";

import { useSession } from "@/components/providers/session";
import { useModal } from "@/hooks/use-modal";
import { CALLS_QUERY } from "@/lib/QUERIES";
import type { Call } from "@/lib/types";
import { formatCallDuration, formatCustomDate } from "@/lib/utils";
import { Button } from "@call/ui/components/button";
import { Icons } from "@call/ui/components/icons";
import { Input } from "@call/ui/components/input";
import { iconvVariants, UserProfile } from "@call/ui/components/use-profile";
import { cn } from "@call/ui/lib/utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MoreVertical, X, Loader2, Phone, Trash, Users } from "lucide-react";
import { useMemo, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@call/ui/components/dropdown-menu";

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
  });

  // Memoized filtered calls
  const filteredCalls = useMemo(() => {
    if (!calls) return [];

    let filtered = [...calls];

    // Apply filter
    if (activeFilter === "my-calls") {
      filtered = filtered.filter((call) => call.creatorId === user.id);
    } else if (activeFilter === "shared-with-me") {
      filtered = filtered.filter((call) => call.creatorId !== user.id);
    }

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((call) => {
        const searchableFields = [
          call.name,
          ...call.participants.map(p => p.name),
          ...call.participants.map(p => p.email)
        ];
        
        return searchableFields.some(field => 
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
      <div className="space-y-6">
        <div className="flex h-64 items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading call history...</p>
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <div className="flex h-64 items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="rounded-full bg-red-50 p-3">
              <Phone className="h-8 w-8 text-red-500" />
            </div>
            <p className="text-red-500 text-sm">Failed to load call history</p>
            <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
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
                className="pl-10 pr-10 py-2.5 h-11 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <Icons.search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={clearSearch}
                  className="absolute right-2 top-1/2 h-7 w-7 -translate-y-1/2 transform hover:bg-muted/50"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
        
          </div>
        ) : null}
        
        {/* No results message */}
        {hasCallHistory && !hasSearchResults && (
          <div className="flex h-64 flex-col items-center justify-center text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="rounded-full bg-muted/50 p-4">
                <Phone className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium">No calls found</h3>
              <p className="text-muted-foreground max-w-sm">
                No calls match your search criteria. Try adjusting your search terms.
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
          <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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

  const handleHideCall = async () => {
    try {
      await CALLS_QUERY.hideCall(call.id);
      // Invalidate and refetch calls
      queryClient.invalidateQueries({ queryKey: ["calls"] });
    } catch (error) {
      console.error("Failed to hide call:", error);
    }
  };

  const handleViewUsers = () => {
    // This could be implemented later to show a modal with all participants
    console.log("View users clicked", call.participants);
  };

  return (
    <div className="bg-inset-accent flex flex-col gap-3 rounded-xl border p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-medium first-letter:uppercase">
          {call.name}
        </h1>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleViewUsers}>
              <Users className="mr-2 h-4 w-4" />
              View Users
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleHideCall} variant="destructive">
              <Trash className="mr-2 h-4 w-4" />
              Hide Call
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Icons.scheduleIcon className="size-4" />
            <span className="text-muted-foreground">
              {formatCustomDate(call.joinedAt)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Icons.timer className="size-4" />
            <span className="text-muted-foreground">
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
  return (
    <div className="bg-inset-accent border-inset-accent-foreground col-span-full flex h-96 flex-col items-center justify-center gap-4 rounded-xl border p-4 text-center">
      <div className="flex flex-col items-center">
        <h1 className="text-lg font-medium">
          Ops <span className="first-letter:uppercase">{user.name}</span>! You
          don&apos;t have any calls yet.
        </h1>
        <p className="text-muted-foreground">
          You can create a call to start a conversation with your friends.
        </p>
      </div>
      <Button
        onClick={() => onOpen("start-call")}
        className="bg-muted-foreground hover:bg-muted-foreground/80"
      >
        Start a call
      </Button>
    </div>
  );
};
