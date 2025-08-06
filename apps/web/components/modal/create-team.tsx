import { useModal } from "@/hooks/use-modal";
import { TEAMS_QUERY } from "@/lib/QUERIES";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@call/ui/components/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@call/ui/components/form";
import { Input } from "@call/ui/components/input";
import { LoadingButton } from "@call/ui/components/loading-button";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { ContactSelector } from "./contact-selector";

const formSchema = z.object({
  name: z.string().min(1, { message: "Name is required" }).trim(),
});

export const CreateTeam = () => {
  const { isOpen, onClose, type } = useModal();
  const queryClient = useQueryClient();
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);

  const { mutate: createTeam, isPending } = useMutation({
    mutationFn: TEAMS_QUERY.createTeam,
    onMutate: async (newTeam) => {
      await queryClient.cancelQueries({ queryKey: ["teams"] });

      const previousTeams = queryClient.getQueryData(["teams"]);

      queryClient.setQueryData(["teams"], (old: any) => {
        if (!old) return old;

        const optimisticTeam = {
          id: `temp-${Date.now()}`,
          name: newTeam.name,
          creator_id: "current-user",
          members: newTeam.members,
        };

        return [...old, optimisticTeam];
      });

      return { previousTeams };
    },
    onError: (err: any, newTeam, context) => {
      if (context?.previousTeams) {
        queryClient.setQueryData(["teams"], context.previousTeams);
      }
      toast.error("Failed to create team", {
        description: err.response?.data?.message || "Unknown error",
      });
    },
    onSuccess: (data) => {
      if (selectedContacts.length > 0) {
        toast.success(
          `Team created with ${selectedContacts.length} member${selectedContacts.length !== 1 ? "s" : ""}`
        );
      } else {
        toast.success("Team created successfully");
      }
      onClose();
      form.reset();
      setSelectedContacts([]);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
    },
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
    },
  });

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    createTeam({
      name: data.name,
      members: selectedContacts,
    });
  };

  const isModalOpen = isOpen && type === "create-team";

  const handleModalClose = () => {
    if (!isPending) {
      onClose();
      form.reset();
      setSelectedContacts([]);
    }
  };

  return (
    <Dialog open={isModalOpen} onOpenChange={handleModalClose}>
      <DialogContent>
        <DialogHeader className="flex flex-col items-center">
          <DialogTitle>Create Team</DialogTitle>
          <DialogDescription>
            Create a new team with your contacts.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input {...field} placeholder="Enter team name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <ContactSelector
              selectedContacts={selectedContacts}
              onContactsChange={setSelectedContacts}
              disabled={isPending}
            />

            <LoadingButton
              type="submit"
              className="w-full"
              loading={isPending}
              disabled={isPending || !form.formState.isValid}
            >
              {selectedContacts.length > 0
                ? `Create team with ${selectedContacts.length} member${selectedContacts.length !== 1 ? "s" : ""}`
                : "Create Team"}
            </LoadingButton>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
