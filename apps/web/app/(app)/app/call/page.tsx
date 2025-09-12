"use client";

import Header from "@/components/app/header";
import CallSection from "@/components/app/section/call-section";
import { useModal } from "@/hooks/use-modal";
import { Button, buttonVariants } from "@call/ui/components/button";
import { cn } from "@call/ui/lib/utils";
import { motion as m } from "motion/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import { CloseSidebarButton } from "@/components/app/section/_components/close-sidebar-button";
import { Icons } from "@call/ui/components/icons";

const SECTIONS = [
  { key: "joincall", label: "Join Call" },
  { key: "history", label: "Calls history" },
];

const DEFAULT_SECTION_KEY = SECTIONS[0]?.key || "joincall";

export default function CallPage() {
  const { onOpen } = useModal();
  const router = useRouter();
  const searchParams = useSearchParams();

  const sectionKey = useMemo(() => {
    const key = searchParams?.get("section");
    return SECTIONS.some((s) => s.key === key) ? key! : DEFAULT_SECTION_KEY;
  }, [searchParams]);

  const handleSectionChange = useCallback(
    (key: string) => {
      const params = new URLSearchParams(searchParams?.toString() || "");
      params.set("section", key);
      router.replace(`?${params.toString()}`);
    },
    [router, searchParams]
  );

  return (
    <div className="flex min-h-screen flex-col">
      <Header className="justify-between">
        <div className="flex items-center gap-2">
          <CloseSidebarButton className="-ml-8" />
          {SECTIONS.map((s) => (
            <m.button
              key={s.key}
              onClick={() => handleSectionChange(s.key)}
              className={cn(
                buttonVariants({ variant: "ghost" }),
                "relative z-0 text-sm text-[#4C4C4C] transition-all hover:bg-transparent",
                sectionKey === s.key &&
                  "cursor-pointer rounded-md px-4 py-2 font-medium text-white hover:text-white"
              )}
            >
              {s.label}
              {sectionKey === s.key && (
                <m.div
                  className="bg-inset-accent-foreground absolute inset-0 -z-10 rounded-md"
                  layoutId="active-call-section"
                  transition={{ layout: { duration: 0.15, ease: "easeOut" } }}
                />
              )}
            </m.button>
          ))}
        </div>
        <Button
          onClick={() => onOpen("start-call")}
          className="rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50"
        >
          <Icons.plus style={{ width: 14, height: 14 }} />
          Start Call
        </Button>
      </Header>
      <div className="flex-1">
        <CallSection section={sectionKey} />
      </div>
    </div>
  );
}
