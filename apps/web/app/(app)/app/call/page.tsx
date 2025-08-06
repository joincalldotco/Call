"use client";

import Header from "@/components/app/header";
import CallSection from "@/components/app/section/call-section";
import { useModal } from "@/hooks/use-modal";
import { Button, buttonVariants } from "@call/ui/components/button";
import { cn } from "@call/ui/lib/utils";
import { motion as m } from "motion/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

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
    <div className="flex flex-col gap-[22px]">
      <Header className="justify-between">
        <div className="flex items-center gap-2">
          {SECTIONS.map((s) => (
            <m.button
              key={s.key}
              onClick={() => handleSectionChange(s.key)}
              className={cn(
                buttonVariants({ variant: "ghost" }),
                "relative z-0 transition-all hover:bg-transparent",
                sectionKey === s.key &&
                  "font-medium text-white hover:text-white"
              )}
            >
              {s.label}

              {sectionKey === s.key && (
                <m.div
                  className="bg-inset-accent-foreground absolute inset-0 -z-10 rounded-md"
                  layoutId="active-call-section"
                />
              )}
            </m.button>
          ))}
        </div>
        <Button
          onClick={() => onOpen("start-call")}
          className="bg-inset-accent-foreground hover:bg-inset-accent-foreground/80 text-white"
        >
          Start Call
        </Button>
      </Header>
      <CallSection section={sectionKey} />
    </div>
  );
}
