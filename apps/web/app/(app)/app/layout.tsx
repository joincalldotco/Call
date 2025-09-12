"use client";
import { AppSidebar } from "@/components/app/section/_components/app-sidebar";
import { Providers } from "@/components/providers";
import { SidebarInset, SidebarProvider } from "@call/ui/components/sidebar";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";

const sectionMap = [
  { path: "/app/call", title: "Call" },
  { path: "/app/teams", title: "Teams" },
  { path: "/app/contacts", title: "Contacts" },
  { path: "/app/schedule", title: "Schedule" },
  { path: "/app/notifications", title: "Notifications" },
  { path: "/app/profile", title: "Profile" },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const selectedSection =
    sectionMap.find((s) => pathname?.startsWith(s.path))?.title || "Call";

  const handleSectionSelect = (title: string) => {
    if (title === "Schedule") {
      toast.info("This section will be available soon.");
      return;
    }
    const section = sectionMap.find((s) => s.title === title);
    if (section) {
      router.push(section.path);
    }
  };

  return (
    <Providers>
      <SidebarProvider>
        <AppSidebar
          selectedSection={selectedSection}
          onSectionSelect={handleSectionSelect}
        />
        <SidebarInset>{children}</SidebarInset>
      </SidebarProvider>
    </Providers>
  );
}
