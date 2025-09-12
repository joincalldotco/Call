"use client";

import { useSession } from "@/components/providers/session";
import { useModal } from "@/hooks/use-modal";
import { CALLS_QUERY } from "@/lib/QUERIES";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@call/ui/components/dialog";
import { Input } from "@call/ui/components/input";
import { LoadingButton } from "@call/ui/components/loading-button";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { ContactsSelector } from "./contacts-selector";

const formSchema = z.object({
  name: z.string().trim(),
});

export const StartCall = () => {
  const { isOpen, onClose, type } = useModal();
  const router = useRouter();
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const { user } = useSession();

  console.log(user);

  const { mutate: createCall, isPending } = useMutation({
    mutationFn: CALLS_QUERY.createCall,
    onSuccess: (data) => {
      if (selectedContacts.length > 0) {
        toast.success(
          `Invitations sent to ${selectedContacts.length} contact${selectedContacts.length !== 1 ? "s" : ""}`
        );
      }
      onClose();
      form.reset();
      setSelectedContacts([]);
      router.push(`/app/call/${data.callId}`);
    },
    onError: () => {
      toast.error("Failed to create call");
    },
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
    },
  });

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    const userName = user?.name || "User";
    const finalName =
      data.name && data.name.trim() !== "" ? data.name : `${userName}-call`;

    if (!user?.id || user.id === "guest") {
      const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
      let code = "";
      for (let i = 0; i < 6; i++)
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      onClose();
      router.push(`/app/call/${code}`);
      toast.success("Anonymous call created");
      return;
    }

    createCall({
      name: finalName,
      members: selectedContacts,
    });
  };

  const isModalOpen = isOpen && type === "start-call";

  const handleModalClose = () => {
    if (!isPending) {
      onClose();
      form.reset();
      setSelectedContacts([]);
    }
  };

  return (
    <Dialog open={isModalOpen} onOpenChange={handleModalClose}>
      <DialogContent
        className="!max-w-sm rounded-2xl bg-[#232323] p-6"
        showCloseButton={false}
      >
        <DialogHeader className="flex flex-col">
          <DialogTitle>Start Call</DialogTitle>
          <DialogDescription>
            Start a call with your contacts.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Input
            {...form.register("name")}
            placeholder="Call name (optional)"
            className="border-1 h-12 !rounded-lg border-[#434343] bg-[#2F2F2F] text-2xl text-white"
            disabled={isPending}
          />

          <ContactsSelector
            selectedContacts={selectedContacts}
            onContactsChange={setSelectedContacts}
            disabled={isPending}
          />

          <LoadingButton
            type="submit"
            className="h-10 w-full rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-900 hover:bg-gray-50"
            loading={isPending}
            disabled={isPending}
          >
            {selectedContacts.length > 0
              ? `Start with ${selectedContacts.length} contact${selectedContacts.length !== 1 ? "s" : ""}`
              : "Start call"}
          </LoadingButton>
        </form>
      </DialogContent>
    </Dialog>
  );
};
