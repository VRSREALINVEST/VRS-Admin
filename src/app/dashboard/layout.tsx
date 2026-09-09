
"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Image,
  Users,
  LogOut,
  Video,
  MessageSquare,
  FileText,
  Mail,
} from "lucide-react";
import EnquiryRealtimeProvider from "@/components/EnquiryRealtimeProvider";
import DashboardNavbar from "@/components/DashboardNavbar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("adminToken");

    if (!token) {
      router.push("/login");
    } else {
      setLoading(false);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminRole");
    router.push("/login");
  };

  if (loading) return null;

  const menuItemClass = (path: string) =>
    `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-sm ${
      pathname === path
        ? "bg-yellow-500 text-black font-semibold shadow-md"
        : "text-gray-400 hover:bg-white/5 hover:text-white"
    }`;

  return (
    <EnquiryRealtimeProvider>
    <div className="flex bg-gray-100">
      {/* ================= SIDEBAR ================= */}
      <aside className="w-72 h-screen sticky top-0 bg-black text-white flex flex-col justify-between px-6 py-8 shadow-xl">
        <div>
          {/* Logo */}
          <div className="mb-10">
            <h2 className="text-2xl font-bold text-yellow-500">VRS Admin</h2>
            <p className="text-xs text-gray-500 mt-1">
              Luxury Management Panel
            </p>
          </div>

          {/* Navigation */}
          <nav className="space-y-2">
            <Link href="/dashboard" className={menuItemClass("/dashboard")}>
              <LayoutDashboard size={18} />
              Dashboard
            </Link>

            <Link
              href="/dashboard/enquiries"
              className={menuItemClass("/dashboard/enquiries")}
            >
              <Mail size={18} />
              Enquiries
            </Link>

            <Link
              href="/dashboard/media"
              className={menuItemClass("/dashboard/media")}
            >
              <Image size={18} />
              Hero Media
            </Link>

            <Link
              href="/dashboard/secured-properties"
              className={menuItemClass("/dashboard/secured-properties")}
            >
              <Image size={18} />
              Secured Properties
            </Link>

            <Link
              href="/dashboard/webinar"
              className={menuItemClass("/dashboard/webinar")}
            >
              <Video size={18} />
              Webinar
            </Link>

            <Link
              href="/dashboard/discover-video-section"
              className={menuItemClass("/dashboard/discover-video-section")}
            >
              <Video size={18} />
              Discover Video
            </Link>

            <Link
              href="/dashboard/Team-section"
              className={menuItemClass("/dashboard/Team-section")}
            >
              <Users size={18} />
              Team
            </Link>

            <Link
              href="/dashboard/text-testimonials"
              className={menuItemClass("/dashboard/text-testimonials")}
            >
              <MessageSquare size={18} />
              Text Testimonials
            </Link>

            <Link
              href="/dashboard/video-testimonials"
              className={menuItemClass("/dashboard/video-testimonials")}
            >
              <Video size={18} />
              Video Testimonials
            </Link>

            <Link
              href="/dashboard/blog"
              className={menuItemClass("/dashboard/blog")}
            >
              <FileText size={18} />
              Blog
            </Link>
          </nav>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-600 hover:bg-red-700 transition text-sm font-medium"
        >
          <LogOut size={18} />
          Logout
        </button>
      </aside>

      {/* ================= MAIN COLUMN ================= */}
      <div className="flex-1 flex flex-col min-w-0">
        <DashboardNavbar onLogout={handleLogout} />

        <main className="flex-1 p-8 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 min-h-screen">
            {children}
          </div>
        </main>
      </div>
    </div>
    </EnquiryRealtimeProvider>
  );
}
