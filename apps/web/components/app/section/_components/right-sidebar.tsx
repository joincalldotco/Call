import * as React from "react";

import { useSession } from "@/components/providers/session";
import { Input } from "@call/ui/components/input";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
} from "@call/ui/components/sidebar";
import { cn } from "@call/ui/lib/utils";
import { useRef, useState } from "react";
import { AnimatePresence, motion, type Transition } from "motion/react";
import { Icons } from "@call/ui/components/icons";
import RecentCalls from "../../section/recent-call";
import Schedules from "../../section/schedules";
import Teams from "../../section/teams";
import Contacts from "../../section/contacts";
import Notifications from "../../section/notifications";

const TRANSITION: Transition = {
  delay: 0.1,
  type: "spring",
  bounce: 0,
  duration: 0.5,
};

export function SidebarRight({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const { user } = useSession();

  return (
    <Sidebar
      collapsible="none"
      className={cn("sticky top-0 hidden h-svh w-[350px] border-l lg:flex")}
      {...props}
    >
      <SidebarHeader>
        <ExpandableTabs />
        <Input placeholder="Search..." />
      </SidebarHeader>
      <SidebarContent></SidebarContent>
    </Sidebar>
  );
}

const ExpandableTabs = () => {
  const [selected, setSelected] = useState<number | null>(null);
  const outsideClickRef = useRef(null);

  const tabs = [
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

  const buttonVariants = {
    initial: {
      gap: 0,
      paddingLeft: ".5rem",
      paddingRight: ".5rem",
    },
    animate: (isSelected: boolean) => ({
      gap: isSelected ? ".5rem" : 0,
      paddingLeft: isSelected ? "1rem" : ".5rem",
      paddingRight: isSelected ? "1rem" : ".5rem",
    }),
  };

  const spanVariants = {
    initial: { width: 0, opacity: 0 },
    animate: { width: "auto", opacity: 1 },
    exit: { width: 0, opacity: 0 },
  };

  return (
    <div ref={outsideClickRef} className="flex gap-1">
      {tabs.map((tab, index) => {
        return (
          <motion.button
            key={tab.title}
            variants={buttonVariants}
            initial={false}
            animate="animate"
            custom={selected === index}
            onMouseEnter={() => setSelected(index)}
            onMouseLeave={() => setSelected(null)}
            transition={TRANSITION}
            className={cn(
              "bg-sidebar-inset flex h-9 flex-1 items-center justify-center rounded-md"
            )}
          >
            {<tab.icon className="size-4" />}
            <AnimatePresence initial={false}>
              {selected === index && (
                <motion.span
                  variants={spanVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={TRANSITION}
                  className="overflow-hidden whitespace-pre text-sm"
                >
                  {tab.title}
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        );
      })}
    </div>
  );
};
