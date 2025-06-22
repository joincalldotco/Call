"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { Icons } from "@call/ui/components/icons";
import { Button } from "@call/ui/components/button";
import { Input } from "@call/ui/components/input";
import NumberFlow from "@number-flow/react";
import { useForm } from "react-hook-form";
import { cn } from "@call/ui/lib/utils";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { confettiBurst } from "@call/ui/lib/confetti";

const formSchema = z.object({
  email: z.string().email(),
});

type FormSchema = z.infer<typeof formSchema>;

async function getWaitlistCount(): Promise<{ count: number }> {
  return fetch("/api/waitlist/count").then((res) => {
    if (!res.ok) {
      throw new Error("Failed to get waitlist count");
    }
    return res.json();
  });
}

async function joinWaitlist(email: string): Promise<void> {
  const response = await fetch("/api/waitlist/join", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email }),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to join waitlist");
  }
}

const getLocalStorageItem = (key: string): string | null => {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const setLocalStorageItem = (key: string, value: string): void => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, value);
  } catch {}
};

function useWaitlistCount() {
  const queryClient = useQueryClient();
  const [success, setSuccess] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const query = useQuery({
    queryKey: ["waitlist", "count"],
    queryFn: getWaitlistCount,
    refetchInterval: 5000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    enabled: isClient,
  });

  const { mutate } = useMutation({
    mutationFn: (email: string) => joinWaitlist(email),
    onSuccess: () => {
      setSuccess(true);

      queryClient.invalidateQueries({ queryKey: ["waitlist", "count"] });

      const newCount = (query.data?.count ?? 0) + 1;
      queryClient.setQueryData(["waitlist", "count"], { count: newCount });

      setLocalStorageItem("waitlist_success", "true");

      confettiBurst({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });

      toast.success("You're on the waitlist! 🎉");
    },
    onError: (error) => {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again.";
      toast.error(errorMessage);
    },
  });

  return { count: query.data?.count ?? 0, mutate, success };
}

interface WaitlistFormProps {
  className?: string;
}

export function WaitlistForm({ className }: WaitlistFormProps) {
  const { register, handleSubmit } = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
    },
  });

  const waitlist = useWaitlistCount();
  const [localSuccess, setLocalSuccess] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;

    if (waitlist.success) {
      setLocalStorageItem("waitlist_success", "true");
      setLocalSuccess(true);
    } else {
      const stored = getLocalStorageItem("waitlist_success");
      if (stored === "true") {
        setLocalSuccess(true);
      }
    }
  }, [waitlist.success, isClient]);

  function handleJoinWaitlist({ email }: FormSchema) {
    waitlist.mutate(email);
  }

  if (!isClient) {
    return null;
  }

  return (
    <div
      className={cn(
        "mx-auto flex w-full max-w-3xl flex-col items-center justify-center gap-3",
        className
      )}
    >
      {localSuccess ? (
        <div className="flex flex-col items-center justify-center gap-4 text-center">
          <p className="text-xl font-semibold">Welcome to the waitlist! 🎉</p>
          <p className="text-muted-foreground text-base">
            We&apos;ll let you know when we&#39;re ready to show you what
            we&#39;ve been working on.
          </p>
        </div>
      ) : (
        <form
          className="mx-auto flex w-full max-w-md flex-col gap-3 sm:flex-row"
          onSubmit={handleSubmit(handleJoinWaitlist)}
        >
          <Input
            placeholder="example@0.email"
            className="placeholder:text-muted-foreground w-full rounded-lg bg-background px-4 text-base font-medium outline outline-neutral-200 placeholder:font-medium md:text-base"
            {...register("email")}
          />
          <Button type="submit">Join Waitlist</Button>
        </form>
      )}
      <div className="relative flex flex-row items-center justify-center gap-3">
        <span className="text-sm text-primary/80 sm:text-base">
          <NumberFlow value={waitlist.count} /> people already joined the
          waitlist
        </span>
      </div>
    </div>
  );
}
