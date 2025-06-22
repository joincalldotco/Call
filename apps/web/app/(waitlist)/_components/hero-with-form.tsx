"use client";

import { siteConfig } from "@/lib/site";
import { Button } from "@call/ui/components/button";
import { WaitlistForm } from "./waitlist";

const HeroWithForm = () => {
  return (
    <div className="max-w-5xl w-full mx-auto px-6 py-40 flex items-center justify-center flex-col relative gap-5">
      <h1 className="text-3xl font-bold font-lora max-w-lg text-center text-primary/80">
        {siteConfig.description}
      </h1>
      <WaitlistForm />
    </div>
  );
};
export default HeroWithForm;
