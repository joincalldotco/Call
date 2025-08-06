"use client";

import Header from "@/components/app/header";
import NotificationSection from "@/components/app/section/notification-section";
import { Button, buttonVariants } from "@call/ui/components/button";
import { cn } from "@call/ui/lib/utils";
import { motion as m } from "motion/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

const SECTIONS = [
  { key: "all", label: "All notifications" },
  { key: "calls", label: "Calls" },
  { key: "teams", label: "Teams" },
  { key: "contacts", label: "Contacts" },
  { key: "schedules", label: "Schedules" },
];

const DEFAULT_SECTION_KEY = SECTIONS[0]?.key || "all";

export default function NotificationsPage() {
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
                sectionKey === s.key && "font-medium text-white"
              )}
            >
              {s.label}

              {sectionKey === s.key && (
                <m.div
                  className="bg-inset-accent-foreground absolute inset-0 -z-10 rounded-md"
                  layoutId="active-notification-section"
                />
              )}
            </m.button>
          ))}
        </div>
      </Header>
      <NotificationSection section={sectionKey} />
    </div>
  );
} 