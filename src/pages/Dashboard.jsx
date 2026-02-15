import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { fetchMyAccount, getToken } from "../services/Auth.service";
import {
  deleteListing,
  getMyListings,
  updateListing,
  uploadListingPhoto
} from "../services/Listings.service";
import "./Dashboard.css";

export default function Dashboard() {
  const navigate = useNavigate();
  const token = getToken();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [profile, setProfile] = useState(null);
  const [listings, setListings] = useState([]);
  const [uploadingPhotoId, setUploadingPhotoId] = useState(null);

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    priceMonthly: "",
    addressText: "",
    approxLocation: "",
    latitude: "",
    longitude: "",
    googleMapsUrl: "",
    googleMapsPlaceId: ""
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!token) {
        navigate("/auth");
        return;
      }

      setLoading(true);
      setError("");

      try {
        const [account, myListings] = await Promise.all([fetchMyAccount(), getMyListings()]);
        if (cancelled) return;
        setProfile(account);
        setListings(myListings);
      } catch (err) {
        if (!cancelled) setError(err?.message || "Failed to load dashboard data.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [navigate, token]);

  const kpis = useMemo(
    () => [
      { label: "My Listings", value: listings.length },
      { label: "Draft", value: listings.filter((x) => x.status === "DRAFT").length },
      { label: "Pending", value: listings.filter((x) => x.status === "PENDING").length },
      { label: "Approved", value: listings.filter((x) => x.status === "APPROVED").length }
    ],
    [listings]
  );

  function startEdit(listing) {
    setEditingId(listing.id);
    setEditForm({
      title: listing.title || "",
      description: listing.description || "",
      priceMonthly: listing.price_monthly || "",
      addressText: listing.address_text || "",
      approxLocation: listing.approx_location || "",
      latitude: listing.latitude ?? "",
      longitude: listing.longitude ?? "",
      googleMapsUrl: listing.google_maps_url || "",
      googleMapsPlaceId: listing.google_maps_place_id || ""
    });
    setSuccess("");
    setError("");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm({
      title: "",
      description: "",
      priceMonthly: "",
      addressText: "",
      approxLocation: "",
      latitude: "",
      longitude: "",
      googleMapsUrl: "",
      googleMapsPlaceId: ""
    });
  }

  async function refreshListings() {
    const myListings = await getMyListings();
    setListings(myListings);
  }

  async function saveEdit(listingId) {
    setError("");
    setSuccess("");

    const lat = editForm.latitude === "" ? null : Number(editForm.latitude);
    const lng = editForm.longitude === "" ? null : Number(editForm.longitude);

    if ((lat === null) !== (lng === null)) {
      setError("Latitude and longitude must be set together.");
      return;
    }

    try {
      const payload = {
        title: editForm.title.trim(),
        description: editForm.description.trim(),
        priceMonthly: Number(editForm.priceMonthly),
        addressText: editForm.addressText.trim() || null,
        approxLocation: editForm.approxLocation.trim() || null,
        latitude: lat,
        longitude: lng,
        googleMapsUrl: editForm.googleMapsUrl.trim() || null,
        googleMapsPlaceId: editForm.googleMapsPlaceId.trim() || null
      };

      const updated = await updateListing(listingId, payload);
      setListings((prev) => prev.map((item) => (item.id === listingId ? { ...item, ...updated } : item)));
      setSuccess("Listing updated.");
      cancelEdit();
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || "Failed to update listing.");
    }
  }

  async function onDelete(listingId) {
    if (!window.confirm("Delete this listing?")) return;
    setError("");
    setSuccess("");

    try {
      await deleteListing(listingId);
      setListings((prev) => prev.filter((item) => item.id !== listingId));
      setSuccess("Listing deleted.");
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || "Failed to delete listing.");
    }
  }

  async function onUploadPhoto(listingId, file) {
    if (!file) return;
    setError("");
    setSuccess("");
    setUploadingPhotoId(listingId);

    try {
      await uploadListingPhoto(listingId, file, 0);
      await refreshListings();
      setSuccess("Listing photo uploaded.");
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || "Failed to upload listing photo.");
    } finally {
      setUploadingPhotoId(null);
    }
  }

  if (loading) {
    return (
      <div className="db-page">
        <div className="db-container">
          <div className="db-card">Loading dashboard...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="db-page">
      <div className="db-container">
        <div className="db-hero">
          <h1>Dashboard</h1>
          <p>
            Signed in as <strong>{profile?.user?.email}</strong>. Manage profile, images, and map location.
          </p>
          <div className="db-hero-actions">
            <Link to="/listings/new" className="db-link-btn">
              Create Listing
            </Link>
            <Link to="/profile" className="db-link-btn">
              Edit Profile
            </Link>
            <Link to="/listings" className="db-link-btn secondary">
              Browse Listings
            </Link>
          </div>
        </div>

        {error ? <div className="db-alert error">{error}</div> : null}
        {success ? <div className="db-alert success">{success}</div> : null}

        <div className="db-kpis">
          {kpis.map((k) => (
            <div key={k.label} className="db-kpi neutral">
              <div className="db-kpi-meta">
                <div className="db-kpi-label">{k.label}</div>
                <div className="db-kpi-value">{k.value}</div>
              </div>
            </div>
          ))}
        </div>

        <section className="db-card">
          <div className="db-card-head">
            <h2>My Listings</h2>
          </div>

          <div className="db-list">
            {listings.length === 0 ? (
              <div className="db-empty">No listings yet. Create one from the listings flow.</div>
            ) : (
              listings.map((l) => (
                <article key={l.id} className="db-list-item">
                  <div className="db-list-body">
                    <div className="db-list-title">{l.title}</div>
                    <div className="db-list-meta">
                      <span>{l.city || "Unknown city"}</span>
                      <span>{l.room_type}</span>
                      <span>
                        {l.currency} {Number(l.price_monthly || 0).toLocaleString()}
                      </span>
                      <span className={`db-status status-${(l.status || "").toLowerCase()}`}>{l.status}</span>
                    </div>

                    <div className="db-photo-row">
                      <img
                        className="db-photo-preview"
                        src={
                          l.photo_url ||
                          "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=1200&fit=crop"
                        }
                        alt={l.title}
                      />
                      <label className="db-photo-upload">
                        {uploadingPhotoId === l.id ? "Uploading..." : "Upload Photo"}
                        <input
                          type="file"
                          accept="image/*"
                          disabled={uploadingPhotoId === l.id}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            onUploadPhoto(l.id, file);
                            e.target.value = "";
                          }}
                        />
                      </label>
                    </div>

                    {editingId === l.id ? (
                      <div className="db-edit-form">
                        <input
                          value={editForm.title}
                          onChange={(e) => setEditForm((prev) => ({ ...prev, title: e.target.value }))}
                          placeholder="Title"
                        />
                        <textarea
                          value={editForm.description}
                          onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))}
                          rows={3}
                          placeholder="Description"
                        />
                        <input
                          type="number"
                          min={1}
                          value={editForm.priceMonthly}
                          onChange={(e) =>
                            setEditForm((prev) => ({ ...prev, priceMonthly: e.target.value }))
                          }
                          placeholder="Price per month"
                        />
                        <input
                          value={editForm.addressText}
                          onChange={(e) => setEditForm((prev) => ({ ...prev, addressText: e.target.value }))}
                          placeholder="Address text"
                        />
                        <input
                          value={editForm.approxLocation}
                          onChange={(e) => setEditForm((prev) => ({ ...prev, approxLocation: e.target.value }))}
                          placeholder="Approximate location"
                        />
                        <div className="db-edit-grid">
                          <input
                            type="number"
                            step="any"
                            value={editForm.latitude}
                            onChange={(e) => setEditForm((prev) => ({ ...prev, latitude: e.target.value }))}
                            placeholder="Latitude"
                          />
                          <input
                            type="number"
                            step="any"
                            value={editForm.longitude}
                            onChange={(e) => setEditForm((prev) => ({ ...prev, longitude: e.target.value }))}
                            placeholder="Longitude"
                          />
                        </div>
                        <input
                          value={editForm.googleMapsUrl}
                          onChange={(e) => setEditForm((prev) => ({ ...prev, googleMapsUrl: e.target.value }))}
                          placeholder="Google Maps URL"
                        />
                        <input
                          value={editForm.googleMapsPlaceId}
                          onChange={(e) =>
                            setEditForm((prev) => ({ ...prev, googleMapsPlaceId: e.target.value }))
                          }
                          placeholder="Google Maps Place ID (optional)"
                        />

                        <div className="db-list-actions">
                          <button className="db-btn" onClick={() => saveEdit(l.id)}>
                            Save
                          </button>
                          <button className="db-btn outline" onClick={cancelEdit}>
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="db-list-actions">
                        <button className="db-btn outline" onClick={() => startEdit(l)}>
                          Edit
                        </button>
                        <button className="db-btn danger" onClick={() => onDelete(l.id)}>
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
