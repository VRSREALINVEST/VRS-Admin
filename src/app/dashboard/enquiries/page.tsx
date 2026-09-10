"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import {
  Mail,
  Phone,
  Search,
  X,
  Inbox,
  Trash2,
  CalendarDays,
  CalendarRange,
  CalendarClock,
  RotateCcw,
} from "lucide-react";
import {
  useEnquiryRealtime,
  type Enquiry,
  type EnquiryStatus,
} from "@/components/EnquiryRealtimeProvider";

const STATUSES: EnquiryStatus[] = ["New", "Contacted", "Closed"];

interface EnquiryStats {
  today: number;
  last7Days: number;
  lastMonth: number;
  total: number;
  timezone: string;
}

const statusClass: Record<EnquiryStatus, string> = {
  New: "bg-yellow-100 text-yellow-700 border-yellow-200",
  Contacted: "bg-blue-100 text-blue-700 border-blue-200",
  Closed: "bg-gray-100 text-gray-600 border-gray-200",
};

// The statistics and the date filters are resolved in the business timezone on
// the server, so the dates shown here must use it too. Rendering in the
// browser's zone made an enquiry submitted at 00:30 on 1 August in Sydney read
// as "31 July", disagreeing with the Last Month card that counted it.
// The server reports its own zone in the stats response; this is the fallback.
const APP_TIMEZONE = "Australia/Sydney";

