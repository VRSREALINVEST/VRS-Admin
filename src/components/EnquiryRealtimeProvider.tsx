"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import { io, type Socket } from "socket.io-client";
import toast from "react-hot-toast";

export type EnquiryStatus = "New" | "Contacted" | "Closed";

export interface Enquiry {
  _id: string;
  name: string;
  email: string;
  phone: string;
  requirement: string;
  propertyType?: string;
  preferredLocation?: string;
  message?: string;
  status: EnquiryStatus;
  createdAt: string;
  updatedAt: string;
}

export interface EnquiryNotification {
  id: string;
  name: string;
  requirement: string;
  createdAt: string;
  read: boolean;
}

interface RealtimeValue {
  connected: boolean;
  notifications: EnquiryNotification[];
  unreadCount: number;
  markAllRead: () => void;
  markRead: (id: string) => void;
  /** Enquiries delivered over the socket this session, newest first. */
  liveEnquiries: Enquiry[];
}

const RealtimeContext = createContext<RealtimeValue>({
  connected: false,
  notifications: [],
  unreadCount: 0,
  markAllRead: () => {},
  markRead: () => {},
  liveEnquiries: [],
});

export const useEnquiryRealtime = () => useContext(RealtimeContext);

// Socket.IO is served by the same Express process as the REST API, so the API
// base URL is the default. NEXT_PUBLIC_SOCKET_URL only exists as an override
// for deployments that split them. Neither is ever hardcoded.
const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL || process.env.NEXT_PUBLIC_API_BASE_URL;

// The dropdown scrolls, so this only bounds memory. Kept above the badge's
// "99+" cut-off so that cap is reachable rather than dead code.
const MAX_NOTIFICATIONS = 150;

/**
 * Owns the single admin socket connection for the whole dashboard.
 *
 * Mounted once in dashboard/layout.tsx, which the App Router keeps alive
 * across dashboard route changes, so navigating between pages neither
 * reconnects nor registers a second listener.
 */
export default function EnquiryRealtimeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const [connected, setConnected] = useState(false);
  const [notifications, setNotifications] = useState<EnquiryNotification[]>([]);
  const [liveEnquiries, setLiveEnquiries] = useState<Enquiry[]>([]);

  // Enquiry ids already handled. Survives reconnects, so a replayed or
  // duplicated event never produces a second notification or a second row.
  const seenIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("adminToken") : null;

    if (!token || !SOCKET_URL) return;

    const socket: Socket = io(SOCKET_URL, {
      auth: { token },
      // Let it upgrade, but keep polling available for proxies that block
      // websocket upgrades.
      transports: ["websocket", "polling"],
      reconnectionAttempts: 10,
    });

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));
    socket.on("connect_error", () => setConnected(false));

    socket.on("enquiry:new", (enquiry: Enquiry) => {
      if (!enquiry || !enquiry._id) return;

      // Idempotent: the same enquiry can only ever be added once.
      if (seenIds.current.has(enquiry._id)) return;
      seenIds.current.add(enquiry._id);

      setLiveEnquiries((prev) => [enquiry, ...prev]);

      setNotifications((prev) =>
        [
          {
            id: enquiry._id,
            name: enquiry.name,
            requirement: enquiry.requirement,
            createdAt: enquiry.createdAt,
            read: false,
          },
          ...prev,
        ].slice(0, MAX_NOTIFICATIONS)
      );

      toast.success(`New enquiry from ${enquiry.name}`);
    });

    return () => {
      // Logging out unmounts the dashboard layout, which tears the socket down
      // so an unauthenticated client stops receiving enquiry events.
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) =>
      prev.some((n) => !n.read) ? prev.map((n) => ({ ...n, read: true })) : prev
    );
  }, []);

  const markRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.some((n) => n.id === id && !n.read)
        ? prev.map((n) => (n.id === id ? { ...n, read: true } : n))
        : prev
    );
  }, []);

  // Arriving at the enquiries list counts as having seen what is already in
  // the tray. Deliberately keyed on pathname alone: an enquiry that lands
  // afterwards still raises the badge, even while the admin sits on this page.
  useEffect(() => {
    if (pathname === "/dashboard/enquiries") markAllRead();
  }, [pathname, markAllRead]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const value = useMemo(
    () => ({
      connected,
      notifications,
      unreadCount,
      markAllRead,
      markRead,
      liveEnquiries,
    }),
    [connected, notifications, unreadCount, markAllRead, markRead, liveEnquiries]
  );

  return (
    <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>
  );
}
