"use client";

import { SquareDot } from "@call/ui/components/square-dot";
import Link from "next/link";
import React, { useState, useEffect } from "react";

const Footer = () => {
  const [currentYear, setCurrentYear] = useState<string>("");

  useEffect(() => {
    setCurrentYear(new Date().getFullYear().toString());
  }, []);

  return (
    <div className="max-w-5xl w-full mx-auto px-6 py-10 flex items-center justify-center flex-col relative gap-5 mt-auto">
      <div className="h-px w-full bg-border dark:bg-white/5 max-w-lg mx-auto flex items-center justify-center gap-2 relative">
        <SquareDot />
        <SquareDot position="bottomRight" />
      </div>
      <div className="flex items-center justify-center gap-2">
        <Link href="/privacy">Privacy Policy</Link>
        <p className="text-sm text-muted-foreground">
          &copy; {currentYear} Call. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default Footer;
