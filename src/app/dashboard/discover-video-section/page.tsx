// "use client";

// import { useEffect, useRef, useState } from "react";
// import axios from "axios";

// export default function AdminDiscoverVideo() {
//   const API = process.env.NEXT_PUBLIC_API_BASE_URL;

//   const [videoUrl, setVideoUrl] = useState("");
//   const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
//   const [savedThumbnail, setSavedThumbnail] = useState<string | null>(null);
//   const fileRef = useRef<HTMLInputElement>(null);

//   const fetchData = async () => {
//     const res = await axios.get(`${API}/api/discover-video`);
//     if (res.data) {
//       setVideoUrl(res.data.videoUrl);
//       setSavedThumbnail(res.data.thumbnail);
//     }
//   };

//   useEffect(() => {
//     if (API) fetchData();
//   }, [API]);

//   const handleSave = async () => {
//     const formData = new FormData();
//     formData.append("videoUrl", videoUrl);
//     if (thumbnailFile) {
//       formData.append("thumbnail", thumbnailFile);
//     }

//     await axios.put(`${API}/api/discover-video`, formData);

//     if (fileRef.current) fileRef.current.value = "";
//     setThumbnailFile(null);

//     fetchData();
//   };

//   return (
//     <div className="p-10">
//       <h1 className="text-2xl font-bold mb-6">
//         Discover Video Settings
//       </h1>

//       <input
//         type="text"
//         placeholder="YouTube Link"
//         value={videoUrl}
//         onChange={(e) => setVideoUrl(e.target.value)}
//         className="border p-3 w-full mb-4"
//       />

//       <input
//         type="file"
//         ref={fileRef}
//         accept="image/*"
//         onChange={(e) =>
//           e.target.files && setThumbnailFile(e.target.files[0])
//         }
//         className="mb-4"
//       />

//       {savedThumbnail && (
//         <img
//           src={savedThumbnail}
//           className="h-40 mb-4 rounded"
//         />
//       )}

//       <button
//         onClick={handleSave}
//         className="bg-black text-white px-6 py-2"
//       >
//         Save
//       </button>
//     </div>
//   );
// }




"use client";

import { useEffect, useRef, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { apiErrorMessage, authHeaders } from "@/lib/adminApi";

export default function AdminDiscoverVideo() {
  const API = process.env.NEXT_PUBLIC_API_BASE_URL;

  const [videoUrl, setVideoUrl] = useState("");
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [savedThumbnail, setSavedThumbnail] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);

  const fetchData = async () => {
    try {
      const res = await axios.get(`${API}/api/discover-video`);
      if (res.data) {
        setVideoUrl(res.data.videoUrl);
        setSavedThumbnail(res.data.thumbnail);
      }
    } catch (error) {
      toast.error("Failed to load discover video data");
    }
  };

  useEffect(() => {
    if (API) fetchData();
  }, [API]);

  const handleSave = async () => {
    if (loading) return; // 🔥 prevent multiple clicks

    if (!videoUrl.trim()) {
      toast.error("Please enter YouTube link");
      return;
    }

    try {
      setLoading(true);

      const formData = new FormData();
      formData.append("videoUrl", videoUrl);
      if (thumbnailFile) {
        formData.append("thumbnail", thumbnailFile);
      }

      await axios.put(`${API}/api/discover-video`, formData, {
        headers: authHeaders(),
      });

      toast.success("Discover section updated successfully");

      if (fileRef.current) fileRef.current.value = "";
      setThumbnailFile(null);

      fetchData();
    } catch (err) {
      toast.error(apiErrorMessage(err, "Update failed"));
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 p-8">
      <div className="max-w-4xl mx-auto bg-white rounded-3xl shadow-2xl p-10 space-y-8 border border-gray-100">

        <div>
          <h1 className="text-4xl font-bold text-gray-800">
            Discover Video Settings
          </h1>
          <p className="text-gray-500 mt-2">
            Manage homepage discover video section
          </p>
        </div>

        {/* YouTube Link */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-600">
            YouTube Link
          </label>
          <input
            type="text"
            placeholder="https://youtube.com/..."
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            className="w-full border border-gray-300 focus:border-black focus:ring-2 focus:ring-black rounded-xl p-4 transition-all"
          />
        </div>

        {/* Thumbnail Upload */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-600">
            Thumbnail Image
          </label>
          <input
            type="file"
            ref={fileRef}
            accept="image/*"
            onChange={(e) =>
              e.target.files && setThumbnailFile(e.target.files[0])
            }
            className="w-full border border-dashed border-gray-400 rounded-xl p-6 cursor-pointer hover:border-black transition"
          />
        </div>

        {/* Preview */}
        {savedThumbnail && (
          <div>
            <h2 className="text-lg font-semibold mb-3 text-gray-700">
              Current Thumbnail
            </h2>
            <img
              src={savedThumbnail}
              className="h-52 rounded-xl shadow-lg object-cover"
            />
          </div>
        )}

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={loading}
          className={`w-full py-4 rounded-xl text-white font-semibold text-lg transition-all duration-300 ${
            loading
              ? "bg-gray-500 cursor-not-allowed"
              : "bg-black hover:bg-gray-900"
          }`}
        >
          {loading ? "Saving..." : "Save Settings"}
        </button>
      </div>
    </div>
  );
}