import Link from "next/link";
import { Badge } from "@call/ui/components/badge";
import { siteConfig } from "@/lib/site";
import { Icons } from "@call/ui/components/icons";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Call - Roadmap",
};

type Status = "completed" | "in-progress" | "not-started";

function StatusBadge({ status }: { status: Status }) {
  const labelMap: Record<Status, string> = {
    "completed": "Completed",
    "in-progress": "In progress",
    "not-started": "Not started",
  };

  const colorMap: Record<Status, string> = {
    "completed": "bg-emerald-500 text-white border-emerald-500",
    "in-progress": "bg-blue-500 text-white border-blue-500",
    "not-started": "bg-zinc-600 text-white border-zinc-600",
  };

  return <Badge className={colorMap[status]}>{labelMap[status]}</Badge>;
}

export default function Page() {
  return (
    <section className="relative mx-auto w-full max-w-5xl px-6 pt-30 pb-16">
      <header className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Blog</h1>
        <Badge asChild  className="gap-1 bg-[#202020] cursor-pointer text-white  hover:bg-[#202020]/80">
        <a
          href="https://github.com/joincalldotco"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Open Source"
        >
         <Icons.github className="h-3 w-3" /> Open Source
        </a>
      </Badge>
      </header>

     

      <div className="mx-auto max-w-5xl space-y-8">
        
      
      </div>
    </section>
  );
}