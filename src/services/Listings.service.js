import api from "../api/axios";
import { getToken } from "./Auth.service";
import { resolveMediaUrl } from "../utils/media";

function authHeaders() {
  const token = getToken();
  if (!token) throw new Error("Not authenticated");
  return { Authorization: `Bearer ${token}` };
}

function mapListing(item) {
  const owner = item?.owner
    ? {
        ...item.owner,
        displayName: item.owner.displayName || item.owner.display_name || "",
        avatarUrl: resolveMediaUrl(item.owner.avatarUrl || item.owner.avatar_url),
      }
    : item?.owner_user_id || item?.owner_display_name || item?.owner_avatar_url
      ? {
          id: item.owner_user_id,
          displayName: item.owner_display_name || "",
          avatarUrl: resolveMediaUrl(item.owner_avatar_url),
        }
      : null;

  return {
    ...item,
    owner,
    photo_url: resolveMediaUrl(item?.photo_url),
    imageUrl: resolveMediaUrl(item?.photo_url || item?.imageUrl || item?.image),
  };
}

function mapListingDetails(item) {
  const owner = item?.owner
    ? {
        ...item.owner,
        avatarUrl: resolveMediaUrl(item.owner.avatarUrl || item.owner.avatar_url),
      }
    : null;

  return {
    ...item,
    owner,
    photos: Array.isArray(item?.photos)
      ? item.photos.map((p) => ({ ...p, url: resolveMediaUrl(p.url) }))
      : [],
  };
}

export const getListings = async (filters = {}) => {
  const params = {};

  const query = String(filters?.query || "").trim();
  if (query) params.q = query;
  if (filters?.cityId) params.cityId = Number(filters.cityId);
  if (filters?.roomType) params.roomType = filters.roomType;
  if (filters?.minPrice !== undefined && filters?.minPrice !== null && filters?.minPrice !== "") {
    params.minPrice = Number(filters.minPrice);
  }
  if (filters?.maxPrice !== undefined && filters?.maxPrice !== null && filters?.maxPrice !== "") {
    params.maxPrice = Number(filters.maxPrice);
  }
  if (filters?.sort) params.sort = filters.sort;
  if (filters?.limit) params.limit = Number(filters.limit);

  const res = await api.get("/listings/search", { params });
  return (res.data?.items || []).map(mapListing);
};

export const getListingById = async (listingId) => {
  const res = await api.get(`/listings/${listingId}`);
  return mapListingDetails(res.data || {});
};

export const getMyListings = async () => {
  const res = await api.get("/listings/me/all", { headers: authHeaders() });
  return (res.data?.items || []).map(mapListing);
};

export const createListing = async (payload) => {
  const res = await api.post("/listings", payload, { headers: authHeaders() });
  return mapListing(res.data);
};

export const updateListing = async (listingId, payload) => {
  const res = await api.patch(`/listings/${listingId}`, payload, { headers: authHeaders() });
  return mapListing(res.data);
};

export const deleteListing = async (listingId) => {
  const res = await api.delete(`/listings/${listingId}`, { headers: authHeaders() });
  return res.data;
};

export const uploadListingPhoto = async (listingId, file, position = 0) => {
  if (!file) throw new Error("Photo file is required");
  const token = getToken();
  if (!token) throw new Error("Not authenticated");

  const fd = new FormData();
  fd.append("photo", file);
  fd.append("position", String(position));

  const res = await api.post(`/listings/${listingId}/photos/upload`, fd, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return { ...res.data, url: resolveMediaUrl(res.data?.url) };
};
