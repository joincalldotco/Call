import Link from "next/link";
import { Button } from "@call/ui/components/button";
import { Undo2 } from "lucide-react";

export const metadata = {
  title: "404 | Page Not Found - Call",
  description:
    "Oops! The page you’re looking for isn’t available. Head back to the homepage.",
};

export default function NotFound() {
  return (
    <div className="min-h-screen flex bg-background items-center justify-center px-6">
      <div className="text-center max-w-md">
        <h1 className="text-6xl font-bold text-primary mb-6">404</h1>
        <p className="text-muted-foreground">
          Looks like you&apos;ve wandered off the call. The page you&apos;re trying to reach
          doesn&apos;t exist or maybe it&apos;s on mute.  
        </p>
        <p className="text-muted-foreground mb-8">
          Let&apos;s get you back on track.
        </p>
        <Button asChild>
          <Link href="/" className="flex items-center gap-2">
            <Undo2 className="h-4 w-4" aria-hidden="true" focusable="false" />
            <span>Go Back Home</span>
          </Link>
        </Button>
      </div>
    </div>
  );
}
