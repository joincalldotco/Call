"use client";
import { useState, useEffect } from "react";
import { Card, CardContent, CardFooter } from "@call/ui/components/card";
import { Input } from "@call/ui/components/input";
import { Button } from "@call/ui/components/button";
import { Label } from "@call/ui/components/label";
import { useRouter } from "next/navigation";

interface Contact {
  contactId: string;
  name: string;
  email: string;
}

export function CreateCallModal({
  onClose,
  onCallCreated,
  selectedContact
}: {
  onClose?: () => void;
  onCallCreated?: (callId: string) => void;
  selectedContact?: string
}) {
  const [meetingName, setMeetingName] = useState("");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [callId, setCallId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchContacts = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/contacts`, {
          credentials: "include",
        });
        if (!res.ok) {
          console.error("Failed to fetch contacts");
          return;
        };
        const data = await res.json();
        setContacts(data.contacts || []);
      } catch (err) {
        console.error("Failed to fetch contacts", err);
      }
    };
    fetchContacts();
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (selectedContact) {
      console.log("🔍 [CALLS DEBUG] Selected contact:", selectedContact);
      setSelectedMembers((prev) => {
        if (prev.includes(selectedContact)) {
          return prev;
        }
        return [...prev, selectedContact];
      });
    }
  }, [selectedContact]);

  const handleMemberToggle = (email: string) => {
    setSelectedMembers((prev) =>
      prev.includes(email) ? prev.filter((e) => e !== email) : [...prev, email]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!meetingName.trim()) {
      setError("Meeting name is required");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/calls/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: meetingName.trim(),
          members: selectedMembers.length > 0 ? selectedMembers : undefined,
        }), 
      });
      const data = await res.json();
      console.log("🔍 [CALLS DEBUG] Response:", data);
      if (!res.ok) {
        setError(data?.error || "Failed to create call");
      } else {
        setSuccess(true);
        setCallId(data.callId);
        setTimeout(() => {
          onCallCreated?.(data.callId);
          onClose?.();
          router.push(`/app/call/${data.callId}`);
        }, 2000);
      }
    } catch (err) {
      setError("Network error, try again");
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) return null;

  return (
    <Card className="w-full max-w-md">
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit}>
          <div className="flex flex-col gap-6">
            <div className="grid gap-2">
              <Label htmlFor="meetingName">Meeting Name</Label>
              <Input
                id="meetingName"
                type="text"
                placeholder="Enter meeting name"
                required
                value={meetingName}
                onChange={(e) => setMeetingName(e.target.value)}
                disabled={loading || success}
              />
            </div>
            <div className="grid gap-2">
              <Label>Select Contacts (optional)</Label>
              <div className="max-h-48 space-y-2 overflow-y-auto rounded-md border p-2">
                {contacts.length === 0 ? (
                  <p className="text-muted-foreground py-4 text-center text-sm">
                    No contacts available
                  </p>
                ) : (
                  contacts.map((contact, index) => (
                    <div
                      key={`${contact.contactId}-${index}`}
                      className="hover:bg-muted flex items-center justify-between rounded p-2"
                    >
                      <div className="flex-1">
                        <p className="text-sm font-medium">{contact.name}</p>
                        <p className="text-muted-foreground text-xs">
                          {contact.email}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant={
                          selectedMembers.includes(contact.email)
                            ? "default"
                            : "outline"
                        }
                        size="sm"
                        onClick={() => handleMemberToggle(contact.email)}
                        disabled={loading || success}
                      >
                        {selectedMembers.includes(contact.email)
                          ? "Invited"
                          : "Invite"}
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>
            {error && <div className="text-sm text-red-500">{error}</div>}
            {success && callId && (
              <div className="text-center text-sm text-green-600">
                Call created!
                <br />
                <span className="font-mono text-lg">{callId}</span>
              </div>
            )}
          </div>
          <CardFooter className="mt-6 flex-col gap-2">
            <Button
              type="submit"
              className="w-full"
              disabled={loading || success}
            >
              {loading ? "Creating..." : success ? "Created!" : "Start Call"}
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={onClose}
              type="button"
              disabled={loading}
            >
              Cancel
            </Button>
          </CardFooter>
        </form>
      </CardContent>
    </Card>
  );
}
