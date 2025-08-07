import { SocketProvider } from "./socket";
import Modals from "@/components/modal";
import { ContactsProvider } from "./contacts";
import SocketConnectionIndicator from "../socket-connection-indicator";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SocketProvider>
      <ContactsProvider>
        {children}
        <Modals />
      </ContactsProvider>

      <SocketConnectionIndicator />
    </SocketProvider>
  );
}
