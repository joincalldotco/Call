import ContactsList from "./contacts-list";
import { UserPlus } from "lucide-react";

export const ContactsSection = ({
  onAddContact,
}: {
  onAddContact?: () => void;
}) => {
  return (
    <div className="px-10">
      <ContactsList onAddContact={onAddContact} />
    </div>
  );
};

export default ContactsSection;
