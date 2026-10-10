import axios from "axios";

const SESSION_EXPIRED = "Your session has expired. Please log in again.";

// Admin-only API routes reject any request that doesn't carry the login token.
export const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
});

// The API's own message (e.g. a validation error) when it sent one. A 401
// means the one-day login token has expired, so say that instead.
export const apiErrorMessage = (err: unknown, fallback: string) => {
  if (!axios.isAxiosError(err)) return fallback;
  if (err.response?.status === 401) return SESSION_EXPIRED;
  return err.response?.data?.message || fallback;
};

// Same, for a fetch() response that was not ok.
export const responseErrorMessage = async (res: Response, fallback: string) => {
  if (res.status === 401) return SESSION_EXPIRED;
  const data = await res.json().catch(() => null);
  return data?.message || fallback;
};
