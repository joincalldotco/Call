import { useState } from "react";
import { useContacts } from "@/components/providers/contacts";
import { Avatar } from "@call/ui/components/avatar";
import { Checkbox } from "@call/ui/components/checkbox";
import { Search } from "lucide-react";
import { Input } from "@call/ui/components/input";

interface Contact {
  id: string;
  name: string;
  email: string;
}

interface ContactSelectorProps {
  selectedContacts: string[];
  onContactsChange: (emails: string[]) => void;
  disabled?: boolean;
}

export function ContactSelector({ 
  selectedContacts, 
  onContactsChange, 
  disabled = false 
}: ContactSelectorProps) {
  const { contacts, isLoading, error } = useContacts();
  const [searchTerm, setSearchTerm] = useState("");

  const filteredContacts = contacts.filter((contact) =>
    contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleContactToggle = (email: string, checked: boolean) => {
    if (disabled) return;
    
    if (checked) {
      onContactsChange([...selectedContacts, email]);
    } else {
      onContactsChange(selectedContacts.filter(e => e !== email));
    }
  };

  if (isLoading) {
    return (
      <div className="text-sm text-muted-foreground text-center py-4">
        Loading contacts...
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-sm text-red-500 text-center py-4">
        Error loading contacts
      </div>
    );
  }

  if (contacts.length === 0) {
    return (
      <div className="text-sm text-muted-foreground text-center py-4">
        No contacts available
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search contacts..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 h-12"
          disabled={disabled}
        />
      </div>

      <div className="max-h-[240px] overflow-y-auto space-y-1">
        {filteredContacts.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-4">
            No contacts found
          </div>
        ) : (
          filteredContacts.map((contact) => (
            <div
              key={contact.id}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <Checkbox
                id={contact.id}
                checked={selectedContacts.includes(contact.email)}
                onCheckedChange={(checked) => 
                  handleContactToggle(contact.email, checked as boolean)
                }
                disabled={disabled}
              />
              <Avatar className="h-8 w-8">
                <div key={`avatar-${contact.id}`} className="h-full w-full rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-medium">
                  {contact.name.charAt(0).toUpperCase()}
                </div>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">
                  {contact.name}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {contact.email}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
} 