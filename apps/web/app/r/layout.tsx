import { SidebarProvider } from "@call/ui/components/sidebar";
import React from "react";
import { ThemeAndQueryProviders } from "@/components/providers/theme-and-query";
import { SessionProvider } from "@/components/providers/session";
import { SocketProvider } from "@/components/providers/socket";
import { CallProvider } from "@/contexts/call-context";

const RoomLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <SidebarProvider className="bg-transparent">
      <ThemeAndQueryProviders>
        <SessionProvider>
          <SocketProvider>
            <CallProvider>
              <div className="size-full">{children}</div>
            </CallProvider>
          </SocketProvider>
        </SessionProvider>
      </ThemeAndQueryProviders>
    </SidebarProvider>
  );
};

export default RoomLayout;
