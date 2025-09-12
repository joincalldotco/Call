"use client";
import { useModal } from "@/hooks/use-modal";
import { TEAMS_QUERY } from "@/lib/QUERIES";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@call/ui/components/dialog";
import { Button } from "@call/ui/components/button";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { LoadingButton } from "@call/ui/components/loading-button";
import { ContactsSelector } from "./contacts-selector";

export const AddMemberToTeam = () => {
  const { isOpen, onClose, type, data } = useModal();
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);

  const team = data?.team;

  const isModalOpen = isOpen && type === "add-member-to-team";

  const { mutate: addMembers, isPending: addMembersPending } = useMutation({
    mutationFn: ({
      teamId,
      data,
    }: {
      teamId: string;
      data: { emails: string[] };
    }) => TEAMS_QUERY.addMembers(teamId, data),
    onSuccess: () => {
      toast.success("Members added to team");
      onClose();
      setSelectedContacts([]);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleContactToggle = (email: string) => {
    setSelectedContacts((prev) =>
      prev.includes(email) ? prev.filter((e) => e !== email) : [...prev, email]
    );
  };

  const handleAddMembers = () => {
    if (!team || selectedContacts.length === 0) return;

    addMembers({
      teamId: team.id,
      data: { emails: selectedContacts },
    });
  };

  return (
    <Dialog open={isModalOpen} onOpenChange={onClose}>
      <DialogContent
        className="!max-w-md rounded-2xl bg-[#232323] p-6"
        showCloseButton={false}
      >
        <DialogHeader className="flex flex-col">
          <DialogTitle>Add Member to {team?.name}</DialogTitle>
          <DialogDescription>
            Select contacts to add to this team.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <ContactsSelector
            selectedContacts={selectedContacts}
            onContactsChange={setSelectedContacts}
            disabled={addMembersPending}
            disabledEmails={(team?.members || []).map((m) => m.email)}
          />

          <div className="flex justify-end space-x-2 pt-4">
            <LoadingButton
              onClick={handleAddMembers}
              disabled={addMembersPending || selectedContacts.length === 0}
              loading={addMembersPending}
              className="h-10 w-full rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-900 hover:bg-gray-50"
            >
              Add Members
            </LoadingButton>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
