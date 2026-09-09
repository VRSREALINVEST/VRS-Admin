"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { Bell, LogOut, User } from "lucide-react";
import { useEnquiryRealtime } from "./EnquiryRealtimeProvider";

interface AdminProfile {
  name?: string;
  email?: string;
  role?: string;
}

// Intl handles this without pulling in a date library.
const relativeTime = (iso: string) => {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";

  const seconds = Math.round((then - new Date().getTime()) / 1000);
  const formatter = new Intl.RelativeTimeFormat("en-AU", { numeric: "auto" });

  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["second", 60],
    ["minute", 60],
    ["hour", 24],
    ["day", 7],
  ];

  let value = seconds;
  for (const [unit, step] of units) {
    if (Math.abs(value) < step) return formatter.format(value, unit);
    value = Math.round(value / step);
  }

  return formatter.format(value, "week");
};

export default function DashboardNavbar({
  onLogout,
}: {
  onLogout: () => void;
}) {
  const router = useRouter();
  const { notifications, unreadCount, markRead, connected } =
    useEnquiryRealtime();

  const [openPanel, setOpenPanel] = useState<"none" | "bell" | "user">("none");
  const [profile, setProfile] = useState<AdminProfile | null>(null);

  const navRef = useRef<HTMLElement>(null);

  // Identity for the dropdown. Only name/email/role are read; the endpoint
  // already strips the password and the token is never rendered.
  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    const API = process.env.NEXT_PUBLIC_API_BASE_URL;
    if (!token || !API) return;

    axios
      .get(`${API}/api/auth/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) =>
        setProfile({
          name: res.data?.name,
          email: res.data?.email,
          role: res.data?.role,
        })
      )
      .catch(() => {
        // Fall back to the role stored at login; the navbar is not critical.
        setProfile({ role: localStorage.getItem("adminRole") || undefined });
      });
  }, []);

  // Close whichever panel is open on an outside click or Escape.
  useEffect(() => {
    if (openPanel === "none") return;

    const onPointerDown = (event: MouseEvent) => {
      if (!navRef.current?.contains(event.target as Node)) setOpenPanel("none");
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenPanel("none");
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [openPanel]);

  // Opening the panel does NOT mark anything read: the admin has seen that
  // something arrived, not the enquiry itself. Reading happens when they open
  // a notification, or land on the enquiries page.
  const toggleBell = () => {
    setOpenPanel((prev) => (prev === "bell" ? "none" : "bell"));
  };

  const openEnquiry = (notificationId?: string) => {
    if (notificationId) markRead(notificationId);
    setOpenPanel("none");
    router.push("/dashboard/enquiries");
  };

  return (
    <header
      ref={navRef}
      className="sticky top-0 z-40 flex items-center justify-end gap-3 border-b border-gray-200 bg-white px-8 py-4"
    >
      {/* ================= NOTIFICATIONS ================= */}
      <div className="relative">
        <button
          onClick={toggleBell}
          aria-label={
            unreadCount > 0
              ? `Notifications, ${unreadCount} unread`
              : "Notifications"
          }
          aria-expanded={openPanel === "bell"}
          className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 text-gray-600 transition hover:bg-gray-50 hover:text-black"
        >
          <Bell size={18} />

          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-yellow-500 px-1 text-[11px] font-semibold text-black shadow-md">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>

        {openPanel === "bell" && (
          <div className="absolute right-0 mt-2 w-80 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
              <p className="text-sm font-semibold text-gray-800">
                Notifications
              </p>
              <span
                className={`text-[11px] ${
                  connected ? "text-green-600" : "text-gray-400"
                }`}
              >
                {connected ? "Live" : "Offline"}
              </span>
            </div>

            {notifications.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-gray-500">
                No new enquiries yet.
              </p>
            ) : (
              <ul className="max-h-80 divide-y divide-gray-100 overflow-y-auto">
                {notifications.map((notification) => (
                  <li key={notification.id}>
                    <button
                      onClick={() => openEnquiry(notification.id)}
                      className={`w-full px-4 py-3 text-left transition hover:bg-yellow-50 ${
                        notification.read ? "opacity-60" : ""
                      }`}
                    >
                      <p className="text-sm font-medium text-gray-800">
                        New enquiry received
                      </p>
                      <p className="mt-0.5 text-sm text-gray-600">
                        {notification.name}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-500">
                        {notification.requirement}
                      </p>
                      <p className="mt-1 text-[11px] text-gray-400">
                        {relativeTime(notification.createdAt)}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <button
              onClick={() => openEnquiry()}
              className="w-full border-t border-gray-100 px-4 py-3 text-center text-xs font-medium text-gray-600 transition hover:bg-gray-50 hover:text-black"
            >
              View all enquiries
            </button>
          </div>
        )}
      </div>

      {/* ================= PROFILE ================= */}
      <div className="relative">
        <button
          onClick={() =>
            setOpenPanel((prev) => (prev === "user" ? "none" : "user"))
          }
          aria-label="Account menu"
          aria-expanded={openPanel === "user"}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 text-gray-600 transition hover:bg-gray-50 hover:text-black"
        >
          <User size={18} />
        </button>

        {openPanel === "user" && (
          <div className="absolute right-0 mt-2 w-64 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
            <div className="border-b border-gray-100 px-4 py-4">
              <p className="text-sm font-semibold text-gray-800">
                {profile?.name || "VRS Admin"}
              </p>
              {profile?.email && (
                <p className="mt-0.5 truncate text-xs text-gray-500">
                  {profile.email}
                </p>
              )}
              {profile?.role && (
                <span className="mt-2 inline-block rounded-full bg-yellow-100 px-3 py-1 text-[11px] font-medium text-yellow-700">
                  {profile.role}
                </span>
              )}
            </div>

            <button
              onClick={onLogout}
              className="flex w-full items-center gap-2 px-4 py-3 text-sm text-red-600 transition hover:bg-red-50"
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
