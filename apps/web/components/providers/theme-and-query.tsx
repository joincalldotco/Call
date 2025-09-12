"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { scan } from "react-scan";
import { useEffect } from "react";

export function ThemeAndQueryProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    scan({
      enabled: process.env.NODE_ENV === "development",
    });
  }, []);

  const [queryClient] = React.useState(() => new QueryClient());

  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      disableTransitionOnChange
      enableColorScheme
    >
      <QueryClientProvider client={queryClient}>
        {children}
        <Toaster position="bottom-right" />
      </QueryClientProvider>
    </NextThemesProvider>
  );
}
