"use client";

import Modals from "@/components/modal";
import React from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <React.Fragment>
      {children}
      <Modals />
    </React.Fragment>
  );
}
