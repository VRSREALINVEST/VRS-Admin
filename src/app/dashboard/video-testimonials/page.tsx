"use client";

import { useEffect, useRef, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { apiErrorMessage, authHeaders } from "@/lib/adminApi";

interface VideoTestimonial {
  _id: string;
  name: string;
  role: string;
  thumbnail: string;
  youtubeLink: string;
}

export default function AdminVideoTestimonials() {
  const API = process.env.NEXT_PUBLIC_API_BASE_URL;

  const [videos, setVideos] = useState<VideoTestimonial[]>([]);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [youtubeLink, setYoutubeLink] = useState("");

  const [editing, setEditing] = useState<VideoTestimonial | null>(null);
  const [loading, setLoading] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);

  const fetchVideos = async () => {
    try {
      const res = await axios.get(`${API}/api/video-testimonials`);
      setVideos(res.data);
    } catch {
      toast.error("Failed to load videos");
    }
  };

  useEffect(() => {
    if (API) fetchVideos();
  }, [API]);

  const resetForm = () => {
    setName("");
    setRole("");
    setYoutubeLink("");
    if (fileRef.current) fileRef.current.value = "";
  };

  const addVideo = async () => {
    if (!name || !role || !youtubeLink) {
      toast.error("Please fill all fields");
      return;
    }

    try {
      setLoading(true);

      await axios.post(
        `${API}/api/video-testimonials`,
        {
          name,
          role,
          youtubeLink,
        },
        { headers: authHeaders() },
      );

      toast.success("Video testimonial added");

      resetForm();
      fetchVideos();
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to add video testimonial"));
    }

    setLoading(false);
  };

  const deleteVideo = async (id: string) => {
    if (!confirm("Are you sure you want to delete this video testimonial?"))
      return;

    try {
      await axios.delete(`${API}/api/video-testimonials/${id}`, {
        headers: authHeaders(),
      });
      setVideos((prev) => prev.filter((v) => v._id !== id));
      toast.success("Deleted successfully");
    } catch (err) {
      toast.error(apiErrorMessage(err, "Delete failed"));
    }
  };

  const updateVideo = async () => {
    if (!editing) return;

    try {
      setLoading(true);

      await axios.put(
        `${API}/api/video-testimonials/${editing._id}`,
        {
          name,
          role,
          youtubeLink,
        },
        { headers: authHeaders() },
      );

      toast.success("Updated successfully");

      setEditing(null);
      resetForm();
      fetchVideos();
    } catch (err) {
      toast.error(apiErrorMessage(err, "Update failed"));
    }

    setLoading(false);
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 p-8">
      <div className="max-w-6xl mx-auto bg-white p-10 rounded-3xl shadow-2xl border border-gray-100 space-y-10">
        <div>
          <h1 className="text-4xl font-bold text-gray-800">
            Video Testimonials
          </h1>
          <p className="text-gray-500 mt-2">Manage client video reviews</p>
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
            placeholder="Role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="border border-gray-300 focus:border-black focus:ring-2 focus:ring-black rounded-xl p-4"
          />

          <input
            placeholder="YouTube Link"
            value={youtubeLink}
            onChange={(e) => setYoutubeLink(e.target.value)}
            className="border border-gray-300 focus:border-black focus:ring-2 focus:ring-black rounded-xl p-4"
          />

          <button
            onClick={addVideo}
            disabled={loading}
            className={`rounded-xl text-white font-semibold ${
              loading ? "bg-gray-500" : "bg-black hover:bg-gray-900"
            }`}
          >
            {loading ? "Adding..." : "Add"}
          </button>
        </div>

        {/* LIST */}
        <div className="space-y-6">
          {videos.map((video) => (
            <div
              key={video._id}
              className="bg-gray-50 hover:bg-gray-100 transition p-6 rounded-2xl shadow-sm flex justify-between items-center"
            >
              <div className="flex items-center gap-6">
                <img
                  src={video.thumbnail}
                  className="w-20 h-16 object-cover rounded-xl shadow-md"
                />
                <div>
                  <p className="font-semibold text-lg">{video.name}</p>
                  <p className="text-sm text-gray-500">{video.role}</p>
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setEditing(video);
                    setName(video.name);
                    setRole(video.role);
                    setYoutubeLink(video.youtubeLink);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg"
                >
                  Edit
                </button>

                <button
                  onClick={() => deleteVideo(video._id)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg"
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
            <h2 className="text-2xl font-semibold">Update Video Testimonial</h2>

            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="border border-gray-300 rounded-xl p-4 w-full"
            />

            <input
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="border border-gray-300 rounded-xl p-4 w-full"
            />

            <input
              value={youtubeLink}
              onChange={(e) => setYoutubeLink(e.target.value)}
              className="border border-gray-300 rounded-xl p-4 w-full"
            />

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
                onClick={updateVideo}
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