const formatDate = (value: string, timeZone: string = APP_TIMEZONE) =>
  new Date(value).toLocaleDateString("en-AU", {
    timeZone,
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const formatDateTime = (value: string, timeZone: string = APP_TIMEZONE) =>
  new Date(value).toLocaleString("en-AU", {
    timeZone,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

/** The calendar day an instant falls on, in the business timezone. */
const zonedDay = (value: string, timeZone: string = APP_TIMEZONE) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  // en-CA formats as YYYY-MM-DD, which compares correctly as a string.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
};

export default function AdminEnquiries() {
  const API = process.env.NEXT_PUBLIC_API_BASE_URL;

  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const [stats, setStats] = useState<EnquiryStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

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

  // A range that runs backwards is rejected here so no invalid query is sent.
  const dateError =
    from && to && from > to ? "From date cannot be after To date." : "";

  const hasFilters = Boolean(search.trim() || from || to);

  const fetchEnquiries = useCallback(async () => {
    if (!API || dateError) return;

    try {
      setLoading(true);
      setError("");

      // Filtering happens in MongoDB, not over a full collection pulled into
      // the browser.
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (from) params.set("from", from);
      if (to) params.set("to", to);

      const query = params.toString();
      const res = await axios.get(
        `${API}/api/enquiries${query ? `?${query}` : ""}`,
        authHeader(),
      );
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [API, search, from, to, dateError]);

  // The cards describe the whole database, so they are fetched independently
  // of the list's search and date filters and are never refetched while typing.
  const fetchStats = useCallback(async () => {
    if (!API) return;

    try {
      setStatsLoading(true);
      const res = await axios.get(`${API}/api/enquiries/stats`, authHeader());
      setStats(res.data);
    } catch {
      setStats(null);
    } finally {
      setStatsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [API]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Debounced so a keystroke does not fire a request per character.
  useEffect(() => {
    const timer = setTimeout(fetchEnquiries, 350);
    return () => clearTimeout(timer);
  }, [fetchEnquiries]);

  const clearFilters = () => {
    setSearch("");
    setFrom("");
    setTo("");
  };

  // The server already applied search and the date range, so a live arrival is
  // only prepended when it would have matched that same query. Without this a
  // new enquiry could appear inside a filtered view it does not belong to.
  const matchesFilters = useCallback(
    (enquiry: Enquiry) => {
      const term = search.trim().toLowerCase();
      if (term) {
        const haystack = [enquiry.name, enquiry.email, enquiry.phone]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(term)) return false;
      }

      // Compare on the business-timezone calendar day, matching the server, so
      // the To date stays inclusive and a late-evening enquiry is not pushed
      // into the next day by the viewer's own timezone.
      const day = zonedDay(enquiry.createdAt, stats?.timezone);
      if (!day) return true;

      if (from && day < from) return false;
      if (to && day > to) return false;

      return true;
    },
    [search, from, to, stats?.timezone],
  );

  useEffect(() => {
    if (liveEnquiries.length === 0) return;

    setEnquiries((prev) => {
      const known = new Set(prev.map((enquiry) => enquiry._id));
      const fresh = liveEnquiries.filter(
        (enquiry) =>
          !known.has(enquiry._id) &&
          !removedIds.current.has(enquiry._id) &&
          matchesFilters(enquiry),
      );

      return fresh.length > 0 ? [...fresh, ...prev] : prev;
    });

    // A new enquiry changes today's and the total counts.
    fetchStats();
  }, [liveEnquiries, matchesFilters, fetchStats]);

  // The list arrives already filtered and sorted newest-first from MongoDB.
  const visible = useMemo(
    () =>
      [...enquiries].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [enquiries],
  );

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

      {/* ================= STATISTICS ================= */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {[
          {
            label: "Today's Enquiries",
            value: stats?.today,
            icon: <CalendarDays size={20} />,
          },
          {
            label: "Last 7 Days",
            value: stats?.last7Days,
            icon: <CalendarRange size={20} />,
          },
          {
            label: "Last Month",
            value: stats?.lastMonth,
            icon: <CalendarClock size={20} />,
          },
          {
            label: "Total Enquiries",
            value: stats?.total,
            icon: <Inbox size={20} />,
          },
        ].map((card) => (
          <div
            key={card.label}
            className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all duration-300"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-yellow-100 text-yellow-600 rounded-xl">
                {card.icon}
              </div>
            </div>

            {/* A skeleton rather than a 0, so a loading card never reads as
                "no enquiries". */}
            {statsLoading ? (
              <div className="h-8 w-16 mb-1 rounded-lg bg-gray-200 animate-pulse" />
            ) : (
              <h2 className="text-2xl font-bold mb-1">{card.value ?? "—"}</h2>
            )}

            <p className="text-sm text-gray-500">{card.label}</p>
          </div>
        ))}
      </div>

      {/* ================= FILTERS ================= */}
      <div className="grid gap-4 md:grid-cols-4 mb-2">
        <div className="md:col-span-2">
          <label
            htmlFor="enquiry-search"
            className="mb-2 block text-xs font-medium text-gray-500"
          >
            Search
          </label>
          <div className="relative">
            <Search
              size={16}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              id="enquiry-search"
              placeholder="Search by name, email or phone"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full border border-gray-300 focus:border-black focus:ring-2 focus:ring-black rounded-xl py-3 pl-11 pr-4 outline-none"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="enquiry-from"
            className="mb-2 block text-xs font-medium text-gray-500"
          >
            From date
          </label>
          <input
            id="enquiry-from"
            type="date"
            value={from}
            max={to || undefined}
            onChange={(e) => setFrom(e.target.value)}
            className={`w-full border rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-black ${
              dateError
                ? "border-red-400"
                : "border-gray-300 focus:border-black"
            }`}
          />
        </div>

        <div>
          <label
            htmlFor="enquiry-to"
            className="mb-2 block text-xs font-medium text-gray-500"
          >
            To date
          </label>
          <input
            id="enquiry-to"
            type="date"
            value={to}
            min={from || undefined}
            onChange={(e) => setTo(e.target.value)}
            className={`w-full border rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-black ${
              dateError
                ? "border-red-400"
                : "border-gray-300 focus:border-black"
            }`}
          />
        </div>
      </div>

      <div className="mb-8 flex flex-wrap items-center gap-3 min-h-[24px]">
        {dateError && (
          <p role="alert" className="text-sm text-red-600">
            {dateError}
          </p>
        )}

        {hasFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-2 text-sm text-gray-600 transition hover:text-black"
          >
            <RotateCcw size={14} />
            Clear filters
          </button>
        )}
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
      ) : visible.length === 0 && !hasFilters && stats?.total === 0 ? (
        /* Genuinely empty database. */
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
        /* Enquiries exist, but this search or date range matches none. */
        <div className="py-20 text-center">
          <div className="mx-auto mb-4 w-14 h-14 rounded-2xl bg-gray-100 text-gray-500 flex items-center justify-center">
            <Search size={22} />
          </div>
          <p className="text-lg font-semibold text-gray-800">
            No enquiries found
          </p>
          <p className="text-gray-500 mt-2 text-sm">
            Try adjusting your search or date range.
          </p>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="mt-4 inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-black hover:bg-gray-900 text-white text-sm"
            >
              <RotateCcw size={14} />
              Clear filters
            </button>
          )}
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
                    {formatDate(enquiry.createdAt, stats?.timezone)}
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
                  Submitted {formatDateTime(selected.createdAt, stats?.timezone)}
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
              <Detail
                label="Last Updated"
                value={formatDateTime(selected.updatedAt, stats?.timezone)}
              />
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
