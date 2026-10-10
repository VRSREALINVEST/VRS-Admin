"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { apiErrorMessage, authHeaders } from "@/lib/adminApi";

interface Testimonial {
  _id: string;
  name: string;
  location: string;
  text: string;
  rating: number;
}

export default function AdminTextTestimonials() {
  const API = process.env.NEXT_PUBLIC_API_BASE_URL;

  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [text, setText] = useState("");
  const [rating, setRating] = useState(5);
  const [editing, setEditing] = useState<Testimonial | null>(null);
  const [loading, setLoading] = useState(false);

  // Fetch testimonials
  const fetchTestimonials = async () => {
    try {
      const res = await axios.get(`${API}/api/text-testimonials`);
      setTestimonials(res.data);
    } catch {
      toast.error("Failed to load testimonials");
    }
  };

  useEffect(() => {
    if (API) fetchTestimonials();
  }, [API]);

  const resetForm = () => {
    setName("");
    setLocation("");
    setText("");
    setRating(5);
  };

  // ADD
  const addTestimonial = async () => {
    if (loading) return;

    if (!name || !location || !text) {
      toast.error("Please fill all fields");
      return;
    }

    try {
      setLoading(true);

      await axios.post(
        `${API}/api/text-testimonials`,
        {
          name,
          location,
          text,
          rating,
        },
        { headers: authHeaders() },
      );

      toast.success("Testimonial added");

      resetForm();
      fetchTestimonials();
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to add testimonial"));
    }

    setLoading(false);
  };

  // DELETE
  const deleteTestimonial = async (id: string) => {
    if (!confirm("Are you sure you want to delete this testimonial?")) return;

    try {
      await axios.delete(`${API}/api/text-testimonials/${id}`, {
        headers: authHeaders(),
      });
      setTestimonials((prev) => prev.filter((t) => t._id !== id));
      toast.success("Deleted successfully");
    } catch (err) {
      toast.error(apiErrorMessage(err, "Delete failed"));
    }
  };

  // UPDATE
  const updateTestimonial = async () => {
    if (!editing || loading) return;

    try {
      setLoading(true);

      await axios.put(
        `${API}/api/text-testimonials/${editing._id}`,
        {
          name,
          location,
          text,
          rating,
        },
        { headers: authHeaders() },
      );

      toast.success("Updated successfully");

      setEditing(null);
      resetForm();
      fetchTestimonials();
    } catch (err) {
      toast.error(apiErrorMessage(err, "Update failed"));
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 p-8">
      <div className="max-w-6xl mx-auto bg-white rounded-3xl shadow-2xl p-10 space-y-10 border border-gray-100">
        <div>
          <h1 className="text-4xl font-bold text-gray-800">
            client testimonials.{" "}
          </h1>
          <p className="text-gray-500 mt-2">Manage client reviews</p>
        </div>

        {/* ADD FORM */}
        <div className="grid md:grid-cols-4 gap-4">
          <input
            placeholder="Client Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="border border-gray-300 focus:border-black focus:ring-2 focus:ring-black rounded-xl p-4"
          />

          <input
            placeholder="Location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="border border-gray-300 focus:border-black focus:ring-2 focus:ring-black rounded-xl p-4"
          />

          <select
            value={rating}
            onChange={(e) => setRating(Number(e.target.value))}
            className="border border-gray-300 rounded-xl p-4"
          >
            {[5, 4, 3, 2, 1].map((r) => (
              <option key={r} value={r}>
                {r} Stars
              </option>
            ))}
          </select>

          <button
            onClick={addTestimonial}
            disabled={loading}
            className={`rounded-xl text-white font-semibold ${
              loading ? "bg-gray-500" : "bg-black hover:bg-gray-900"
            }`}
          >
            {loading ? "Adding..." : "Add"}
          </button>
        </div>

        <textarea
          placeholder="Client Review"
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="border border-gray-300 focus:border-black focus:ring-2 focus:ring-black rounded-xl p-4 w-full"
          rows={4}
        />

        {/* LIST */}
        <div className="space-y-6">
          {testimonials.map((testimonial) => (
            <div
              key={testimonial._id}
              className="bg-gray-50 hover:bg-gray-100 transition p-6 rounded-2xl shadow-sm flex justify-between items-stretch gap-6"
            >
              {/* LEFT CONTENT */}
              <div className="flex-1">
                <p className="font-semibold text-lg">{testimonial.name}</p>
                <p className="text-sm text-gray-500">{testimonial.location}</p>

                <p className="mt-3 text-gray-700 line-clamp-3">
                  {testimonial.text}
                </p>

                <div className="mt-3 text-yellow-500">
                  {"⭐".repeat(testimonial.rating)}
                </div>
              </div>

              {/* RIGHT BUTTONS */}
              <div className="flex flex-col justify-center gap-3 min-w-[110px]">
                <button
                  onClick={() => {
                    setEditing(testimonial);
                    setName(testimonial.name);
                    setLocation(testimonial.location);
                    setText(testimonial.text);
                    setRating(testimonial.rating);
                  }}
                  className="w-full h-[40px] bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
                >
                  Edit
                </button>

                <button
                  onClick={() => deleteTestimonial(testimonial._id)}
                  className="w-full h-[40px] bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* EDIT MODAL */}
      {editing && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-3xl w-[450px] shadow-2xl space-y-6">
            <h2 className="text-2xl font-semibold">Update Testimonial</h2>

            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="border border-gray-300 rounded-xl p-4 w-full"
            />

            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="border border-gray-300 rounded-xl p-4 w-full"
            />

            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="border border-gray-300 rounded-xl p-4 w-full"
              rows={4}
            />

            <select
              value={rating}
              onChange={(e) => setRating(Number(e.target.value))}
              className="border border-gray-300 rounded-xl p-4 w-full"
            >
              {[5, 4, 3, 2, 1].map((r) => (
                <option key={r} value={r}>
                  {r} Stars
                </option>
              ))}
            </select>

            <div className="flex justify-end gap-4">
              <button
                onClick={() => {
                  setEditing(null);
                  resetForm();
                }}
                className="px-5 py-2 border rounded-xl"
              >
                Cancel
              </button>

              <button
                onClick={updateTestimonial}
                disabled={loading}
                className={`px-5 py-2 rounded-xl text-white ${
                  loading ? "bg-gray-500" : "bg-black hover:bg-gray-900"
                }`}
              >
                {loading ? "Updating..." : "Update"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
