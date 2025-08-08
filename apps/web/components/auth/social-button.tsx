"use client";

import { authClient } from "@call/auth/auth-client";
import { Button } from "@call/ui/components/button";
import { Icons } from "@call/ui/components/icons";
import { useCallback, useMemo, useState } from "react";

const SocialButton = () => {
  const [isSigningIn, setIsSigningIn] = useState(false);

  const callbackUrl = useMemo(() => {
    
    return (
      process.env.NEXT_PUBLIC_CALLBACK_URL ||
      (typeof window !== "undefined" ? `${window.location.origin}/app` : undefined)
    );
  }, []);

  const handleGoogleLogin = useCallback(async () => {
    if (isSigningIn) return; 
    try {
      setIsSigningIn(true);
      await authClient.signIn.social({
        provider: "google",
        callbackURL: callbackUrl,
      });
    } finally {
      setIsSigningIn(false);
    }
  }, [isSigningIn, callbackUrl]);

  return (
    <Button
      onClick={handleGoogleLogin}
      variant="outline"
      size="lg"
      className="px-10!"
      disabled={isSigningIn}
      aria-busy={isSigningIn}
    >
      <Icons.google className="h-4 w-4" />
      {isSigningIn ? "Signing in..." : "Continue with Google"}
    </Button>
  );
};

export default SocialButton;
