"use client";

import { Input } from "@call/ui/components/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@call/ui/components/input-otp";
import { Button } from "@call/ui/components/button";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion as m } from "motion/react";
import { cn } from "@call/ui/lib/utils";

export function JoinCallBox() {
  const [joinMethod, setJoinMethod] = useState<"link" | "code">("link");
  const [link, setLink] = useState("");
  const [code, setCode] = useState("");
  const router = useRouter();

  const handleJoin = () => {
    if (joinMethod === "link" && link) {
      try {
        const url = new URL(link.startsWith("http") ? link : `https://${link}`);
        const pathParts = url.pathname.split("/").filter(Boolean);
        const callIdentifier = pathParts.pop();
        if (callIdentifier) router.push(`/app/call/${callIdentifier}`);
        else window.location.href = link;
      } catch (error) {
        window.location.href = link;
      }
    } else if (joinMethod === "code" && code.length === 6) {
      router.push(`/app/call/${code}`);
    }
  };

  const isButtonDisabled =
    (joinMethod === "link" && !link.trim()) ||
    (joinMethod === "code" && code.length !== 6);

  return (
    <div className="flex w-full items-center justify-center p-4">
      <div className="w-full max-w-[404px] space-y-4">
        {/* Toggle: Enter the link | Enter the code */}
        <div className="flex w-full items-stretch gap-1.5 rounded-[10px] border border-[#282828] p-1">
          <m.button
            type="button"
            onClick={() => setJoinMethod("link")}
            className={cn(
              "relative z-0 flex-1 rounded-[8px] px-3 py-2 text-[16px] font-medium tracking-[-0.02em] transition-all hover:bg-transparent",
              joinMethod === "link" && "font-medium text-white hover:text-white"
            )}
          >
            Enter the link
            {joinMethod === "link" && (
              <m.div
                className="absolute inset-0 -z-10 rounded-[8px] bg-[#282828]"
                layoutId="active-join-method"
              />
            )}
          </m.button>
          <m.button
            type="button"
            onClick={() => setJoinMethod("code")}
            className={cn(
              "relative z-0 flex-1 rounded-[10px] px-3 py-2 text-[16px] font-medium tracking-[-0.02em] transition-all hover:bg-transparent",
              joinMethod === "code" && "font-medium text-white hover:text-white"
            )}
          >
            Enter the code
            {joinMethod === "code" && (
              <m.div
                className="absolute inset-0 -z-10 rounded-[10px] bg-[#282828]"
                layoutId="active-join-method"
              />
            )}
          </m.button>
        </div>
        <AnimatePresence mode="popLayout">
          {joinMethod === "code" ? (
            <m.div
              key="call-code-input"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex w-full items-center justify-center gap-2.5"
              layoutId="call-code-input"
            >
              <InputOTP
                id="call-code"
                maxLength={6}
                value={code}
                onChange={setCode}
              >
                <InputOTPGroup className="flex items-center gap-2.5">
                  {/* Slots 0,1,2 with placeholders 8 2 w when empty */}
                  <InputOTPSlot
                    index={0}
                    className="relative h-14 w-14 !rounded-2xl border-0 bg-[#282828] text-[22px] font-medium text-[#EDEDED] shadow-[0_0_1px_rgba(0,0,0,0.08),0_1px_1px_rgba(0,0,0,0.08),0_2px_8px_-3px_rgba(0,0,0,0.25),inset_0_0_2px_rgba(199,199,199,0.25)] before:pointer-events-none before:absolute before:inset-0 before:flex before:items-center before:justify-center empty:bg-white/5 empty:text-white empty:shadow-[0_0_1px_rgba(0,0,0,0.08),0_1px_1px_rgba(0,0,0,0.08),0_2px_8px_-3px_rgba(0,0,0,0.25),inset_0_0_7px_rgba(199,199,199,0.25),inset_0_0_7px_rgba(199,199,199,0.25)] empty:before:text-white/60 empty:before:content-['8']"
                  />
                  <InputOTPSlot
                    index={1}
                    className="relative h-14 w-14 !rounded-2xl border-0 bg-[#282828] text-[22px] font-medium text-[#EDEDED] shadow-[0_0_1px_rgba(0,0,0,0.08),0_1px_1px_rgba(0,0,0,0.08),0_2px_8px_-3px_rgba(0,0,0,0.25),inset_0_0_2px_rgba(199,199,199,0.25)] before:pointer-events-none before:absolute before:inset-0 before:flex before:items-center before:justify-center empty:bg-white/5 empty:text-white empty:shadow-[0_0_1px_rgba(0,0,0,0.08),0_1px_1px_rgba(0,0,0,0.08),0_2px_8px_-3px_rgba(0,0,0,0.25),inset_0_0_7px_rgba(199,199,199,0.25),inset_0_0_7px_rgba(199,199,199,0.25)] empty:before:text-white/60 empty:before:content-['2']"
                  />
                  <InputOTPSlot
                    index={2}
                    className="relative h-14 w-14 !rounded-2xl border-0 bg-[#282828] text-[22px] font-medium text-[#EDEDED] shadow-[0_0_1px_rgba(0,0,0,0.08),0_1px_1px_rgba(0,0,0,0.08),0_2px_8px_-3px_rgba(0,0,0,0.25),inset_0_0_2px_rgba(199,199,199,0.25)] before:pointer-events-none before:absolute before:inset-0 before:flex before:items-center before:justify-center empty:bg-white/5 empty:text-white empty:shadow-[0_0_1px_rgba(0,0,0,0.08),0_1px_1px_rgba(0,0,0,0.08),0_2px_8px_-3px_rgba(0,0,0,0.25),inset_0_0_7px_rgba(199,199,199,0.25),inset_0_0_7px_rgba(199,199,199,0.25)] empty:before:text-white/60 empty:before:content-['w']"
                  />

                  {/* Separator */}
                  <div className="h-[5px] w-[18px] rounded-full bg-[#282828]" />

                  {/* Slots 3,4,5 */}
                  <InputOTPSlot
                    index={3}
                    className="h-14 w-14 !rounded-2xl border-0 bg-[#282828] text-[22px] font-medium text-[#EDEDED] shadow-[0_0_1px_rgba(0,0,0,0.08),0_1px_1px_rgba(0,0,0,0.08),0_2px_8px_-3px_rgba(0,0,0,0.25),inset_0_0_2px_rgba(199,199,199,0.25)] empty:bg-white/5 empty:text-white empty:shadow-[0_0_1px_rgba(0,0,0,0.08),0_1px_1px_rgba(0,0,0,0.08),0_2px_8px_-3px_rgba(0,0,0,0.25),inset_0_0_7px_rgba(199,199,199,0.25),inset_0_0_7px_rgba(199,199,199,0.25)]"
                  />
                  <InputOTPSlot
                    index={4}
                    className="h-14 w-14 !rounded-2xl border-0 bg-[#282828] text-[22px] font-medium text-[#EDEDED] shadow-[0_0_1px_rgba(0,0,0,0.08),0_1px_1px_rgba(0,0,0,0.08),0_2px_8px_-3px_rgba(0,0,0,0.25),inset_0_0_2px_rgba(199,199,199,0.25)] empty:bg-white/5 empty:text-white empty:shadow-[0_0_1px_rgba(0,0,0,0.08),0_1px_1px_rgba(0,0,0,0.08),0_2px_8px_-3px_rgba(0,0,0,0.25),inset_0_0_7px_rgba(199,199,199,0.25),inset_0_0_7px_rgba(199,199,199,0.25)]"
                  />
                  <InputOTPSlot
                    index={5}
                    className="h-14 w-14 !rounded-2xl border-0 bg-[#282828] text-[22px] font-medium text-[#EDEDED] shadow-[0_0_1px_rgba(0,0,0,0.08),0_1px_1px_rgba(0,0,0,0.08),0_2px_8px_-3px_rgba(0,0,0,0.25),inset_0_0_2px_rgba(199,199,199,0.25)] empty:bg-white/5 empty:text-white empty:shadow-[0_0_1px_rgba(0,0,0,0.08),0_1px_1px_rgba(0,0,0,0.08),0_2px_8px_-3px_rgba(0,0,0,0.25),inset_0_0_7px_rgba(199,199,199,0.25),inset_0_0_7px_rgba(199,199,199,0.25)]"
                  />
                </InputOTPGroup>
              </InputOTP>
            </m.div>
          ) : (
            <m.div
              key="call-link-input"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex w-full items-center justify-center"
            >
              <Input
                id="call-link"
                placeholder="Paste your meeting link"
                className="h-14 w-full rounded-2xl bg-white/5 px-5 text-base text-white placeholder:text-white/60"
                value={link}
                onChange={(e) => setLink(e.target.value)}
              />
            </m.div>
          )}
        </AnimatePresence>

        <div className="w-full">
          <Button
            className="h-14 w-full cursor-pointer rounded-2xl bg-[#282828] text-lg font-medium tracking-[-0.02em] text-white shadow-[inset_0_0_2px_rgba(199,199,199,0.25)] transition-shadow hover:bg-[#282828] hover:text-white hover:shadow-[inset_0_0_7px_rgba(199,199,199,0.25)]"
            onClick={handleJoin}
            disabled={isButtonDisabled}
          >
            Join now
          </Button>
        </div>
      </div>
    </div>
  );
}
