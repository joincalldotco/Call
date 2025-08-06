"use client";

import { useState } from "react";
import { Button } from "@call/ui/components/button";
import { Monitor, UserPlus } from "lucide-react";
import {
  motion,
  AnimatePresence,
  LayoutGroup,
  type Variants,
} from "motion/react";
import { cn } from "@call/ui/lib/utils";
import {
  containerVariants,
  participantVariants,
  screenShareVariants,
} from "@/lib/constants";
import NumberFlow from "@number-flow/react";

export default function GoogleMeetLayout() {
  const [participants, setParticipants] = useState([{ id: 1, name: "You" }]);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  const maxParticipants = 11;

  const visibleParticipants = participants.slice(0, maxParticipants);
  const remainingParticipants = participants.slice(maxParticipants);

  const addParticipant = () => {
    const newId = Math.max(...participants.map((p) => p.id)) + 1;
    setParticipants([
      ...participants,
      { id: newId, name: `Participant ${newId}` },
    ]);
  };

  const removeParticipant = (id: number) => {
    if (participants.length > 1) {
      setParticipants(participants.filter((p) => p.id !== id));
    }
  };

  const toggleScreenShare = () => {
    setIsScreenSharing(!isScreenSharing);
  };

  const getGridLayout = (count: number) => {
    if (count <= 1) return "grid-cols-1";
    if (count <= 4) return "grid-cols-2";
    if (count <= 9) return "grid-cols-3";
    if (count <= 16) return "grid-cols-4";
    return "grid-cols-4";
  };

  const getGridRows = (count: number) => {
    if (count <= 1) return "grid-rows-1 bg-red";
    if (count <= 2) return "grid-rows-1 bg-red";
    if (count <= 4) return "grid-rows-2 bg-red";
    if (count <= 9) return "grid-rows-3 bg-red";
    if (count <= 16) return "grid-rows-4 bg-red";
    return "grid-rows-4";
  };

  return (
    <div className="bg-background flex min-h-screen flex-col">
      <div className="mb-6 flex h-16 justify-center gap-4 border-b">
        <div className="flex items-center gap-2">
          <Button
            onClick={addParticipant}
            className="bg-blue-600 text-white hover:bg-blue-700"
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Add Participant
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={toggleScreenShare}
            variant={isScreenSharing ? "destructive" : "default"}
            className={
              isScreenSharing
                ? ""
                : "bg-green-600 text-white hover:bg-green-700"
            }
          >
            <Monitor className="mr-2 h-4 w-4" />
            {isScreenSharing ? "Stop Screen Share" : "Add Screen Share"}
          </Button>
        </div>
      </div>

      <div
        className={cn(
          "mx-auto flex w-full max-w-7xl flex-1 items-center justify-center"
        )}
      >
        <AnimatePresence mode="wait">
          {isScreenSharing && (
            <motion.div
              className="mb-6"
              variants={screenShareVariants as Variants}
              initial="hidden"
              animate="visible"
              exit="exit"
              layout
            >
              <motion.div
                className="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-lg border-2 border-gray-600 bg-gray-800"
                whileHover={{ scale: 1.01 }}
                transition={{ duration: 0.2 }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 to-purple-900/20"></div>
                <div className="z-10 text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: "spring", stiffness: 300 }}
                  >
                    <Monitor className="mx-auto mb-4 h-16 w-16 text-blue-400" />
                  </motion.div>
                  <motion.h3
                    className="mb-2 text-2xl font-semibold text-white"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.5 }}
                  >
                    Screen Sharing
                  </motion.h3>
                  <motion.p
                    className="text-gray-300"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4, duration: 0.5 }}
                  >
                    Presenter is sharing their screen
                  </motion.p>
                </div>
                <motion.div
                  className="absolute left-4 top-4 rounded-full bg-red-600 px-3 py-1 text-sm font-medium text-white"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: [1, 0.7, 1] }}
                  transition={{
                    delay: 0.5,
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                >
                  LIVE
                </motion.div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <LayoutGroup>
          <motion.div
            className={cn(
              "grid w-full justify-center gap-4",
              getGridLayout(participants.length),
              getGridRows(participants.length),
              "auto-rows-fr"
            )}
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            layout
            transition={{
              layout: {
                type: "spring",
                stiffness: 300,
                damping: 30,
                duration: 0.6,
              },
            }}
          >
            <AnimatePresence mode="popLayout">
              {visibleParticipants.map((participant, index) => (
                <motion.div
                  key={participant.id}
                  layoutId={`participant-${participant.id}`}
                  variants={participantVariants as Variants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  layout
                  className={cn(
                    "bg-inset-accent border-inset-accent-foreground relative flex min-h-[200px] cursor-pointer items-center justify-center overflow-hidden rounded-lg border-4",
                    {
                      "w-auto": visibleParticipants.length > 9,
                      "aspect-video": visibleParticipants.length <= 9,
                    }
                  )}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => removeParticipant(participant.id)}
                >
                  <motion.div
                    className="sls pointer-events-none absolute bottom-4 left-4 rounded bg-black/70 px-3 py-1 text-sm font-medium text-white"
                    layoutId={`participant-name-${participant.id}`}
                  >
                    {participant.name}
                  </motion.div>

                  {participants.length > 1 && (
                    <motion.div
                      className="absolute inset-0 flex items-center justify-center bg-red-600/20 opacity-0 transition-opacity duration-200 hover:opacity-100"
                      initial={{ opacity: 0 }}
                      whileHover={{ opacity: 1 }}
                    >
                      <span className="font-medium text-white">
                        Click to remove
                      </span>
                    </motion.div>
                  )}
                </motion.div>
              ))}
              {remainingParticipants.length > 0 && (
                <div className="bg-inset-accent border-inset-accent-foreground relative flex min-h-[200px] cursor-pointer items-center justify-center overflow-hidden rounded-lg border-4">
                  <span className="text-2xl font-bold text-white">
                    <span className="text-sm"> + </span>
                    <NumberFlow value={remainingParticipants.length} />
                    <span className="text-sm"> more</span>
                  </span>
                </div>
              )}
            </AnimatePresence>
          </motion.div>
        </LayoutGroup>
      </div>
    </div>
  );
}
