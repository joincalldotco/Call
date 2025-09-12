"use client";

import { useQuery } from "@tanstack/react-query";
import { createContext, useContext, useEffect, useState } from "react";
import { CONTACTS_QUERY } from "@/lib/QUERIES";

interface Contact {
  id: string;
  name: string;
  email: string;
  image?: string;
  createdAt: string;
}

const ContactsContext = createContext<{
  contacts: Contact[];
  isLoading: boolean;
  error: Error | null;
}>({
  contacts: [],
  isLoading: false,
  error: null,
});

export const ContactsProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const { data, isLoading, error } = useQuery({
    queryKey: ["contacts"],
    queryFn: CONTACTS_QUERY.getContacts,
  });

  useEffect(() => {
    if (data) {
      setContacts(data.contacts);
    }
  }, [data]);

  return (
    <ContactsContext.Provider value={{ contacts, isLoading, error }}>
      {children}
    </ContactsContext.Provider>
  );
};

export const useContacts = () => {
  const context = useContext(ContactsContext);
  if (!context) {
    throw new Error("useContacts must be used within a ContactsProvider");
  }
  return context;
};
