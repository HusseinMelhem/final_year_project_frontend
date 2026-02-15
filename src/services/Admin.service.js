import api from "../api/axios";
import { getToken } from "./Auth.service";
import { resolveMediaUrl } from "../utils/media";

function authHeaders() {
  const token = getToken();
  if (!token) throw new Error("Not authenticated");
  return { Authorization: `Bearer ${token}` };
}

function mapListing(item) {
  return {
    ...item,
    photo_url: resolveMediaUrl(item?.photo_url),
    imageUrl: resolveMediaUrl(item?.photo_url || item?.imageUrl || item?.image)
  };
}

export async function getAdminDashboardStats() {
  const res = await api.get("/admin/dashboard", { headers: authHeaders() });
  return {
    totalListings: Number(res.data?.totalListings || 0),
    pendingReports: Number(res.data?.pendingReports || 0),
    newMessages: Number(res.data?.newMessages || 0),
    verifiedUsers: Number(res.data?.verifiedUsers || 0)
  };
}

export async function getAdminListings({ limit = 50, offset = 0, includeDeleted = false } = {}) {
  const res = await api.get("/admin/listings", {
    headers: authHeaders(),
    params: { limit, offset, includeDeleted }
  });
  return (res.data?.items || []).map(mapListing);
}

export async function setAdminListingStatus(listingId, status, note) {
  const payload = { status };
  if (note) payload.note = note;

  const res = await api.patch(`/admin/listings/${listingId}/status`, payload, {
    headers: authHeaders()
  });
  return mapListing(res.data || {});
}

export async function getAdminUsers({ limit = 50, offset = 0 } = {}) {
  const res = await api.get("/admin/users", {
    headers: authHeaders(),
    params: { limit, offset }
  });
  return res.data?.items || [];
}

export async function setAdminUserStatus(userId, status, reason) {
  const payload = { status };
  if (reason) payload.reason = reason;

  const res = await api.patch(`/admin/users/${userId}/status`, payload, {
    headers: authHeaders()
  });
  return res.data || {};
}
