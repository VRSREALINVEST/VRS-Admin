"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Building2,
  Video,
  Users,
  MessageSquare,
  Mail,
  IndianRupee,
  CalendarDays,
  Activity,
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_BASE_URL;

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch(`${API}/api/dashboard/stats`);
        const data = await res.json();
        setStats(data);
      } catch (error) {
        console.error(error);
      }
    };

    fetchStats();
  }, []);

  if (!stats) return null;

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(value);

  const cards = [
    {
      title: "Secured Properties",
      value: stats.properties,
      icon: <Building2 size={20} />,
    },
    {
      title: "Properties This Month",
      value: stats.propertiesThisMonth,
      icon: <CalendarDays size={20} />,
    },
    {
      title: "Total Enquiries",
      value: stats.enquiries,
      icon: <Mail size={20} />,
    },
    {
      title: "Webinars",
      value: stats.webinars,
      icon: <Video size={20} />,
    },
    {
      title: "Upcoming Webinars",
      value: stats.upcomingWebinars,
      icon: <Activity size={20} />,
    },
    {
      title: "Team Members",
      value: stats.team,
      icon: <Users size={20} />,
    },
    {
      title: "Testimonials",
      value: stats.testimonials,
      icon: <MessageSquare size={20} />,
    },
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold mb-10">Dashboard Overview</h1>

      {/* ================== STATS GRID ================== */}
      <div className="grid md:grid-cols-4 gap-6 mb-12">
        {cards.map((card, i) => (
          <div
            key={i}
            className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all duration-300"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-yellow-100 text-yellow-600 rounded-xl">
                {card.icon}
              </div>
            </div>

            <h2 className="text-2xl font-bold mb-1">{card.value}</h2>
            <p className="text-sm text-gray-500">{card.title}</p>
          </div>
        ))}
      </div>

    

      {/* ================== QUICK LINKS ================== */}
      <div>
        <h2 className="text-lg font-semibold mb-6">Quick Actions</h2>

        <div className="grid md:grid-cols-4 gap-6">
          <Link
            href="/dashboard/secured-properties"
            className="bg-gray-50 border border-gray-200 rounded-xl p-6 hover:bg-yellow-50 transition"
          >
            Manage Properties
          </Link>

          <Link
            href="/dashboard/webinar"
            className="bg-gray-50 border border-gray-200 rounded-xl p-6 hover:bg-yellow-50 transition"
          >
            Manage Webinars
          </Link>

          <Link
            href="/dashboard/enquiries"
            className="bg-gray-50 border border-gray-200 rounded-xl p-6 hover:bg-yellow-50 transition"
          >
            View Enquiries
          </Link>

          <Link
            href="/dashboard/blog"
            className="bg-gray-50 border border-gray-200 rounded-xl p-6 hover:bg-yellow-50 transition"
          >
            Manage Blog
          </Link>
        </div>
      </div>
    </div>
  );
}