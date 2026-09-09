"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { Mail, Phone, Search, X, Inbox, Trash2 } from "lucide-react";
import {
  useEnquiryRealtime,
  type Enquiry,
  type EnquiryStatus,
} from "@/components/EnquiryRealtimeProvider";

const STATUSES: EnquiryStatus[] = ["New", "Contacted", "Closed"];

const statusClass: Record<EnquiryStatus, string> = {
  New: "bg-yellow-100 text-yellow-700 border-yellow-200",
  Contacted: "bg-blue-100 text-blue-700 border-blue-200",
  Closed: "bg-gray-100 text-gray-600 border-gray-200",
};

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export default function AdminEnquiries() {
  const API = process.env.NEXT_PUBLIC_API_BASE_URL;

  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");

  const [selected, setSelected] = useState<Enquiry | null>(null);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const { liveEnquiries } = useEnquiryRealtime();

  // Enquiries deleted during this session. liveEnquiries is append-only, so
  // without this a re-run of the merge effect would put a deleted row back.
  const removedIds = useRef<Set<string>>(new Set());

  // Enquiries are admin-only, so every request carries the login token.
  const authHeader = () => ({
    headers: {
      Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
    },
  });

  const fetchEnquiries = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await axios.get(`${API}/api/enquiries`, authHeader());
      setEnquiries(res.data);
    } catch (err) {
      const status = axios.isAxiosError(err) ? err.response?.status : undefined;

      setError(
        status === 401
          ? "Your session has expired. Please log in again."
          : "Failed to load enquiries.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (API) fetchEnquiries();
  }, [API]);

  // Enquiries pushed over the socket are merged into the same array the REST
  // fetch populates, so `visible` re-applies search, status filter and sort
  // without a refetch. Guarded by _id because a socket event can race the
  // initial fetch, or arrive again after a reconnect.
  useEffect(() => {
    if (liveEnquiries.length === 0) return;

    setEnquiries((prev) => {
      const known = new Set(prev.map((enquiry) => enquiry._id));
      const fresh = liveEnquiries.filter(
        (enquiry) =>
          !known.has(enquiry._id) && !removedIds.current.has(enquiry._id)
      );

      return fresh.length > 0 ? [...fresh, ...prev] : prev;
    });
  }, [liveEnquiries]);

  // ponytail: filtered in the browser over the full list, which matches the
  // other dashboard pages. Move to query params on the API once this grows
  // past a few thousand enquiries.
  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();

    return enquiries
      .filter((enquiry) => {
        if (statusFilter && enquiry.status !== statusFilter) return false;
        if (!term) return true;

        return (
          enquiry.name.toLowerCase().includes(term) ||
          enquiry.email.toLowerCase().includes(term) ||
          enquiry.phone.toLowerCase().includes(term)
        );
      })
      .sort((a, b) => {
        const diff =
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        return sort === "newest" ? -diff : diff;
      });
  }, [enquiries, search, statusFilter, sort]);

  const updateStatus = async (id: string, status: EnquiryStatus) => {
    if (updating) return;

    try {
      setUpdating(true);

      const res = await axios.put(
        `${API}/api/enquiries/${id}/status`,
        { status },
        authHeader(),
      );

      setEnquiries((prev) =>
        prev.map((enquiry) => (enquiry._id === id ? res.data : enquiry)),
      );
      setSelected((prev) => (prev && prev._id === id ? res.data : prev));

      toast.success(`Marked as ${status}`);
    } catch {
      toast.error("Failed to update status");
    } finally {
      setUpdating(false);
    }
  };

  const deleteEnquiry = async (enquiry: Enquiry) => {
    if (deleting) return;

    if (
      !confirm(
        `Delete the enquiry from ${enquiry.name}? This cannot be undone.`
      )
    )
      return;

    try {
      setDeleting(enquiry._id);

      await axios.delete(`${API}/api/enquiries/${enquiry._id}`, authHeader());

      // Drop it from the fetched list and from anything the socket delivered,
      // so a live arrival cannot resurrect the row it was just removed from.
      setEnquiries((prev) => prev.filter((item) => item._id !== enquiry._id));
      removedIds.current.add(enquiry._id);
      setSelected((prev) => (prev?._id === enquiry._id ? null : prev));

      toast.success("Enquiry deleted");
    } catch (err) {
      const status = axios.isAxiosError(err) ? err.response?.status : undefined;
      toast.error(
        status === 401 ? "Your session has expired" : "Failed to delete enquiry"
      );
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div>
      {/* ================= HEADER ================= */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Enquiries</h1>
        <p className="text-gray-500 mt-2">
          Leads submitted through the website enquiry form
        </p>
      </div>

      {/* ================= FILTERS ================= */}
      <div className="grid md:grid-cols-4 gap-4 mb-8">
        <div className="relative md:col-span-2">
          <Search
            size={16}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            placeholder="Search by name, email or phone"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border border-gray-300 focus:border-black focus:ring-2 focus:ring-black rounded-xl py-3 pl-11 pr-4 outline-none"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-gray-300 rounded-xl p-3"
        >
          <option value="">All statuses</option>
          {STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>

        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as "newest" | "oldest")}
          className="border border-gray-300 rounded-xl p-3"
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
        </select>
      </div>

      {/* ================= STATES ================= */}
      {loading ? (
        <div className="py-20 text-center text-gray-500">
          Loading enquiries...
        </div>
      ) : error ? (
        <div className="py-20 text-center">
          <p className="text-red-600 font-medium">{error}</p>
          <button
            onClick={fetchEnquiries}
            className="mt-4 px-5 py-2 rounded-xl bg-black hover:bg-gray-900 text-white text-sm"
          >
            Try Again
          </button>
        </div>
      ) : enquiries.length === 0 ? (
        <div className="py-20 text-center">
          <div className="mx-auto mb-4 w-14 h-14 rounded-2xl bg-yellow-100 text-yellow-600 flex items-center justify-center">
            <Inbox size={24} />
          </div>
          <p className="text-lg font-semibold text-gray-800">
            No enquiries yet
          </p>
          <p className="text-gray-500 mt-2 text-sm">
            Enquiries submitted through the website popup will appear here.
          </p>
        </div>
      ) : visible.length === 0 ? (
        <div className="py-20 text-center text-gray-500">
          No enquiries match your search.
        </div>
      ) : (
        /* ================= TABLE ================= */
        <div className="border border-gray-200 rounded-2xl overflow-x-auto">
          {/* table-fixed keeps the widths proportional to the container so a long
              email can never push the View button out of view; below 700px the
              wrapper scrolls horizontally instead. */}
          <table className="w-full table-fixed text-sm text-left min-w-[700px]">
            <thead className="bg-gray-50 text-gray-500 border-b border-gray-200">
              <tr>
                <th className="px-4 py-4 font-medium w-[16%]">Name</th>
                <th className="px-4 py-4 font-medium w-[26%]">Contact</th>
                <th className="px-4 py-4 font-medium w-[20%]">Enquiry</th>
                <th className="px-4 py-4 font-medium w-[12%]">Status</th>
                <th className="px-4 py-4 font-medium w-[12%]">Submitted</th>
                <th className="px-4 py-4 w-[14%]" />
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {visible.map((enquiry) => (
                <tr key={enquiry._id} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-4 font-medium text-gray-800 break-words">
                    {enquiry.name}
                  </td>

                  <td className="px-4 py-4 text-gray-600">
                    <p className="flex items-center gap-2" title={enquiry.email}>
                      <Mail size={13} className="shrink-0 text-gray-400" />
                      <span className="truncate">{enquiry.email}</span>
                    </p>
                    <p className="flex items-center gap-2 mt-1" title={enquiry.phone}>
                      <Phone size={13} className="shrink-0 text-gray-400" />
                      <span className="truncate">{enquiry.phone}</span>
                    </p>
                  </td>

                  <td className="px-4 py-4 text-gray-600 break-words">
                    {enquiry.requirement}
                  </td>

                  <td className="px-4 py-4">
                    <span
                      className={`text-xs px-3 py-1 rounded-full border font-medium ${
                        statusClass[enquiry.status]
                      }`}
                    >
                      {enquiry.status}
                    </span>
                  </td>

                  <td className="px-4 py-4 text-gray-500 whitespace-nowrap">
                    {formatDate(enquiry.createdAt)}
                  </td>

                  <td className="px-4 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setSelected(enquiry)}
                        className="px-3 py-1.5 rounded-lg bg-black hover:bg-gray-900 text-white text-xs font-medium"
                      >
                        View
                      </button>

                      <button
                        onClick={() => deleteEnquiry(enquiry)}
                        disabled={deleting === enquiry._id}
                        aria-label={`Delete enquiry from ${enquiry.name}`}
                        title="Delete enquiry"
                        className="flex h-[30px] w-[30px] items-center justify-center rounded-lg border border-gray-300 text-gray-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ================= DETAILS MODAL ================= */}
      {selected && (
        <div
          onClick={() => setSelected(null)}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white p-8 rounded-3xl w-full max-w-2xl shadow-2xl space-y-6 my-8"
          >
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-semibold text-gray-800">
                  {selected.name}
                </h2>
                <p className="text-gray-500 text-sm mt-1">
                  Submitted {formatDateTime(selected.createdAt)}
                </p>
              </div>

              <button
                onClick={() => setSelected(null)}
                aria-label="Close details"
                className="text-gray-400 hover:text-black transition"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid sm:grid-cols-2 gap-5 text-sm">
              <Detail label="Email" value={selected.email} />
              <Detail label="Phone" value={selected.phone} />
              <Detail label="Enquiring About" value={selected.requirement} />
              <Detail label="Property Type" value={selected.propertyType} />
              <Detail
                label="Preferred Location"
                value={selected.preferredLocation}
              />
              <Detail
                label="Last Updated"
                value={formatDateTime(selected.updatedAt)}
              />
            </div>

            <div>
              <p className="text-xs uppercase tracking-wide text-gray-400 mb-2">
                Message
              </p>
              <p className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-gray-700 whitespace-pre-wrap">
                {selected.message || "No message provided."}
              </p>
            </div>

            {/* STATUS */}
            <div className="border-t border-gray-100 pt-6 flex flex-wrap items-center gap-3">
              <p className="text-sm font-medium text-gray-700 mr-2">Status</p>

              {STATUSES.map((status) => (
                <button
                  key={status}
                  onClick={() => updateStatus(selected._id, status)}
                  disabled={updating || selected.status === status}
                  className={`px-4 py-2 rounded-lg text-xs font-medium border transition disabled:cursor-not-allowed ${
                    selected.status === status
                      ? "bg-black text-white border-black"
                      : "border-gray-300 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {status}
                </button>
              ))}

              <button
                onClick={() => deleteEnquiry(selected)}
                disabled={deleting === selected._id}
                className="ml-auto flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Trash2 size={14} />
                {deleting === selected._id ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">
        {label}
      </p>
      <p className="text-gray-800 break-words">{value || "—"}</p>
    </div>
  );
}
