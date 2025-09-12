"use client";

import Header from "@/components/app/header";
import NotificationSection from "@/components/app/section/notification-section";
import { Button, buttonVariants } from "@call/ui/components/button";
import { cn } from "@call/ui/lib/utils";
import { motion as m } from "motion/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import { CloseSidebarButton } from "@/components/app/section/_components/close-sidebar-button";

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
    <div className="flex flex-col ">
      <Header className="justify-between">
        <div className="flex items-center gap-2">
          <CloseSidebarButton className="-ml-8" />
          {SECTIONS.map((s) => (
            <m.button
              key={s.key}
              onClick={() => handleSectionChange(s.key)}
              className={cn(
                buttonVariants({ variant: "ghost" }),
                "relative z-0 transition-all  text-sm hover:bg-transparent text-[#4C4C4C]",
                sectionKey === s.key &&
                  "font-medium text-white cursor-pointer hover:text-white px-4 py-2 rounded-md"
              )}
            >
              {s.label}

              {sectionKey === s.key && (
                <m.div
                  className="bg-inset-accent-foreground absolute inset-0 -z-10 rounded-md"
                  layoutId="active-notification-section"
                  transition={{ layout: { duration: 0.15, ease: "easeOut" } }}
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
