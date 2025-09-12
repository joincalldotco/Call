import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { motion as m, type HTMLMotionProps } from "motion/react";

import { cn } from "@call/ui/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap rounded-md text-sm font-medium transition-[color,box-shadow] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive select-none",
  {
    variants: {
      variant: {
        default:
          "border bg-white text-gray-900 shadow-xs hover:bg-gray-50",
        destructive:
          "bg-destructive text-white shadow-xs hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40",
        outline:
          "border border-input bg-background shadow-xs hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: " px-4 py-2.5 has-[>svg]:px-3",
        sm: "py-2 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "py-3 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

type MotionButtonProps = HTMLMotionProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ButtonProps | MotionButtonProps) {
  if (asChild) {
    const { asChild: _, ...buttonProps } = props as ButtonProps;
    return (
      <Slot
        data-slot="button"
        className={cn(
          buttonVariants({ variant, size, className }),
          "transition-all duration-300 ease-in-out active:scale-[0.98]"
        )}
        {...buttonProps}
      />
    );
  }

  const motionProps = props as MotionButtonProps;
  return (
    <m.button
      data-slot="button"
      whileTap={{ scale: 0.98 }}
      className={cn(buttonVariants({ variant, size, className }))}
      {...motionProps}
    />
  );
}

export { Button, buttonVariants };
