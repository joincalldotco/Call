"use client";

import { Button } from "@call/ui/components/button";
import { SquareDot } from "@call/ui/components/square-dot";
import { Icons } from "@call/ui/components/icons";
import { siteConfig } from "@/lib/site";
import Link from "next/link";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { useEffect, useState } from "react";

const links = [
  {
    label: "Github",
    href: siteConfig.links.github,
    icon: Icons.github,
  },
  {
    label: "Discord",
    href: siteConfig.links.discord,
    icon: Icons.discord,
  },
  {
    label: "X",
    href: siteConfig.links.x,
    icon: Icons.x,
  },
];

const Navbar = () => {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  return (
    <header className="border-b border-border dark:border-white/5">
      <div className="max-w-5xl w-full mx-auto px-6 py-2 flex items-center justify-between relative">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Icons.logoDark className="size-6 block dark:hidden" />
          <Icons.logo className="size-6 hidden dark:block" />
          <span className="text-primary font-lora">Call</span>
        </h1>
        <div className="flex items-center gap-2">
          <Button className=" bg-[#202020] text-white hover:bg-muted-foreground/90 dark:hover:bg-muted-foreground/10">
            <Link href="/r">Demo</Link>
          </Button>
          {links.map((link) => (
            <Button
              size="icon"
              variant="ghost"
              className="hover:bg-muted-foreground/10"
              key={link.label}
              asChild
            >
              <Link href={link.href} target="_blank">
                <link.icon className="size-4" />
              </Link>
            </Button>
          ))}
          {mounted && (
            <Button
              size="icon"
              variant="ghost"
              className="hover:bg-muted-foreground/10"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? (
                <Sun className="size-4" />
              ) : (
                <Moon className="size-4" />
              )}
            </Button>
          )}
        </div>
        <SquareDot position="bottomLeft" />
        <SquareDot position="bottomRight" />
      </div>
    </header>
  );
};

export default Navbar;
