"use client";
import { useEffect, useState, useMemo } from "react";
import { Button } from "@call/ui/components/button";
import { Icons } from "@call/ui/components/icons";
import { Input } from "@call/ui/components/input";
import { iconvVariants, UserProfile } from "@call/ui/components/use-profile";
import { cn } from "@call/ui/lib/utils";
import { useSession } from "@/components/providers/session";

import {
  Trash,
  User,
  Mail,
  Phone,
  X,
  Users,
  Loader2,
  UserPlus,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { useModal } from "@/hooks/use-modal";
import { CALLS_QUERY } from "@/lib/QUERIES";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

// Dropdown removed for minimalist row UI
import SocialButton from "@/components/auth/social-button";

interface Contact {
  id: string;
  name?: string;
  email: string;
  image?: string;
}

interface ContactsListProps {
  onAddContact?: () => void;
}

export default function ContactsList({ onAddContact }: ContactsListProps) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingContact, setDeletingContact] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [callingContact, setCallingContact] = useState<string | null>(null);
  const router = useRouter();
  const { mutate: createCall, isPending: isCalling } = useMutation({
    mutationFn: CALLS_QUERY.createCall,
    onSuccess: (data, variables) => {
      const member = variables.members?.[0];
      toast.success(`Call invitation sent to ${member || "contact"}`);
      router.push(`/app/call/${data.callId}`);
    },
    onError: () => toast.error("Failed to create call"),
    onSettled: () => {
      setCallingContact(null);
    },
  });

  const fetchContacts = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/contacts`,
        {
          credentials: "include",
        }
      );
      if (!res.ok) throw new Error("Failed to fetch contacts");
      const data = await res.json();
      setContacts(data.contacts || []);
    } catch (err) {
      setError("Could not load contacts.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteContact = async (
    contactId: string,
    contactEmail: string
  ) => {
    if (!contactId) return;

    try {
      setDeletingContact(contactId);
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/contacts/${contactId}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to delete contact");
      }

      setContacts((prev) => prev.filter((c) => c.id !== contactId));
      toast.success("Contact removed successfully");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete contact"
      );
    } finally {
      setDeletingContact(null);
    }
  };

  // Memoized filtered contacts
  const filteredContacts = useMemo(() => {
    if (!contacts) return [];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      return contacts.filter((contact) => {
        const searchableFields = [contact.name, contact.email];

        return searchableFields.some((field) =>
          field?.toLowerCase().includes(query)
        );
      });
    }

    return contacts;
  }, [contacts, searchQuery]);

  const clearSearch = () => {
    setSearchQuery("");
  };

  const { user } = useSession();

  useEffect(() => {
    if (user.id === "guest") return;
    fetchContacts();
  }, [user.id]);

  if (user.id === "guest") {
    return (
      <div className="px-10 space-y-6">
        <NoContactsFound onAddContact={onAddContact} />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex h-64 items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="text-primary h-6 w-6 animate-spin" />
            <p className="text-muted-foreground text-sm">Loading contacts...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex h-64 items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="rounded-full bg-red-50 p-3">
              <User className="h-8 w-8 text-red-500" />
            </div>
            <p className="text-sm text-red-500">Failed to load contacts</p>
            <Button variant="outline" size="sm" onClick={fetchContacts}>
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const hasContacts = contacts && contacts.length > 0;
  const hasSearchResults = filteredContacts.length > 0;

  return (
    <div className="px-10 ">
      <div className="flex flex-col gap-6">
        {hasContacts ? (
          <div className="flex items-center gap-2">
            <div className="relative w-full max-w-md">
              <Input
                type="text"
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="focus:ring-primary/20 h-11 rounded-lg border py-2.5 pl-10 pr-10 text-sm focus:outline-none focus:ring-2"
              />
              <Icons.search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={clearSearch}
                  className="hover:bg-muted/50 absolute right-2 top-1/2 h-7 w-7 -translate-y-1/2 transform"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        ) : null}

        {/* No results message */}
        {hasContacts && !hasSearchResults && (
          <div className="flex h-64 flex-col items-center justify-center text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="bg-muted/50 rounded-full p-4">
                <User className="text-muted-foreground h-8 w-8" />
              </div>
              <h3 className="text-lg font-medium">No contacts found</h3>
              <p className="text-muted-foreground max-w-sm">
                No contacts match your search criteria. Try adjusting your
                search terms.
              </p>
              {searchQuery && (
                <Button variant="outline" size="sm" onClick={clearSearch}>
                  Clear Search
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Contacts list (row style) */}
        {hasSearchResults && (
          <div className="flex flex-col gap-2">
            {filteredContacts.map((contact) => (
              <ContactCard
                key={contact.id}
                contact={contact}
                onDeleteContact={handleDeleteContact}
                isDeleting={deletingContact === contact.id}
                onCallContact={() => {
                  setCallingContact(contact.email);
                  createCall({
                    name: `Call with ${contact.name || contact.email}`,
                    members: [contact.email],
                  });
                }}
                isCalling={isCalling && callingContact === contact.email}
              />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!hasContacts && <NoContactsFound onAddContact={onAddContact} />}
      </div>
    </div>
  );
}

interface ContactCardProps {
  contact: Contact;
  onDeleteContact: (contactId: string, contactEmail: string) => void;
  isDeleting: boolean;
  onCallContact: () => void;
  isCalling: boolean;
}

const ContactCard = ({
  contact,
  onDeleteContact,
  isDeleting,
  onCallContact,
  isCalling,
}: ContactCardProps) => {
  return (
    <div
      className={cn(
        "flex w-full items-center justify-between rounded-xl p-3 transition-colors",
        "hover:bg-white/5"
      )}
    >
      <div className="flex items-center gap-3">
        <UserProfile
          name={contact.name || contact.email}
          url={contact.image}
          size="sm"
          className="rounded-lg"
        />
        <div className="text-left">
          <div className="font-medium leading-none">
            {contact.name || "No name"}
          </div>
          <div className="text-muted-foreground text-sm">{contact.email}</div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          onClick={onCallContact}
          disabled={isCalling}
          variant="ghost"
          size="icon"
          className="h-8 w-8  text-white hover:bg-white/5 hover:text-white/80"
          aria-label="Call contact"
        >
          {isCalling ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Icons.phoneIcon className="h-4 w-4" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onDeleteContact(contact.id, contact.email)}
          className="h-8 w-8 rounded-lg text-[#ff6347] hover:text-[#ff6347]/80 hover:bg-white/5"
          aria-label="Delete contact"
        >
          <Trash className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

const NoContactsFound = ({ onAddContact }: { onAddContact?: () => void }) => {
  const { user } = useSession();
  const isGuest = !user?.id || user.id === "guest";

  return (
    <div className="bg-inset-accent border-inset-accent-foreground col-span-full flex h-96 flex-col items-center justify-center gap-4 rounded-xl border p-4 text-center">
      <div className="flex flex-col items-center">
        <h1 className="text-lg font-medium">
          {isGuest ? "Sign in to manage contacts" : "You don\'t have any contacts yet."}
        </h1>
        <p className="text-muted-foreground">
          {isGuest
            ? "Access your contacts and connect with others."
            : "Add your first contact to start connecting with others."}
        </p>
      </div>
      {isGuest ? (
        <SocialButton />
      ) : (
        onAddContact && (
          <Button
            onClick={onAddContact}
            className="bg-muted-foreground hover:bg-muted-foreground/80"
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Add Contact
          </Button>
        )
      )}
    </div>
  );
};
