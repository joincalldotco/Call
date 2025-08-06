import { useState, useEffect, useRef } from "react";
import { Sheet, SheetContent, SheetTitle } from "@call/ui/components/sheet";
import { Input } from "@call/ui/components/input";
import { Button } from "@call/ui/components/button";
import { ScrollArea } from "@call/ui/components/scroll-area";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@call/ui/components/avatar";
import { formatDistanceToNow } from "date-fns";

interface Message {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  timestamp: number;
}

interface ChatSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  socket: WebSocket | null;
  userId: string;
  displayName: string;
  userAvatar?: string;
}

export function ChatSidebar({
  open,
  onOpenChange,
  socket,
  userId,
  displayName,
  userAvatar,
}: ChatSidebarProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
          // Scroll to bottom on new message with a small delay to ensure content is rendered
          setTimeout(scrollToBottom, 100);
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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-[400px] flex-col p-0">
        <div className="border-b p-4">
          <SheetTitle className="text-lg font-semibold">Chat</SheetTitle>
        </div>

        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-[calc(100vh-8rem)]">
            <div className="flex flex-col gap-4 p-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${
                    message.senderId === userId ? "flex-row-reverse" : ""
                  }`}
                >
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarImage src={message.senderAvatar} />
                    <AvatarFallback>
                      {message.senderName.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div
                    className={`flex max-w-[80%] flex-col ${
                      message.senderId === userId ? "items-end" : ""
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {message.senderId === userId
                          ? "You"
                          : message.senderName}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {formatDistanceToNow(message.timestamp, {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                    <div
                      className={`mt-1 rounded-lg px-3 py-2 ${
                        message.senderId === userId
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      {message.text}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
        </div>

        <div className="mt-auto border-t p-4">
          <div className="flex gap-2">
            <Input
              placeholder="Type a message..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyPress}
            />
            <Button onClick={sendMessage} disabled={!inputValue.trim()}>
              Send
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
