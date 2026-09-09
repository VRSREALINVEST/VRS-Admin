"use client";

import { useEffect, useRef, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import RichTextEditor from "@/components/RichTextEditor";

interface Blog {
  _id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  image: string;
  author?: string;
  imageAlt?: string;
  imageTitle?: string;
  publishDate?: string;
  metaTitle?: string;
  metaDescription?: string;
  isPublished: boolean;
}

// <input type="date"> needs yyyy-mm-dd; the API returns an ISO timestamp.
const toDateInput = (value?: string) => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
};

const inputClass =
  "border border-gray-300 focus:border-black focus:ring-2 focus:ring-black rounded-xl p-4 transition-all";

export default function AdminBlogPage() {
  const API = process.env.NEXT_PUBLIC_API_BASE_URL;

  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [author, setAuthor] = useState("");
  const [publishDate, setPublishDate] = useState("");
  const [imageAlt, setImageAlt] = useState("");
  const [imageTitle, setImageTitle] = useState("");
  const [isPublished, setIsPublished] = useState(false);
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [currentImage, setCurrentImage] = useState("");
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLDivElement>(null);

  // Blog writes are admin-only, so every request carries the login token.
  const authHeader = () => ({
    headers: {
      Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
    },
  });

  // The admin listing includes drafts and scheduled posts; the public
  // GET /api/blog deliberately hides both.
  const fetchBlogs = async () => {
    try {
      const res = await axios.get(`${API}/api/blog/admin/all`, authHeader());
      setBlogs(res.data);
    } catch {
      toast.error("Failed to load blogs");
    }
  };

  useEffect(() => {
    if (API) fetchBlogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [API]);

  const resetForm = () => {
    setTitle("");
    setExcerpt("");
    setContent("");
    setAuthor("");
    setPublishDate("");
    setImageAlt("");
    setImageTitle("");
    setIsPublished(false);
    setMetaTitle("");
    setMetaDescription("");
    setImageFile(null);
    setCurrentImage("");
    setEditingId(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const startEditing = (blog: Blog) => {
    setEditingId(blog._id);
    setTitle(blog.title);
    setExcerpt(blog.excerpt);
    setContent(blog.content);
    setAuthor(blog.author || "");
    setPublishDate(toDateInput(blog.publishDate));
    setImageAlt(blog.imageAlt || "");
    setImageTitle(blog.imageTitle || "");
    setIsPublished(blog.isPublished);
    setMetaTitle(blog.metaTitle || "");
    setMetaDescription(blog.metaDescription || "");
    setCurrentImage(blog.image);
    setImageFile(null);
    if (fileRef.current) fileRef.current.value = "";

    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Tiptap always keeps at least one node, so an "empty" editor is "<p></p>".
  const isContentEmpty = (html: string) =>
    !html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, "").trim();

  const handleSubmit = async () => {
    if (loading) return;

    if (!title || !excerpt || isContentEmpty(content)) {
      toast.error("Title, excerpt and content are required");
      return;
    }

    if (!editingId && !imageFile) {
      toast.error("A featured image is required");
      return;
    }

    try {
      setLoading(true);

      const formData = new FormData();
      formData.append("title", title);
      formData.append("excerpt", excerpt);
      formData.append("content", content);
      formData.append("author", author);
      formData.append("imageAlt", imageAlt);
      formData.append("imageTitle", imageTitle);
      formData.append("publishDate", publishDate);
      formData.append("metaTitle", metaTitle);
      formData.append("metaDescription", metaDescription);
      formData.append("isPublished", String(isPublished));

      if (imageFile) formData.append("image", imageFile);

      if (editingId) {
        await axios.put(`${API}/api/blog/${editingId}`, formData, authHeader());
        toast.success(
          isPublished ? "Blog updated and published" : "Draft updated"
        );
      } else {
        await axios.post(`${API}/api/blog`, formData, authHeader());
        toast.success(isPublished ? "Blog published" : "Draft saved");
      }

      resetForm();
      fetchBlogs();
    } catch (err: unknown) {
      const message = axios.isAxiosError(err)
        ? err.response?.data?.message
        : undefined;
      toast.error(message || "Operation failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this blog?")) return;

    try {
      setDeletingId(id);

      await axios.delete(`${API}/api/blog/${id}`, authHeader());

      setBlogs((prev) => prev.filter((b) => b._id !== id));
      if (editingId === id) resetForm();
      toast.success("Blog deleted successfully");
    } catch (err: unknown) {
      const message = axios.isAxiosError(err)
        ? err.response?.data?.message
        : undefined;
      toast.error(message || "Delete failed");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 p-8">
      <div className="max-w-6xl mx-auto bg-white rounded-3xl shadow-2xl p-10 space-y-12 border border-gray-100">
        <div ref={formRef}>
          <h1 className="text-4xl font-bold text-gray-800">
            Manage Blog Articles
          </h1>
          <p className="text-gray-500 mt-2">Create and manage blog content</p>
        </div>

        {/* CREATE / EDIT FORM */}
        <div className="grid gap-6">
          {editingId && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
              Editing an existing article. Its URL stays{" "}
              <strong>/blog/{blogs.find((b) => b._id === editingId)?.slug}</strong>{" "}
              even if you change the title.
            </div>
          )}

          <input
            placeholder="Blog Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={inputClass}
          />

          <textarea
            placeholder="Description / Excerpt"
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            className={inputClass}
          />

          <div className="grid md:grid-cols-2 gap-6">
            <input
              placeholder="Author"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              className={inputClass}
            />

            <div>
              <label className="mb-2 block text-xs text-gray-500">
                Publish date
              </label>
              <input
                type="date"
                value={publishDate}
                onChange={(e) => setPublishDate(e.target.value)}
                className={`${inputClass} w-full`}
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Blog content
            </label>
            <RichTextEditor value={content} onChange={setContent} />
          </div>

          {/* IMAGE */}
          <div className="grid gap-6">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Featured image
              </label>
              <input
                type="file"
                accept="image/*"
                ref={fileRef}
                onChange={(e) =>
                  e.target.files && setImageFile(e.target.files[0])
                }
                className="w-full border border-dashed border-gray-400 rounded-xl p-6 cursor-pointer hover:border-black transition"
              />

              {(imageFile || currentImage) && (
                <div className="mt-4 flex items-start gap-4">
                  <img
                    src={
                      imageFile ? URL.createObjectURL(imageFile) : currentImage
                    }
                    alt={imageAlt || "Featured image preview"}
                    className="h-48 rounded-xl shadow-md object-cover"
                  />
                  {imageFile && (
                    <button
                      type="button"
                      onClick={() => {
                        setImageFile(null);
                        if (fileRef.current) fileRef.current.value = "";
                      }}
                      className="rounded-lg border border-gray-300 px-4 py-2 text-xs text-gray-600 transition hover:bg-gray-50"
                    >
                      {currentImage ? "Keep existing image" : "Remove"}
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <input
                placeholder="Image alt text (accessibility & SEO)"
                value={imageAlt}
                onChange={(e) => setImageAlt(e.target.value)}
                className={inputClass}
              />

              <input
                placeholder="Image title (tooltip)"
                value={imageTitle}
                onChange={(e) => setImageTitle(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <input
              placeholder="Meta Title (SEO)"
              value={metaTitle}
              onChange={(e) => setMetaTitle(e.target.value)}
              className={inputClass}
            />

            <input
              placeholder="Meta Description (SEO)"
              value={metaDescription}
              onChange={(e) => setMetaDescription(e.target.value)}
              className={inputClass}
            />
          </div>

          {/* STATUS */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Status
            </label>
            <select
              value={isPublished ? "published" : "draft"}
              onChange={(e) => setIsPublished(e.target.value === "published")}
              className={`${inputClass} w-full md:w-64`}
            >
              <option value="draft">Draft — not visible publicly</option>
              <option value="published">Published — live on the website</option>
            </select>
          </div>

          <div className="flex flex-wrap gap-4">
            <button
              onClick={handleSubmit}
              disabled={loading}
              className={`flex-1 py-4 rounded-xl text-white font-semibold text-lg transition-all duration-300 ${
                loading
                  ? "bg-gray-500 cursor-not-allowed"
                  : "bg-black hover:bg-gray-900"
              }`}
            >
              {loading
                ? "Saving..."
                : editingId
                  ? "Update Blog"
                  : isPublished
                    ? "Publish Blog"
                    : "Save Draft"}
            </button>

            {editingId && (
              <button
                onClick={resetForm}
                disabled={loading}
                className="px-8 py-4 rounded-xl border border-gray-300 font-medium text-gray-600 transition hover:bg-gray-50"
              >
                Cancel
              </button>
            )}
          </div>
        </div>

        {/* BLOG LIST */}
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold text-gray-700">
            Existing Blogs
          </h2>

          {blogs.length === 0 && (
            <p className="text-gray-500 text-sm">No blog articles yet.</p>
          )}

          {blogs.map((blog) => (
            <div
              key={blog._id}
              className="flex flex-wrap justify-between items-center gap-4 bg-gray-50 hover:bg-gray-100 transition p-6 rounded-2xl shadow-sm"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <p className="font-semibold text-lg">{blog.title}</p>

                  <span
                    className={`text-xs px-3 py-1 rounded-full border font-medium ${
                      blog.isPublished
                        ? "bg-green-100 text-green-700 border-green-200"
                        : "bg-yellow-100 text-yellow-700 border-yellow-200"
                    }`}
                  >
                    {blog.isPublished ? "Published" : "Draft"}
                  </span>
                </div>

                <p className="text-sm text-gray-500 mt-1">/blog/{blog.slug}</p>

                {blog.author && (
                  <p className="text-xs text-gray-400 mt-1">By {blog.author}</p>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => startEditing(blog)}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition"
                >
                  Edit
                </button>

                <button
                  onClick={() => handleDelete(blog._id)}
                  disabled={deletingId === blog._id}
                  className={`px-4 py-2 rounded-lg text-white transition ${
                    deletingId === blog._id
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-red-600 hover:bg-red-700"
                  }`}
                >
                  {deletingId === blog._id ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
