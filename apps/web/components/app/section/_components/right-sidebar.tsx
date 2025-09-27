import * as React from "react";

import { useSession } from "@/components/providers/session";
import { useCallContext } from "@/contexts/call-context";
import { Icons } from "@call/ui/components/icons";
import { Input } from "@call/ui/components/input";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
} from "@call/ui/components/sidebar";
import { cn } from "@call/ui/lib/utils";
import { AnimatePresence, motion, type Transition } from "motion/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useRef } from "react";
import Contacts from "../../section/contacts";
import Notifications from "../../section/notifications";
import RecentCalls from "../../section/recent-call";
import Schedules from "../../section/schedules";
import Teams from "../../section/teams";

const TRANSITION: Transition = {
  delay: 0.1,
  type: "spring",
  bounce: 0,
  duration: 0.5,
};

const KEY = "CALLSECTION";

const SECTIONS = [
  { title: "Call", icon: Icons.phoneIcon, component: RecentCalls },
  { title: "Schedule", icon: Icons.scheduleIcon, component: Schedules },
  { title: "Teams", icon: Icons.peopleIcon, component: Teams },
  { title: "Contacts", icon: Icons.contactsIcon, component: Contacts },
  {
    title: "Notifications",
    icon: Icons.notificationsIcon,
    component: Notifications,
  },
];

const DEFAULT_SECTION_KEY = SECTIONS[0]?.title.toLowerCase() || "call";

export function SidebarRight({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const { state } = useCallContext();

  const router = useRouter();
  const searchParams = useSearchParams();

  const sectionKey = useMemo(() => {
    const key = searchParams?.get(KEY);
    return SECTIONS.some((s) => s.title.toLowerCase() === key)
      ? key!
      : DEFAULT_SECTION_KEY;
  }, [searchParams]);

  const handleSectionChange = useCallback(
    (key: string) => {
      const params = new URLSearchParams(searchParams?.toString() || "");
      params.set(KEY, key);
      router.replace(`?${params.toString()}`);
    },
    [router, searchParams]
  );

  return (
    <Sidebar
      {...props}
      className={cn("sticky top-0 h-svh w-[350px]")}
      {...props}
    >
      <SidebarHeader>
        <ExpandableTabs
          sectionKey={sectionKey}
          handleSectionChange={handleSectionChange}
        />
        <Input placeholder={`Search ${sectionKey} ...`} />
      </SidebarHeader>
      <SidebarContent className="p-4">
        <div className="flex items-center gap-2">
          <div className="bg-border h-px w-4" />
          <span className="text-sm font-medium capitalize">{sectionKey}</span>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}

interface ExpandableTabsProps {
  sectionKey: string;
  handleSectionChange: (key: string) => void;
}

const ExpandableTabs = ({
  sectionKey,
  handleSectionChange,
}: ExpandableTabsProps) => {
  const buttonVariants = {
    initial: {
      gap: 0,
    },
    animate: (isSelected: boolean) => ({
      gap: isSelected ? ".5rem" : 0,
    }),
  };

  const spanVariants = {
    initial: { width: 0, opacity: 0 },
    animate: { width: "auto", opacity: 1 },
    exit: { width: 0, opacity: 0 },
  };

  return (
    <div className="flex gap-1">
      {SECTIONS.map((section, index) => {
        return (
          <motion.button
            key={section.title}
            variants={buttonVariants}
            initial={false}
            animate="animate"
            custom={sectionKey === section.title.toLowerCase()}
            onClick={() => handleSectionChange(section.title.toLowerCase())}
            transition={TRANSITION}
            className={cn(
              "bg-sidebar-inset flex h-9 flex-1 items-center justify-center rounded-md px-3"
            )}
          >
            {<section.icon className="size-4" />}
            <AnimatePresence initial={false}>
              {sectionKey === section.title.toLowerCase() && (
                <motion.span
                  variants={spanVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={TRANSITION}
                  className="overflow-hidden whitespace-pre text-sm"
                >
                  {section.title}
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        );
      })}
    </div>
  );
};
