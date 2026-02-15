import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getStoredUser, getToken } from "../services/Auth.service";
import { createConversation, sendConversationMessage } from "../services/Messages.service";
import { getListingById, getListings } from "../services/Listings.service";
import "./ListingDetails.css";

export default function ListingDetails() {
  const { id: listingId } = useParams();
  const navigate = useNavigate();
  const messageRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [listing, setListing] = useState(null);
  const [activeImage, setActiveImage] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [openingConversation, setOpeningConversation] = useState(false);
  const [sendError, setSendError] = useState("");
  const [suggestedListings, setSuggestedListings] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadListing() {
      setLoading(true);
      setLoadError("");

      try {
        const data = await getListingById(listingId);
        if (cancelled) return;
        setListing(data);

        const first = data?.photos?.[0]?.url;
        if (first) setActiveImage(first);
      } catch (err) {
        if (!cancelled) {
          setListing(null);
          setLoadError(err?.response?.data?.error || err?.message || "Failed to load listing.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (listingId) loadListing();
    return () => {
      cancelled = true;
    };
  }, [listingId]);

  useEffect(() => {
    let cancelled = false;

    async function loadSuggestions() {
      if (!listing?.id) {
        setSuggestedListings([]);
        return;
      }

      setLoadingSuggestions(true);
      try {
        const primaryFilters = listing?.city_id
          ? { cityId: listing.city_id, sort: "newest", limit: 12 }
          : { sort: "newest", limit: 12 };

        const primary = await getListings(primaryFilters);
        let merged = primary.filter((item) => item?.id && item.id !== listing.id);

        if (merged.length < 4) {
          const fallback = await getListings({ sort: "newest", limit: 12 });
          merged = [...merged, ...fallback.filter((item) => item?.id && item.id !== listing.id)];
        }

        const uniq = [];
        const seen = new Set();
        for (const item of merged) {
          if (!item?.id || seen.has(item.id)) continue;
          seen.add(item.id);
          uniq.push(item);
          if (uniq.length >= 4) break;
        }

        if (!cancelled) setSuggestedListings(uniq);
      } catch {
        if (!cancelled) setSuggestedListings([]);
      } finally {
        if (!cancelled) setLoadingSuggestions(false);
      }
    }

    loadSuggestions();
    return () => {
      cancelled = true;
    };
  }, [listing?.city_id, listing?.id]);

  const photos = useMemo(() => {
    if (listing?.photos?.length) return listing.photos.map((p) => p.url);
    return [
      "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=1600&fit=crop"
    ];
  }, [listing]);

  useEffect(() => {
    if (!activeImage && photos.length > 0) setActiveImage(photos[0]);
  }, [activeImage, photos]);

  const mapEmbedUrl = useMemo(() => {
    const lat = Number(listing?.latitude);
    const lng = Number(listing?.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return "";
    return `https://maps.google.com/maps?q=${lat},${lng}&z=15&output=embed`;
  }, [listing?.latitude, listing?.longitude]);

  const owner = listing?.owner || null;
  const ownerName = owner?.displayName || owner?.username || "Listing Owner";
  const ownerUsername = owner?.username ? `@${owner.username}` : "";
  const viewer = getStoredUser();
  const isOwnerViewing = Boolean(
    viewer?.id && owner?.id && String(viewer.id) === String(owner.id)
  );
  const ownerAvatar =
    owner?.avatarUrl ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(ownerName)}&background=EAF0FF&color=1D4ED8`;

  async function openConversation() {
    if (!listing) return;
    if (isOwnerViewing) {
      setSendError("You cannot message your own listing.");
      return;
    }

    try {
      setOpeningConversation(true);
      setSendError("");

      const token = getToken();
      if (!token) {
        navigate("/auth");
        return;
      }

      const conversation = await createConversation({ listingId: listing.id }, token);
      const conversationId = conversation?.conversationId;
      if (!conversationId) throw new Error("Conversation was not created.");

      navigate(`/messages?conversationId=${conversationId}`);
    } catch (err) {
      setSendError(err?.message || "Failed to open conversation.");
    } finally {
      setOpeningConversation(false);
    }
  }

  async function onSendMessage() {
    if (!message.trim() || !listing) return;
    if (isOwnerViewing) {
      setSendError("You cannot message your own listing.");
      return;
    }

    try {
      setSending(true);
      setSendError("");

      const token = getToken();
      if (!token) {
        navigate("/auth");
        return;
      }

      const conversation = await createConversation({ listingId: listing.id }, token);
      const conversationId = conversation?.conversationId;
      if (!conversationId) throw new Error("Conversation was not created.");

      await sendConversationMessage({ conversationId, body: message.trim() }, token);

      setMessage("");
      navigate(`/messages?conversationId=${conversationId}`);
    } catch (err) {
      setSendError(err?.message || "Failed to send message.");
    } finally {
      setSending(false);
    }
  }

  function openSuggestedListing(nextListingId) {
    if (!nextListingId) return;
    navigate(`/listing/${nextListingId}`);
  }

  if (loading) {
    return (
      <div className="ld-page">
        <div className="ld-container">
          <div className="ld-card">Loading listing...</div>
        </div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="ld-page">
        <div className="ld-container">
          <div className="ld-card">{loadError || "Listing not found."}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="ld-page">
      <div className="ld-container">
        <div className="ld-header">
          <h1 className="ld-page-title">Listing Details</h1>
        </div>

        <div className="ld-card">
          <div className="ld-gallery">
            <div className="ld-main-image-wrap">
              <img className="ld-main-image" src={activeImage} alt="Listing" />
            </div>

            <div className="ld-thumbs">
              {photos.map((img) => (
                <button
                  key={img}
                  className={"ld-thumb-btn " + (activeImage === img ? "is-active" : "")}
                  onClick={() => setActiveImage(img)}
                  type="button"
                >
                  <img className="ld-thumb" src={img} alt="thumb" />
                </button>
              ))}
            </div>
          </div>

          <div className="ld-info">
            <div className="ld-title-row">
              <h2 className="ld-title">{listing.title}</h2>
              <div className="ld-price">
                <span className="ld-price-amount">
                  {listing.currency} {Number(listing.price_monthly || 0).toLocaleString()}
                </span>
                <span className="ld-price-sub"> / month</span>
              </div>
              <div className="ld-location">{listing.city}</div>
            </div>

            <div className="ld-stats">
              <div className="ld-stat">
                <div className="ld-stat-value">{listing.room_type}</div>
                <div className="ld-stat-label">Room Type</div>
              </div>
              <div className="ld-stat">
                <div className="ld-stat-value">
                  {listing.available_from ? String(listing.available_from).slice(0, 10) : "Any"}
                </div>
                <div className="ld-stat-label">Available From</div>
              </div>
              <div className="ld-stat">
                <div className="ld-stat-value">{listing.gender_preference || "ANY"}</div>
                <div className="ld-stat-label">Preference</div>
              </div>
            </div>

            <div className="ld-description">
              {(listing.description || "").split("\n").map((line, idx) => (
                <p key={idx}>{line}</p>
              ))}
            </div>

            <div className="ld-section">
              <h3 className="ld-section-title">Location</h3>
              <div className="ld-location-meta">
                <div><strong>Address:</strong> {listing.address_text || "Not provided"}</div>
                <div><strong>Approx:</strong> {listing.approx_location || "Not provided"}</div>
              </div>

              {mapEmbedUrl ? (
                <iframe
                  title="Listing map"
                  className="ld-map-frame"
                  src={mapEmbedUrl}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              ) : (
                <div className="ld-map-empty">Map coordinates not available.</div>
              )}

              {listing.google_maps_url ? (
                <a className="ld-map-link" href={listing.google_maps_url} target="_blank" rel="noreferrer">
                  Open in Google Maps
                </a>
              ) : null}
            </div>
          </div>

          <div className="ld-contact">
            <div className="ld-contact-card">
              <h3 className="ld-contact-title">Contact Owner</h3>
              <div className="ld-landlord">
                <img
                  className="ld-avatar"
                  src={ownerAvatar}
                  alt="Owner"
                />
                <div className="ld-landlord-meta">
                  <div className="ld-landlord-name">{ownerName}</div>
                  <div className="ld-landlord-username">{ownerUsername || listing.city}</div>
                  {owner?.bio ? <div className="ld-landlord-bio">{owner.bio}</div> : null}
                </div>
              </div>

              <button
                className="ld-primary-btn"
                type="button"
                onClick={openConversation}
                disabled={openingConversation || isOwnerViewing}
              >
                {isOwnerViewing ? "Your Listing" : openingConversation ? "Opening..." : "Message Owner"}
              </button>
            </div>
          </div>
        </div>

        <div className="ld-messages">
          <div className="ld-messages-header">
            <h3 className="ld-section-title">Message</h3>
          </div>

          <div className="ld-message-box">
            {sendError ? <div className="ld-send-error">{sendError}</div> : null}
            {isOwnerViewing ? (
              <div className="ld-owner-note">
                This is your listing. Messaging yourself is disabled.
              </div>
            ) : (
              <>
                <textarea
                  ref={messageRef}
                  className="ld-textarea"
                  rows={5}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Write a message to the owner..."
                />
                <div className="ld-message-actions">
                  <button
                    className="ld-send-btn"
                    type="button"
                    onClick={onSendMessage}
                    disabled={sending || !message.trim()}
                  >
                    {sending ? "Sending..." : "Send"}
                  </button>
                  <button
                    className="ld-ghost-btn"
                    type="button"
                    onClick={() => setMessage("")}
                    disabled={sending || !message}
                  >
                    Clear
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="ld-suggest">
          <div className="ld-messages-header">
            <h3 className="ld-section-title">Listings You May Be Interested In</h3>
          </div>

          {loadingSuggestions ? (
            <div className="ld-suggest-empty">Loading suggestions...</div>
          ) : suggestedListings.length === 0 ? (
            <div className="ld-suggest-empty">No suggestions available right now.</div>
          ) : (
            <div className="ld-suggest-grid">
              {suggestedListings.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="ld-suggest-card"
                  onClick={() => openSuggestedListing(item.id)}
                >
                  <img
                    src={
                      item.imageUrl ||
                      item.photo_url ||
                      "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=1200&fit=crop"
                    }
                    alt={item.title || "Listing"}
                  />
                  <div className="ld-suggest-body">
                    <div className="ld-suggest-name">{item.title || "Listing"}</div>
                    <div className="ld-suggest-meta">{item.city || "Unknown city"}</div>
                    <div className="ld-suggest-price">
                      {item.currency || "USD"} {Number(item.price_monthly || 0).toLocaleString()} / month
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
