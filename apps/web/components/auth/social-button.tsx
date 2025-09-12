"use client";

import { authClient } from "@call/auth/auth-client";
import { LoadingButton } from "@call/ui/components/loading-button";
import { Icons } from "@call/ui/components/icons";
import { useState } from "react";
import { toast } from "sonner";

const SocialButton = () => {
  const [isLoading, setIsLoading] = useState(false);
  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true);
      await authClient.signIn.social({
        provider: "google",
        callbackURL: process.env.NEXT_PUBLIC_CALLBACK_URL,
      });
    } catch (error) {
      toast.error("Failed to sign in with Google");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <LoadingButton
      loading={isLoading}
      onClick={handleGoogleLogin}
      className="px-10"
      disabled={isLoading}
    >
      <Icons.google className="h-4 w-4" />
      Continue with Google
    </LoadingButton>
  );
};

export default SocialButton;
