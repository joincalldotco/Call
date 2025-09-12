import { Button } from "@call/ui/components/button";
import { Icons } from "@call/ui/components/icons";
import { Skeleton } from "@call/ui/components/skeleton";
import { iconvVariants } from "@call/ui/components/use-profile";
import { cn } from "@call/ui/lib/utils";
import { MoreVertical } from "lucide-react";

export const CallHistorySkeleton = () => {
  const numberOfParticipants = 10;
  const participantsToShow = 3;
  const remainingParticipants = numberOfParticipants - participantsToShow;

  return (
    <div className="bg-inset-accent flex flex-col gap-3 rounded-md border p-4">
      <div className="flex items-center justify-between">
        <Skeleton className="bg-muted h-4 w-24" />
      
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Icons.scheduleIcon className="size-4" />
            <Skeleton className="bg-muted h-4 w-20" />
          </div>
          <div className="flex items-center gap-2">
            <Icons.timer className="size-4" />
            <Skeleton className="bg-muted h-4 w-20" />
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Icons.users className="size-4" />
        <div className="flex items-center">
          {Array.from({ length: participantsToShow }).map((_, index) => (
            <Skeleton
              key={index}
              className={cn(
                iconvVariants({ size: "sm" }),
                "border-inset-accent bg-muted -ml-2 border",
                {
                  "-ml-0": index === 0,
                }
              )}
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

export default CallHistorySkeleton;
