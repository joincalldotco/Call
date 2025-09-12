"use client";

import { useModal } from "@/hooks/use-modal";
import { Collapsible } from "@call/ui/components/collapsible";
import { Icons, type IconProps } from "@call/ui/components/icons";
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from "@call/ui/components/sidebar";
import type { JSX } from "react";

export function NavMain({
  items,
  onSelect,
}: {
  items: {
    title: string;
    url: string;
    icon?: (props: IconProps) => JSX.Element;
    isActive?: boolean;
    items?: {
      title: string;
      url: string;
    }[];
  }[];
  onSelect?: (title: string) => void;
}) {
  const { onOpen } = useModal();
  const { state } = useSidebar();
  const isExpanded = state === "expanded";

  return (
    <SidebarGroup>
      <SidebarMenu className="flex flex-col">
        <SidebarMenuItem className="mb-5">
          <SidebarMenuButton
            tooltip="Start Call"
            isActive={true}
            onClick={() => onOpen("start-call")}
            className="flex items-center justify-center gap-3 rounded-lg border border-gray-200 !bg-white text-sm !font-semibold hover:bg-gray-50"
          >
            <Icons.plus style={{ width: 14, height: 14 }} />
            {isExpanded && <span className="text-black">Start Call</span>}
          </SidebarMenuButton>
        </SidebarMenuItem>

        {items.map((item) => (
          <Collapsible
            key={item.title}
            asChild
            defaultOpen={item.isActive}
            className="group/collapsible"
          >
            <SidebarMenuItem>
              <SidebarMenuButton
                tooltip={item.title}
                isActive={item.isActive}
                onClick={() => onSelect?.(item.title)}
              >
                {item.icon && <item.icon />}
                <span>{item.title}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </Collapsible>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
