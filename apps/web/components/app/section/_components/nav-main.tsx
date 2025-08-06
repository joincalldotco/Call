"use client";

import { Collapsible } from "@call/ui/components/collapsible";
import { Icons, type IconProps } from "@call/ui/components/icons";
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@call/ui/components/sidebar";
import type { JSX } from "react";
import { useModal } from "@/hooks/use-modal";

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

  return (
    <SidebarGroup>
      <SidebarMenu className="flex flex-col">
        <SidebarMenuItem className="mb-2">
          <SidebarMenuButton
            tooltip="Start Call"
            isActive={true}
            onClick={() => onOpen("start-call")}
            className="flex items-center justify-center gap-2"
          >
            <Icons.plus className="size-4" />
            <span>Start Call</span>
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
