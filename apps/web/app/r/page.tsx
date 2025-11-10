"use client";

import { LoadingButton } from "@call/ui/components/loading-button";
import { cn } from "@call/ui/lib/utils";
import { motion, MotionConfig, type Transition } from "motion/react";
import { useState, useEffect, useRef, use } from "react";
import { useUnauthenticatedMeeting } from "@/hooks/use-unauthenticated-meeting";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";

const tabs = ["Join", "Start"] as const;

const transition: Transition = {
  type: "spring",
  stiffness: 80,
  damping: 10,
  mass: 0.5,
  duration: 0.4,
};

const formVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 20 },
};

function MeetingFormClient() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>("Join");
  const hasSetMeetingId = useRef(false);
  const {
    formData,
    errors,
    isLoading,
    updateFormData,
    joinMeeting,
    startMeeting,
    clearErrors,
  } = useUnauthenticatedMeeting();

  useEffect(() => {
    if (!hasSetMeetingId.current) {
      setActiveTab("Join");
      updateFormData("meetingId", searchParams.get("meetingId") || "");
      hasSetMeetingId.current = true;
    }
  }, [searchParams.get("meetingId"), updateFormData]);

  const handleTabChange = (tab: (typeof tabs)[number]) => {
    setActiveTab(tab);
    clearErrors();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (activeTab === "Join") {
      window.location.href = `/r/${formData.meetingId}`;
      toast.success("Joined meeting successfully");
    } else {
      const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
      let code = "";
      for (let i = 0; i < 6; i++)
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      window.location.href = `/r/${code}`;
      toast.success("Meeting created successfully");
    }
  };

  return (
    <MotionConfig transition={transition}>
      <div className="bg-sidebar-inset flex min-h-screen items-center justify-center">
        <div className="min-h-60 w-full max-w-md">
          <div className="w-full">
            <div className="border-sidebar-foreground/10 flex gap-2 border-b py-2">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => handleTabChange(tab)}
                  className={cn(
                    "relative flex-1 rounded-lg py-2 text-sm font-medium transition",
                    activeTab === tab
                      ? "text-white"
                      : "text-gray-500 hover:text-white"
                  )}
                >
                  {activeTab === tab && (
                    <motion.div
                      layoutId="activeTab"
                      className="bg-sidebar border-sidebar-foreground/10 absolute inset-0 rounded-lg border"
                      transition={{ type: "spring", duration: 1 }}
                    />
                  )}
                  <motion.span
                    layoutId={`${tab}-label`}
                    className="relative z-10"
                  >
                    {tab} Meeting
                  </motion.span>
                </button>
              ))}
            </div>

            <div className="mt-6">
              <motion.form
                onSubmit={handleSubmit}
                className="space-y-4 overflow-hidden"
                layout
                transition={{
                  layout: {
                    type: "spring",
                    stiffness: 80,
                    damping: 12,
                  },
                }}
              >
                <div>
                  <motion.input
                    layoutId="name"
                    type="text"
                    placeholder="Display name"
                    value={formData.name}
                    onChange={(e) => updateFormData("name", e.target.value)}
                    className={cn(
                      "border-sidebar-foreground/10 bg-sidebar-foreground/10 text-sidebar-foreground-foreground z-50 h-10 w-full rounded-lg border px-4 py-2 focus:outline-none",
                      errors.name && "border-primary-red bg-primary-red/10"
                    )}
                  />
                  {errors.name && (
                    <motion.span
                      layoutId="name-label"
                      className="text-primary-red -z-10 text-xs"
                    >
                      {errors.name}
                    </motion.span>
                  )}
                </div>

                <div className="z-0">
                  <motion.input
                    key={`${activeTab}-meetingId`}
                    type="text"
                    placeholder="Meeting ID"
                    value={formData.meetingId || ""}
                    onChange={(e) =>
                      updateFormData("meetingId", e.target.value)
                    }
                    layoutId="meetingId"
                    className={cn(
                      "border-sidebar-foreground/10 bg-sidebar-foreground/10 text-sidebar-foreground-foreground z-[3] h-10 w-full rounded-lg border px-4 py-2 focus:outline-none",
                      activeTab !== "Join" && "hidden",
                      errors.meetingId && "border-primary-red bg-primary-red/10"
                    )}
                  />
                  {activeTab === "Join" && errors.meetingId && (
                    <motion.span
                      layoutId="meetingId-label"
                      className="text-primary-red -z-10 text-xs"
                    >
                      {errors.meetingId}
                    </motion.span>
                  )}
                </div>

                <LoadingButton
                  type="submit"
                  layoutId="submit"
                  disabled={isLoading}
                  className="text-sidebar-foreground-foreground border-primary-blue bg-primary-blue hover:bg-primary-blue/80 z-10 h-10 w-full rounded-lg border px-4 py-2.5 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isLoading
                    ? "Processing..."
                    : activeTab === "Start"
                      ? "Start Meeting"
                      : "Join Meeting"}
                </LoadingButton>
              </motion.form>
            </div>
          </div>
        </div>
      </div>
    </MotionConfig>
  );
}

export default function MeetingForm() {
  return <MeetingFormClient />;
}
