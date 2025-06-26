"use client";

import { authClient } from "@call/auth/auth-client";
import { Button } from "@call/ui/components/button";
import { Icons } from "@call/ui/components/icons";

const SocialButton = () => {
  const handleSocialLogin = async (provider: "google" | "github") => {
    const { data } = await authClient.signIn.social({
      provider,
      callbackURL: process.env.NEXT_PUBLIC_CALLBACK_URL,
    });

    if (data?.url) {
      window.location.href = data.url;
    } else {
      console.error("No redirect URL returned from auth client.");
    }
  };

  return (
    <div className="w-full space-y-2">
      <Button
        onClick={() => handleSocialLogin("google")}
        variant="outline"
        size="lg"
        className="w-full"
      >
        <Icons.google className="w-4 h-4" />
        Continue with Google
      </Button>

      <Button
        onClick={() => handleSocialLogin("github")}
        variant="outline"
        size="lg"
        className="w-full"
      >
        <Icons.github className="w-4 h-4" />
        Continue with GitHub
      </Button>
    </div>
  );
};

export default SocialButton;
