"use client";

import { useModal } from "@/hooks/use-modal";
import { CALLS_QUERY, TEAMS_QUERY } from "@/lib/QUERIES";
import type { Team } from "@/lib/types";
import { Button } from "@call/ui/components/button";
import { Icons } from "@call/ui/components/icons";
import { Input } from "@call/ui/components/input";
import { iconvVariants, UserProfile } from "@call/ui/components/use-profile";
import { cn } from "@call/ui/lib/utils";
import { LoadingButton } from "@call/ui/components/loading-button";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  MoreVertical,
  Users,
  UserPlus,
  Video,
  LogOut,
  X,
  Loader2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useState, useMemo } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@call/ui/components/dropdown-menu";
import SocialButton from "@/components/auth/social-button";
import { useSession } from "@/components/providers/session";

export const TeamSection = () => {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const { onOpen } = useModal();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  const {
    data: teams,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["teams"],
    queryFn: TEAMS_QUERY.getTeams,
    enabled: user.id !== "guest",
  });

  const { mutate: deleteTeam, isPending: deleteTeamPending } = useMutation({
    mutationFn: TEAMS_QUERY.deleteTeam,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      toast.success("Team deleted successfully");
    },
    onError: (error) => {
      toast.error(error.message);
      queryClient.invalidateQueries({ queryKey: ["teams"] });
    },
  });

  const { mutate: createCall, isPending: createCallPending } = useMutation({
    mutationFn: CALLS_QUERY.createCall,
    onSuccess: (data) => {
      toast.success("Call created successfully", {
        description: "Redirecting to call...",
      });
      router.push(`/app/call/${data.callId}`);
    },
    onError: (error) => {
      toast.error("Failed to create call");
    },
  });

  // Memoized filtered teams
  const filteredTeams = useMemo(() => {
    if (!teams) return [];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      return teams.filter((team) => {
        const searchableFields = [
          team.name,
          ...team.members.map((m) => m.name),
          ...team.members.map((m) => m.email),
        ];

        return searchableFields.some((field) =>
          field?.toLowerCase().includes(query)
        );
      });
    }

    return teams;
  }, [teams, searchQuery]);

  const clearSearch = () => {
    setSearchQuery("");
  };

  const startTeamMeeting = async (team: Team) => {
    createCall({
      name: `${team.name} Meeting`,
      members: team.members.map((m) => m.email),
    });
  };

  if (user.id === "guest") {
    return (
      <div className="space-y-6 px-10">
        <div className="flex flex-col gap-6">
          <NoTeamsFound />
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex h-64 items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="text-primary h-6 w-6 animate-spin" />
            <p className="text-muted-foreground text-sm">Loading teams...</p>
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
              <Users className="h-8 w-8 text-red-500" />
            </div>
            <p className="text-sm text-red-500">Failed to load teams</p>
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

  const hasTeams = teams && teams.length > 0;
  const hasSearchResults = filteredTeams.length > 0;

  return (
    <div className="px-10">
      <div className="flex flex-col gap-6">
        {hasTeams ? (
          <div className="flex items-center gap-2">
            <div className="relative w-full max-w-md">
              <Input
                type="text"
                placeholder="Search by team name or member..."
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
        {hasTeams && !hasSearchResults && (
          <div className="flex h-64 flex-col items-center justify-center text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="bg-muted/50 rounded-full p-4">
                <Users className="text-muted-foreground h-8 w-8" />
              </div>
              <h3 className="text-lg font-medium">No teams found</h3>
              <p className="text-muted-foreground max-w-sm">
                No teams match your search criteria. Try adjusting your search
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

        {/* Teams grid */}
        {hasSearchResults && (
          <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredTeams.map((team) => (
              <TeamCard
                key={team.id}
                team={team}
                onStartMeeting={startTeamMeeting}
                onDeleteTeam={deleteTeam}
                onAddMembers={() => onOpen("add-member-to-team", { team })}
                isPending={createCallPending || deleteTeamPending}
              />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!hasTeams && <NoTeamsFound />}
      </div>
    </div>
  );
};

interface TeamCardProps {
  team: Team;
  onStartMeeting: (team: Team) => void;
  onDeleteTeam: (teamId: string) => void;
  onAddMembers: () => void;
  isPending: boolean;
}

const TeamCard = ({
  team,
  onStartMeeting,
  onDeleteTeam,
  onAddMembers,
  isPending,
}: TeamCardProps) => {
  const membersToShow = 3;
  const remainingMembers = team.members.length - membersToShow;

  return (
    <div className="flex flex-col gap-4 rounded-2xl bg-[#232323] p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-base font-medium first-letter:uppercase">
          {team.name}
        </h1>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-lg hover:bg-white/5"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="border-1 w-44 rounded-lg border-[#434343] bg-[#2F2F2F] p-1 shadow-xl"
          >
            <DropdownMenuItem
              onClick={onAddMembers}
              className="rounded-md text-sm hover:bg-white/5"
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Add Members
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onDeleteTeam(team.id)}
              className="rounded-md text-sm text-[#ff6347] hover:bg-[#ff6347]"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Leave Team
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex items-center gap-2">
        <Icons.users className="size-4" />
        <div className="flex items-center">
          {team.members.slice(0, membersToShow).map((member, index) => (
            <UserProfile
              key={index}
              name={member.name}
              url={member.image}
              size="sm"
              className={cn("-ml-2 border border-[#434343]", {
                "-ml-0": index === 0,
              })}
            />
          ))}
          {remainingMembers > 0 && (
            <div
              className={cn(
                iconvVariants({ size: "sm" }),
                "border-1 z-10 -ml-2 border-[#434343] bg-[#2F2F2F]"
              )}
            >
              <span className="text-xs">+{remainingMembers}</span>
            </div>
          )}
        </div>
      </div>

      <LoadingButton
        onClick={() => onStartMeeting(team)}
        loading={isPending}
        className="h-10 w-full rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-900 hover:bg-gray-50"
      >
        Start Meeting
      </LoadingButton>
    </div>
  );
};

const NoTeamsFound = () => {
  const { onOpen } = useModal();
  const { user } = useSession();
  const isGuest = !user?.id || user.id === "guest";

  return (
    <div className="bg-inset-accent border-inset-accent-foreground col-span-full flex h-96 flex-col items-center justify-center gap-4 rounded-xl border p-4 text-center">
      <div className="flex flex-col items-center">
        <h1 className="text-lg font-medium">
          {isGuest
            ? "Sign in to manage teams"
            : "You don\'t have any teams yet."}
        </h1>
        <p className="text-muted-foreground">
          {isGuest
            ? "Create and manage teams for collaboration."
            : "Create your first team to start collaborating with others."}
        </p>
      </div>
      {isGuest ? (
        <SocialButton />
      ) : (
        <Button
          onClick={() => onOpen("create-team")}
          className="border border-gray-200 bg-white text-gray-900 hover:bg-gray-50"
        >
          <UserPlus className="mr-2 h-4 w-4" />
          Create Team
        </Button>
      )}
    </div>
  );
};

export default TeamSection;
