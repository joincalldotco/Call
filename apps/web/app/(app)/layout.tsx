import { Providers } from "@/components/providers";
import { ContactsProvider } from "@/components/providers/contacts";
import { SessionProvider } from "@/components/providers/session";
import { SocketProvider } from "@/components/providers/socket";
import { ThemeAndQueryProviders } from "@/components/providers/theme-and-query";
import SocketConnectionIndicator from "@/components/socket-connection-indicator";
import { CallProvider } from "@/contexts/call-context";
import { auth } from "@call/auth/auth";
import { headers } from "next/headers";
import React from "react";

const AppLayout = async ({ children }: { children: React.ReactNode }) => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return (
    <SocketProvider>
      <ThemeAndQueryProviders>
        <SessionProvider value={session || undefined}>
          <Providers>
            <CallProvider>
              <ContactsProvider>
                {children}
                <SocketConnectionIndicator />
              </ContactsProvider>
            </CallProvider>
          </Providers>
        </SessionProvider>
      </ThemeAndQueryProviders>
    </SocketProvider>
  );
};

export default AppLayout;
