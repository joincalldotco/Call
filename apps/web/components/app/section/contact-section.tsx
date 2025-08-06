import ContactsList from "./contacts-list";
import { UserPlus } from "lucide-react";

export const ContactSection = ({ onAddContact }: { onAddContact?: () => void }) => {
  return (
    <div className="px-10 space-y-6">
      <ContactsList onAddContact={onAddContact} />
    </div>
  );
};

export default ContactSection;
