// This file defines the user section in the sidebar, showing user info and a dropdown menu for user actions.
"use client";

import {
  BadgeCheck,
  Bell,
  ChevronsUpDown,
  CreditCard,
  LogOut,
  Sparkles,
} from "lucide-react";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@call/ui/components/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@call/ui/components/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@call/ui/components/sidebar";
import { authClient } from "@call/auth/auth-client";
import { useRouter } from "next/navigation";
import { UserProfile } from "@call/ui/components/use-profile";

export function NavUser({
  user,
}: {
  user: {
    name: string;
    email: string;
    avatar: string;
  };
}) {
  const { isMobile, state } = useSidebar();
  const router = useRouter();

  function getInitials(name?: string) {
    if (!name) return "";
    return name
      .trim()
      .split(/\s+/)
      .map((word) => word[0]?.toUpperCase())
      .join("")
      .slice(0, 2);
  }

  const handleSignOut = async () => {
    await authClient.signOut();
    router.push("/login");
  };
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:text-sidebar-accent-foreground data-[state=collapsed]:p-0 hover:bg-white/5"
            >
              <UserProfile
                className="rounded-lg"
                name={user.name}
                url={user.avatar}
                size={state === "collapsed" ? "lg" : "sm"}
              />
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate text-sm font-medium capitalize">
                  {user.name}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto" size="sm" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg border-1 border-[#434343] bg-[#2F2F2F] p-1 shadow-xl"
            side="bottom"
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className="rounded-lg">
                    {getInitials(user.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user.name}</span>
                  <span className="truncate text-xs">{user.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem className="rounded-md hover:bg-white/5" onClick={() => router.push("/app/profile")}>
                <BadgeCheck />
                Account
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleSignOut}
              className="cursor pointer rounded-md text-[#ff6347] hover:text-[#ff6347]/80 hover:bg-white/5"
            >
              <LogOut />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
