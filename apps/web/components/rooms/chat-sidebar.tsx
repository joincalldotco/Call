import { shortEnLocale } from "@/lib/utils";
import { Button, buttonVariants } from "@call/ui/components/button";
import { Icons } from "@call/ui/components/icons";
import { Input } from "@call/ui/components/input";
import { ScrollArea } from "@call/ui/components/scroll-area";
import { UserProfile } from "@call/ui/components/use-profile";
import { cn } from "@call/ui/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { X } from "lucide-react";
import { motion as m } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { ParticipantsSidebar } from "./participants-sidebar";
import { useCallContext } from "@/contexts/call-context";
import type { ActiveSection } from "@/lib/types";

const CHAT_SECTIONS = [
  {
    key: "chat",
    label: "Chat",
  },
  {
    key: "participants",
    label: "Participants",
  },
];

interface Message {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  timestamp: number;
}

interface Participant {
  id: string;
  displayName: string;
  isCreator?: boolean;
  isMicOn?: boolean;
  isCameraOn?: boolean;
}

interface ChatSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  socket: WebSocket | null;
  userId: string;
  displayName: string;
  userAvatar?: string;
  participants?: Participant[];
  activeSection: ActiveSection | null;
  onActiveSectionChange: (section: ActiveSection | null) => void;
}

export function ChatSidebar({
  open,
  onOpenChange,
  socket,
  userId,
  displayName,
  userAvatar,
  participants = [],
  activeSection,
  onActiveSectionChange,
}: ChatSidebarProps) {
  const {
    state: { isCreator, callId },
  } = useCallContext();

  return (
    <m.div
      initial={{ width: 0, opacity: 0, minWidth: 0 }}
      animate={{
        width: open ? "400px" : 0,
        opacity: open ? 1 : 0,
        minWidth: open ? "400px" : 0,
      }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className={cn(
        "bg-inset-accent border-sidebar-inset z-50 flex h-screen w-full flex-col",
        !open && "pointer-events-none"
      )}
      aria-hidden={!open}
    >
      <div className="flex h-12 items-center justify-between">
        <div className="border-inset-accent bg-sidebar-inset flex w-fit items-center justify-between gap-2 rounded-br-lg border p-1">
          {CHAT_SECTIONS.map((section) => (
            <m.button
              whileTap={{ scale: 0.98 }}
              key={section.key}
              aria-pressed={
                activeSection === (section.key as typeof activeSection)
              }
              aria-label={`Show ${section.label}`}
              onClick={() =>
                onActiveSectionChange(section.key as ActiveSection)
              }
              className={cn(
                "relative z-0",
                buttonVariants({ variant: "ghost" }),
                activeSection === section.key && "font-semibold",
                "hover:bg-transparent! rounded-tr-none"
              )}
            >
              {section.label}
              {activeSection === section.key && (
                <m.div
                  className={cn(
                    "bg-sidebar-accent absolute inset-0 -z-10 rounded-md",
                    activeSection === "participants" && "rounded-tr-none",
                    activeSection === "chat" && "rounded-l-none"
                  )}
                  layoutId="active-call-section-indicator"
                />
              )}
            </m.button>
          ))}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            onOpenChange(false);
            onActiveSectionChange(null);
          }}
          aria-label="Close sidebar"
        >
          <X />
        </Button>
      </div>

      <div className="relative flex-1 overflow-hidden">
        <div
          className={cn(
            "absolute inset-0",
            activeSection === "chat" ? "block" : "hidden"
          )}
          aria-hidden={activeSection !== "chat"}
        >
          <Messages
            socket={socket}
            userId={userId}
            displayName={displayName}
            userAvatar={userAvatar}
          />
        </div>

        <div
          className={cn(
            "absolute inset-0",
            activeSection === "participants" ? "block" : "hidden"
          )}
          aria-hidden={activeSection !== "participants"}
        >
          <ParticipantsSidebar
            callId={callId || ""}
            isCreator={isCreator}
            participants={participants}
            currentUserId={userId}
          />
        </div>
      </div>
    </m.div>
  );
}

const Messages = ({
  socket,
  userId,
  displayName,
  userAvatar,
}: {
  socket: WebSocket | null;
  userId: string;
  displayName: string;
  userAvatar: string | undefined;
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const {
    state: { isChatOpen },
    dispatch,
  } = useCallContext();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (!socket) return;

    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "chat") {
          setMessages((prev) => [...prev, data.message]);
          setTimeout(scrollToBottom, 100);
          if (data.message?.senderId !== userId && !isChatOpen) {
            dispatch({ type: "INCREMENT_UNREAD_CHAT" });
          }
        }
      } catch (err) {
        console.error("Error processing chat message:", err);
      }
    };

    socket.addEventListener("message", handleMessage);
    return () => socket.removeEventListener("message", handleMessage);
  }, [socket]);

  const sendMessage = () => {
    if (!socket || !inputValue.trim() || socket.readyState !== WebSocket.OPEN)
      return;

    const message: Message = {
      id: crypto.randomUUID(),
      text: inputValue.trim(),
      senderId: userId,
      senderName: displayName,
      senderAvatar: userAvatar,
      timestamp: Date.now(),
    };

    socket.send(
      JSON.stringify({
        type: "chat",
        message,
      })
    );

    setInputValue("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex h-[calc(100vh-3rem)] flex-col">
      <div className="flex-1 pt-2">
        <ScrollArea className="h-full max-h-[calc(100vh-8rem)] p-2">
          <div className="flex flex-col gap-2">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex gap-2",
                  message.senderId === userId && "flex-row-reverse"
                )}
              >
                <div
                  className={cn(
                    "flex w-3/4 flex-row-reverse gap-2",
                    message.senderId === userId && "flex-row"
                  )}
                >
                  <div
                    className={cn(
                      "flex flex-1 flex-col gap-1",
                      message.senderId === userId && ""
                    )}
                  >
                    <span
                      className={cn(
                        "text-muted-foreground text-xs",
                        message.senderId === userId && "self-end"
                      )}
                    >
                      {formatDistanceToNow(new Date(message.timestamp), {
                        addSuffix: true,
                        locale: shortEnLocale,
                      })}
                    </span>
                    <span className="bg-sidebar rounded-lg p-2">
                      {message.text}
                    </span>
                  </div>
                  <UserProfile
                    className="mt-5"
                    name={message.senderName}
                    url={message.senderAvatar}
                  />
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      </div>
      <div className="border-sidebar-inset border-t p-2">
        <div className="bg-sidebar-inset flex items-center gap-2 rounded-lg border p-2">
          <Input
            placeholder="Type a message..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyPress}
            className="border-none outline-none"
          />
          <Button
            size="icon"
            onClick={sendMessage}
            disabled={!inputValue.trim()}
          >
            <Icons.thoughtsIcon className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
