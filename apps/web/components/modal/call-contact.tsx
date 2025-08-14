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
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const formSchema = z.object({
  name: z.string().trim(),
});

export const CallContactModal = () => {
  const { isOpen, onClose, type, data } = useModal();
  const contactEmail = data.contactEmail;
  const contactName = data.contactName;
  const router = useRouter();
  const { user } = useSession();

  const { mutate: createCall, isPending } = useMutation({
    mutationFn: CALLS_QUERY.createCall,
    onSuccess: (data) => {
      toast.success(`Call invitation sent to ${contactName || contactEmail}`);
      onClose();
      form.reset();
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
      data.name && data.name.trim() !== ""
        ? data.name
        : `Call with ${contactName || contactEmail}`;

    // If guest, create a client-side anonymous call code and navigate directly
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
      members: [contactEmail],
    });
  };

  const isModalOpen = isOpen && type === "call-contact";

  const handleModalClose = () => {
    if (!isPending) {
      onClose();
      form.reset();
    }
  };

  return (
    <Dialog open={isModalOpen} onOpenChange={handleModalClose}>
      <DialogContent className="max-w-md p-6">
        <DialogHeader className="flex flex-col items-center">
          <DialogTitle>Call Contact</DialogTitle>
          <DialogDescription>
            Start a call with {contactName || contactEmail}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Input
            {...form.register("name")}
            placeholder="Call name (optional)"
            className="h-12 text-lg"
            disabled={isPending}
          />

          <LoadingButton
            type="submit"
            className="h-12 w-full text-lg font-medium"
            loading={isPending}
            disabled={isPending}
          >
            Start Call
          </LoadingButton>
        </form>
      </DialogContent>
    </Dialog>
  );
};
