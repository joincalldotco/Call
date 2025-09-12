"use client";

import { useContacts } from "@/components/providers/contacts";
import { Checkbox } from "@call/ui/components/checkbox";
import { Input } from "@call/ui/components/input";
import { UserProfile } from "@call/ui/components/use-profile";
import { Search } from "lucide-react";
import { useState } from "react";
import { cn } from "@call/ui/lib/utils";

interface ContactsSelectorProps {
  selectedContacts: string[];
  onContactsChange: (emails: string[]) => void;
  disabled?: boolean;
  disabledEmails?: string[];
}

export function ContactsSelector({
  selectedContacts,
  onContactsChange,
  disabled = false,
  disabledEmails = [],
}: ContactsSelectorProps) {
  const { contacts, isLoading, error } = useContacts();
  const [searchTerm, setSearchTerm] = useState("");

  const filteredContacts = contacts.filter(
    (contact) =>
      contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleContactToggle = (email: string, checked: boolean) => {
    if (disabled) return;

    if (checked) {
      onContactsChange([...selectedContacts, email]);
    } else {
      onContactsChange(selectedContacts.filter((e) => e !== email));
    }
  };

  if (isLoading) {
    return (
      <div className="text-muted-foreground py-4 text-center text-sm">
        Loading contacts...
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-4 text-center text-sm text-red-500">
        Error loading contacts
      </div>
    );
  }

  if (contacts.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
        <Input
          placeholder="Search contacts..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="border-1 h-12 !rounded-lg border-[#434343] bg-[#2F2F2F] pl-10 text-2xl text-white"
          disabled={disabled}
        />
      </div>

      <div className="max-h-[240px] space-y-1 overflow-y-auto">
        {filteredContacts.length === 0 ? (
          <div className="text-muted-foreground py-4 text-center text-sm">
            No contacts found
          </div>
        ) : (
          filteredContacts.map((contact) => {
            const isAlreadyMember = disabledEmails.includes(contact.email);
            const isChecked =
              isAlreadyMember || selectedContacts.includes(contact.email);
            const isDisabled = disabled || isAlreadyMember;
            return (
              <div
                key={contact.id}
                className={cn(
                  "hover:bg-muted/50 flex items-center gap-3 rounded-xl p-3 transition-colors",
                  isChecked && "bg-[#3B3B3B]",
                  isAlreadyMember && "cursor-not-allowed opacity-70"
                )}
              >
                <Checkbox
                  id={contact.id}
                  checked={isChecked}
                  className="border-inset-accent border-1 rounded-sm border-[#636363] bg-[#4B4B4B]"
                  onCheckedChange={(checked) =>
                    handleContactToggle(contact.email, checked as boolean)
                  }
                  disabled={isDisabled}
                />
                <UserProfile
                  name={contact.name}
                  url={contact.image}
                  size="sm"
                  className="text-md rounded-lg"
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{contact.name}</div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
