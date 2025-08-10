"use client";

import { CallHistory } from "./_components/call-history";
import { JoinCallBox } from "./_components/join-call-box";

interface CallSectionProps {
  section: string;
}

const CallSection = ({ section }: CallSectionProps) => {
  const Sections = {
    joincall: (
      <div className="flex h-full w-full items-center justify-center">
        <JoinCallBox />
      </div>
    ),
    history: (
      <div className="h-full w-full">
        <CallHistory />
      </div>
    ),
  };

  return (
    <div className="h-full w-full px-10 pt-4">
      {Sections[section as keyof typeof Sections]}
    </div>
  );
};

export default CallSection;
