"use client";

import { useEffect, useRef, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { apiErrorMessage, authHeaders } from "@/lib/adminApi";

interface Property {
  _id: string;
  title: string;
  coverImage: string;
  galleryImages: string[];
  description: string;
  securedPrice: string;
  marketPrice: string;
  currentPrice: string;
}

export default function AdminSecuredProperties() {
  const API = process.env.NEXT_PUBLIC_API_BASE_URL;

  const [properties, setProperties] = useState<Property[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [securedPrice, setSecuredPrice] = useState("");
  const [marketPrice, setMarketPrice] = useState("");
  const [currentPrice, setCurrentPrice] = useState("");

  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [galleryImages, setGalleryImages] = useState<File[]>([]);

  const galleryInputRef = useRef<HTMLInputElement>(null);

  const [editing, setEditing] = useState<Property | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await axios.get(`${API}/api/secured-properties`);
      setProperties(res.data);
    } catch {
      toast.error("Failed to load properties");
    }
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setSecuredPrice("");
    setMarketPrice("");
    setCurrentPrice("");
    setCoverImage(null);
    setGalleryImages([]);
    setEditing(null);

    if (galleryInputRef.current) {
      galleryInputRef.current.value = "";
    }
  };

  // ================= ADD / UPDATE =================
  const submitProperty = async () => {
    if (!title || !description) {
      toast.error("Please fill required fields");
      return;
    }

    try {
      setLoading(true);

      const formData = new FormData();
      formData.append("title", title);
      formData.append("description", description);
      formData.append("securedPrice", securedPrice);
      formData.append("marketPrice", marketPrice);
      formData.append("currentPrice", currentPrice);

      if (coverImage) {
        formData.append("coverImage", coverImage);
      }

      galleryImages.forEach((file) => {
        formData.append("galleryImages", file);
      });

      if (editing) {
        await axios.put(
          `${API}/api/secured-properties/${editing._id}`,
          formData,
          { headers: authHeaders() },
        );
        toast.success("Property updated successfully");
      } else {
        if (!coverImage) {
          toast.error("Cover image required");
          setLoading(false);
          return;
        }

        await axios.post(`${API}/api/secured-properties`, formData, {
          headers: authHeaders(),
        });
        toast.success("Property added successfully");
      }

      resetForm();
      fetchData();
    } catch (err) {
      toast.error(apiErrorMessage(err, "Operation failed"));
    }

    setLoading(false);
  };

  // ================= EDIT =================
  const editProperty = (property: Property) => {
    setEditing(property);
    setTitle(property.title);
    setDescription(property.description);
    setSecuredPrice(property.securedPrice);
    setMarketPrice(property.marketPrice);
    setCurrentPrice(property.currentPrice);

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ================= DELETE =================
  const deleteProperty = async (id: string) => {
    if (!confirm("Delete this property?")) return;

    try {
      await axios.delete(`${API}/api/secured-properties/${id}`, {
        headers: authHeaders(),
      });
      toast.success("Deleted successfully");
      fetchData();
    } catch (err) {
      toast.error(apiErrorMessage(err, "Delete failed"));
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto bg-white p-10 rounded-3xl shadow-xl space-y-8">
        <h1 className="text-3xl font-bold">Secured Properties Admin</h1>

        {/* FORM */}
        <div className="grid md:grid-cols-2 gap-4">
          <input
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="border p-4 rounded-xl"
          />

          <textarea
            placeholder="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="border p-4 rounded-xl col-span-2"
            rows={4}
          />

          <input
            placeholder="Secured Price"
            value={securedPrice}
            onChange={(e) => setSecuredPrice(e.target.value)}
            className="border p-4 rounded-xl"
          />

          <input
            placeholder="Market Price"
            value={marketPrice}
            onChange={(e) => setMarketPrice(e.target.value)}
            className="border p-4 rounded-xl"
          />

          <input
            placeholder="Current Price"
            value={currentPrice}
            onChange={(e) => setCurrentPrice(e.target.value)}
            className="border p-4 rounded-xl"
          />

          {/* Cover Image */}
          <div>
            <label className="block mb-2 font-medium">Cover Image</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) =>
                e.target.files && setCoverImage(e.target.files[0])
              }
              className="border p-4 rounded-xl w-full"
            />
          </div>

          {/* Gallery Images */}
          <div>
            <label className="block mb-2 font-medium">Gallery Images</label>

            <input
              type="file"
              accept="image/*"
              ref={galleryInputRef}
              onChange={(e) => {
                if (e.target.files) {
                  const file = e.target.files[0];
                  if (file) {
                    setGalleryImages((prev) => [...prev, file]);
                  }
                }

                if (galleryInputRef.current) {
                  galleryInputRef.current.value = "";
                }
              }}
              className="border p-4 rounded-xl w-full"
            />

            {galleryImages.length > 0 && (
              <div className="flex flex-wrap gap-4 mt-4">
                {galleryImages.map((file, index) => (
                  <div key={index} className="relative w-24 h-24">
                    <img
                      src={URL.createObjectURL(file)}
                      className="w-full h-full object-cover rounded-lg"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setGalleryImages((prev) =>
                          prev.filter((_, i) => i !== index),
                        )
                      }
                      className="absolute top-1 right-1 bg-black text-white text-xs px-2 rounded-full"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={submitProperty}
            disabled={loading}
            className="bg-black text-white rounded-xl py-4 col-span-2"
          >
            {loading
              ? "Processing..."
              : editing
                ? "Update Property"
                : "Add Property"}
          </button>
        </div>

        {/* LIST */}
        <div className="space-y-4">
          {properties.map((property) => (
            <div
              key={property._id}
              className="flex justify-between items-center bg-gray-50 p-6 rounded-xl"
            >
              <div className="flex items-center gap-6">
                <img
                  src={property.coverImage}
                  className="w-20 h-16 object-cover rounded-lg"
                />
                <div>
                  <p className="font-semibold">{property.title}</p>
                  <p className="text-sm text-gray-500">
                    Secured: {property.securedPrice}
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => editProperty(property)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg"
                >
                  Edit
                </button>

                <button
                  onClick={() => deleteProperty(property._id)}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg"
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
