"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { authHeaders, responseErrorMessage } from "@/lib/adminApi";

const API = process.env.NEXT_PUBLIC_API_BASE_URL;

export default function AdminWebinarPage() {
  const [webinars, setWebinars] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    title: "",
    description: "",
    australiaTimeZone: "",
    meetLink: "",
    recordingLink: "",
    day: "",
    time: "",
  });

  const fetchWebinars = async () => {
    try {
      const res = await fetch(`${API}/api/webinars`);
      if (!res.ok) return;
      const data = await res.json();
      setWebinars(data);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    fetchWebinars();
  }, []);

  const handleChange = (e: any) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        ...form,
      };

      const res = await fetch(`${API}/api/webinars`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        toast.error(await responseErrorMessage(res, "Error creating webinar"));
        return;
      }

      toast.success("Webinar Created Successfully");

      setForm({
        title: "",
        description: "",
        australiaTimeZone: "",
        meetLink: "",
        recordingLink: "",
        day: "",
        time: "",
      });

      fetchWebinars();
    } catch (error) {
      toast.error("Error creating webinar");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`${API}/api/webinars/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });

      if (!res.ok) {
        toast.error(await responseErrorMessage(res, "Error deleting"));
        return;
      }

      toast.success("Webinar Deleted");
      fetchWebinars();
    } catch (error) {
      toast.error("Error deleting");
    }
  };

  const TIMEZONES = [
    {
      value: "AWST",
      label: "Australian Western Standard Time (AWST) – UTC+8",
    },
    {
      value: "ACST",
      label: "Australian Central Standard Time (ACST) – UTC+9:30",
    },
    {
      value: "ACDT",
      label: "Australian Central Daylight Time (ACDT) – UTC+10:30",
    },
    {
      value: "AEST",
      label: "Australian Eastern Standard Time (AEST) – UTC+10",
    },
    {
      value: "AEDT",
      label: "Australian Eastern Daylight Time (AEDT) – UTC+11",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 text-black p-10">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-semibold mb-10 text-center">
          Manage Webinars
        </h1>

        <form
          onSubmit={handleSubmit}
          className="bg-white border border-gray-200 rounded-2xl p-8 space-y-6 shadow-sm"
        >
          <h2 className="text-xl font-semibold mb-4">Create New Webinar</h2>

          <input
            type="text"
            name="title"
            placeholder="Webinar Title"
            value={form.title}
            onChange={handleChange}
            required
            className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-yellow-400"
          />

          <textarea
            name="description"
            placeholder="Description"
            value={form.description}
            onChange={handleChange}
            className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-yellow-400"
          />

          {/* Day */}
          <select
            name="day"
            value={form.day}
            onChange={handleChange}
            required
            className="w-full border border-gray-300 p-3 rounded-lg"
          >
            <option value="">Select Day</option>
            <option>Monday</option>
            <option>Tuesday</option>
            <option>Wednesday</option>
            <option>Thursday</option>
            <option>Friday</option>
            <option>Saturday</option>
            <option>Sunday</option>
          </select>

          {/* Time */}
          <input
            type="time"
            name="time"
            value={form.time}
            onChange={handleChange}
            required
            className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-yellow-400"
          />

          {/* Timezone */}
          <select
            name="australiaTimeZone"
            value={form.australiaTimeZone}
            onChange={handleChange}
            required
            className="w-full border border-gray-300 p-3 rounded-lg"
          >
            <option value="">Select Time Zone</option>

            {TIMEZONES.map((tz) => (
              <option key={tz.value} value={tz.value}>
                {tz.label}
              </option>
            ))}
          </select>

          <input
            type="text"
            name="meetLink"
            placeholder="Google Meet Link"
            value={form.meetLink}
            onChange={handleChange}
            required
            className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-yellow-400"
          />

          <input
            type="text"
            name="recordingLink"
            placeholder="Recording Link (Optional)"
            value={form.recordingLink}
            onChange={handleChange}
            className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-yellow-400"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-yellow-500 text-black py-3 rounded-lg font-semibold hover:bg-yellow-400 transition"
          >
            {loading ? "Creating..." : "Create Webinar"}
          </button>
        </form>

        {/* ===================== */}
        {/* WEBINAR LIST */}
        {/* ===================== */}

        <div className="mt-12 space-y-6">
          {webinars.map((webinar) => (
            <div
              key={webinar._id}
              className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm"
            >
              <p>
                <strong>Title:</strong> {webinar.title}
              </p>

              <p>
                <strong>Schedule:</strong>{" "}
                {webinar.day} • {webinar.time} {webinar.australiaTimeZone}
              </p>

              <div className="mt-4">
                <button
                  onClick={() => handleDelete(webinar._id)}
                  className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-500 transition"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}