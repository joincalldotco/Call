import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@call/ui/components/avatar";

import { cn } from "@call/ui/lib/utils.ts";

const iconvVariants = cva(
  "rounded-full border flex items-center justify-center",
  {
    variants: {
      size: {
        default: "size-10 min-w-10 rounded-md",
        sm: "size-8 min-w-8 rounded-md",
        lg: "size-10 min-w-10 rounded-md",
        xs: "size-6 min-w-6 rounded-md",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
);

interface ProfileProps extends VariantProps<typeof iconvVariants> {
  className?: string;
  url?: string | null;
  name?: string | null;
}

const UserProfile = ({ className, url, name = "User", size }: ProfileProps) => {
  const twoLettersName = name
    ? name.split(/[-\s]/).filter(Boolean).map((l) => l[0]).join("").slice(0, 2)
    : "U";

  return (
    <Avatar className={cn(iconvVariants({ size, className }))}>
      <AvatarImage src={url as string} />
      <AvatarFallback className="rounded-md text-sm font-semibold capitalize">
        {twoLettersName}
      </AvatarFallback>
    </Avatar>
  );
};

export { UserProfile, iconvVariants };
