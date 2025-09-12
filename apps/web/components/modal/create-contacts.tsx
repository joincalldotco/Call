"use client";

import { useContacts } from "@/components/providers/contacts";
import { useModal } from "@/hooks/use-modal";
import { CONTACTS_QUERY } from "@/lib/QUERIES";
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
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const formSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }).trim(),
});

export const CreateContacts = () => {
  const { isOpen, onClose, type } = useModal();
  const router = useRouter();
  const { contacts, isLoading, error } = useContacts();

  const { mutate: createContact, isPending } = useMutation({
    mutationFn: CONTACTS_QUERY.createContact,
    onSuccess: (data) => {
      toast.success(data.message || "Contact created successfully");
      onClose();
      form.reset();
    },
    onError: (error: any) => {
      toast.error("Failed to add contact", {
        description: error.response?.data.message || "Unknown error",
      });
    },
  });
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    createContact({
      email: data.email,
    });
  };

  const isModalOpen = isOpen && type === "create-contacts";

  return (
    <Dialog open={isModalOpen} onOpenChange={onClose}>
      <DialogContent
        className="!max-w-sm rounded-2xl bg-[#232323] p-6"
        showCloseButton={false}
      >
        <DialogHeader className="flex flex-col">
          <DialogTitle>Add Contact</DialogTitle>
          <DialogDescription>
            Add a new contact to your contacts list.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="hello@joincall.co"
                      className="border-1 h-12 !rounded-lg border-[#434343] bg-[#2F2F2F] text-2xl text-white"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <LoadingButton
              type="submit"
              className="h-10 w-full rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-900 hover:bg-gray-50"
              loading={isPending}
              disabled={isPending || !form.formState.isValid}
            >
              Add Contact
            </LoadingButton>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
