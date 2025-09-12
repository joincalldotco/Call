import { cn } from "@call/ui/lib/utils";
import React from "react";

interface HeaderProps extends React.HTMLAttributes<HTMLDivElement> {}

const Header = ({ children, className, ...props }: HeaderProps) => {
  return (
    <header
      className={cn(
        "  flex h-20 shrink-0 items-center gap-2  px-10 transition-[width,height] ease-linear",
        className
      )}
      {...props}
    >
      {children}
    </header>
  );
};

export default Header;
