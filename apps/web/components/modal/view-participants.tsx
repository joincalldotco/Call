import { useModal } from "@/hooks/use-modal";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@call/ui/components/dialog";
import { UserProfile } from "@call/ui/components/use-profile";
import { Separator } from "@call/ui/components/separator";
import { ScrollArea } from "@call/ui/components/scroll-area";
import { Badge } from "@call/ui/components/badge";
import { FiUsers, FiCalendar, FiClock } from "react-icons/fi";
import { formatDistanceToNow } from "date-fns";

export const ViewParticipants = () => {
  const { isOpen, onClose, type, data } = useModal();
  const isModalOpen = isOpen && type === "view-participants";

  // Defensive checks
  const participants = data?.participants || [];
  const callInfo = data?.callInfo;

  return (
    <Dialog open={isModalOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[80vh] max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FiUsers className="h-5 w-5" />
            {callInfo?.name || "Call"} Participants
          </DialogTitle>
          <p className="text-muted-foreground text-sm">
            {participants.length} participant(s) in this call
          </p>
        </DialogHeader>

        <Separator />

        <ScrollArea className="max-h-[500px] pr-4">
          <div className="space-y-4">
            {participants.length > 0 ? (
              participants.map((participant: any, index: number) => (
                <div
                  key={participant.id || index}
                  className="hover:bg-muted/50 flex items-center gap-4 rounded-lg border p-3 transition-colors"
                >
                  <UserProfile
                    name={participant.name || "Unknown"}
                    url={participant.image}
                    size="sm"
                  />

                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <h4 className="truncate font-medium">
                        {participant.name || "Unknown"}
                      </h4>
                      <Badge variant="secondary" className="text-xs">
                        Participant
                      </Badge>
                    </div>

                    <p className="text-muted-foreground mb-2 truncate text-sm">
                      {participant.email || "No email provided"}
                    </p>

                    <div className="text-muted-foreground flex items-center gap-4 text-xs">
                      {participant.joinedAt && (
                        <div className="flex items-center gap-1">
                          <FiCalendar className="h-3 w-3" />
                          <span>
                            Joined{" "}
                            {formatDistanceToNow(
                              new Date(participant.joinedAt),
                              {
                                addSuffix: true,
                              }
                            )}
                          </span>
                        </div>
                      )}

                      {participant.leftAt && (
                        <div className="flex items-center gap-1">
                          <FiClock className="h-3 w-3" />
                          <span>
                            Left{" "}
                            {formatDistanceToNow(new Date(participant.leftAt), {
                              addSuffix: true,
                            })}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center">
                <div className="bg-muted/50 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full p-4">
                  <FiUsers className="text-muted-foreground h-8 w-8" />
                </div>
                <h3 className="mb-2 font-medium">No participants found</h3>
                <p className="text-muted-foreground text-sm">
                  This call doesn't have any recorded participants.
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
