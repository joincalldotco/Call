"use client";

import { authClient } from "@call/auth/auth-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@call/ui/components/card";
import { LoadingButton } from "@call/ui/components/loading-button";
import { Icons } from "@call/ui/components/icons";
import { useState } from "react";
import { toast } from "sonner";

interface LoginCardProps {
  title?: string;
  description?: string;
  className?: string;
}

export const LoginCard = ({ 
  title = "Sign in to continue", 
  description = "Access your account to use all features",
  className = ""
}: LoginCardProps) => {
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
    <Card className={`w-full max-w-md ${className}`}>
      <CardHeader className="text-center">
        <CardTitle className="text-xl font-semibold">{title}</CardTitle>
        <CardDescription className="text-muted-foreground">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <LoadingButton
          loading={isLoading}
          onClick={handleGoogleLogin}
          className="w-full w-lg"
          disabled={isLoading}
        >
          <Icons.google className="mr-2 h-4 w-4" />
          Continue with Google
        </LoadingButton>
      </CardContent>
    </Card>
  );
};
