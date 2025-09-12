"use client";

import type React from "react";

import { Button } from "@call/ui/components/button";
import { cn } from "@call/ui/lib/utils";
import { Loader } from "lucide-react";
import { forwardRef } from "react";
import type { HTMLMotionProps } from "motion/react";

interface LoadingButtonProps extends HTMLMotionProps<"button"> {
  loading?: boolean;
}

const LoadingButton = forwardRef<HTMLButtonElement, LoadingButtonProps>(
  ({ loading = false, children, className, disabled, ...props }, ref) => {
    return (
      <Button
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading}
        className={cn(className)}
        {...props}
      >
        <div className="grid grid-cols-1 grid-rows-1 place-items-center">
          <span
            style={{ gridArea: "1 / 1" }}
            className="flex items-center justify-center"
          >
            <Loader
              className={cn(
                "size-4 animate-spin transition-opacity duration-200",
                loading ? "opacity-100" : "opacity-0"
              )}
            />
          </span>

          <span
            className={cn(
              "flex items-center gap-2 transition-opacity duration-200",
              loading ? "opacity-0" : "opacity-100"
            )}
            style={{ gridArea: "1 / 1" }}
          >
            {children as React.ReactNode}
          </span>
        </div>
      </Button>
    );
  }
);

LoadingButton.displayName = "LoadingButton";

export { LoadingButton };
