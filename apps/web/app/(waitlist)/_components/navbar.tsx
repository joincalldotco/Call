"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@call/ui/components/button";
import { SquareDot } from "@call/ui/components/square-dot";
import { Icons } from "@call/ui/components/icons";
import { siteConfig } from "@/lib/site";
import { Users, Loader2, Menu, X } from "lucide-react";

const links = [
  {
    label: "Contributors",
    href: "/contributors",
    icon: Users,
    target: "_self",
  },
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
  const [mounted, setMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header className="fixed inset-x-0 top-4 z-50">
      <div className="relative mx-auto flex w-full max-w-3xl !bg-[#151515] items-center justify-between rounded-xl border border-border  px-4 py-2 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/50 dark:border-white/5">
        {/* Left: Logo */}
        <Link href="/" className="z-50">
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Icons.logo className="size-6" />
            <span className="text-primary font-lora">Call</span>
          </h1>
        </Link>

        <div className="z-50 flex items-center gap-2">
          <div className="hidden items-center gap-2 md:flex">
            {links.map((link) => (
              <Button
                key={link.label}
                size="icon"
                variant="ghost"
                className="hover:bg-muted-foreground/10"
                asChild
              >
                <Link href={link.href} target={link.target ?? "_blank"}>
                  <link.icon className="size-4" />
                </Link>
              </Button>
            ))}
          </div>

          {/* Mobile Menu toggle */}
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden"
          >
            {menuOpen ? <X className="size-4" /> : <Menu className="size-4" />}
          </Button>
        </div>

        {/* Mobile Menu */}
        {menuOpen && (
          <div className="absolute left-0 right-0 top-full z-40 border-b bg-background/95 backdrop-blur-sm dark:border-white/5 md:hidden">
            <div className="flex flex-col gap-2 p-4">
              {links.map((link) => (
                <Button
                  key={link.label}
                  variant="ghost"
                  className="justify-start"
                  asChild
                >
                  <Link href={link.href} target={link.target ?? "_blank"}>
                    <link.icon className="mr-2 size-4" />
                    {link.label}
                  </Link>
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;
