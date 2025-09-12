"use client";

import {
  type PropsWithChildren,
  createContext,
  useContext,
  useState,
  useEffect,
} from "react";
import { type Session } from "@call/auth/auth";

type SessionContextType = Session & {
  isGuest: boolean;
};

export const SessionContext = createContext<SessionContextType | null>(null);

export const SessionProvider = ({
  children,
  value,
}: PropsWithChildren<{ value?: Session }>) => {
  const [session, setSession] = useState<SessionContextType | null>(null);

  useEffect(() => {
    const sessionData: Session = value || {
      user: {
        id: "guest",
        name: "Guest",
        email: "guest@example.com",
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      session: {
        id: "guest",
        token: "guest",
        userId: "guest",
        expiresAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    };

    setSession({
      ...sessionData,
      isGuest: !value,
    });
  }, [value]);

  if (!session) {
    return null;
  }

  return (
    <SessionContext.Provider value={session}>
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return context;
};
