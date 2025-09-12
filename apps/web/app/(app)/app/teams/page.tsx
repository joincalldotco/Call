"use client";

import Header from "@/components/app/header";
import TeamSection from "@/components/app/section/team-section";
import { useModal } from "@/hooks/use-modal";
import { Button } from "@call/ui/components/button";
import { CloseSidebarButton } from "@/components/app/section/_components/close-sidebar-button";

export default function TeamsPage() {
  const { onOpen } = useModal();
  return (
    <div className="flex flex-col">
      <Header className="justify-between">
        <div>
          <CloseSidebarButton className="-ml-8" />
        </div>
        <Button
          onClick={() => onOpen("create-team")}
          className="rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50"
        >
          Create Team
        </Button>
      </Header>
      <TeamSection />
    </div>
  );
}
