import React, { useMemo, useState } from "react";
import "./ListingDetails.css";

export default function ListingDetails() {
  // Later: get listingId from route params + fetch from backend
  const listing = useMemo(
    () => ({
      id: "1",
      title: "Modern Apartment in City Center",
      price: 1200,
      currency: "$",
      city: "New York",
      beds: 2,
      baths: 1,
      areaSqft: 850,
      description:
        "Bright and modern apartment in the heart of the city.\nClose to public transport, shops, and restaurants.",
      amenities: ["Wi-Fi", "Air Conditioning", "Washer / Dryer", "Pet Friendly"],
      landlord: {
        name: "John Landlord",
        phone: "(023) 456-7890",
        avatar:
          "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&crop=faces",
      },
      images: [
        "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=1600&fit=crop",
        "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=1600&fit=crop",
        "https://images.unsplash.com/photo-1502005229762-cf1b2da7c5d6?w=1600&fit=crop",
        "https://images.unsplash.com/photo-1505693314120-0d443867891c?w=1600&fit=crop",
      ],
    }),
    []
  );

  const [activeImage, setActiveImage] = useState(listing.images[0]);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  async function onSendMessage() {
    if (!message.trim()) return;

    try {
      setSending(true);

      // TODO: call your backend messaging endpoint
      // Example:
      // await fetch(`${API}/messages`, {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      //   body: JSON.stringify({
      //     listingId: listing.id,
      //     toUserId: listing.landlordId,
      //     text: message.trim(),
      //   }),
      // });

      // Demo behavior
      await new Promise((r) => setTimeout(r, 600));
      setMessage("");
      alert("Message sent ✅");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="ld-page">
      <div className="ld-container">
        <div className="ld-header">
          <h1 className="ld-page-title">Listing Details</h1>
        </div>

        <div className="ld-card">
          {/* LEFT: Gallery */}
          <div className="ld-gallery">
            <div className="ld-main-image-wrap">
              <img className="ld-main-image" src={activeImage} alt="Listing" />
            </div>

            <div className="ld-thumbs">
              {listing.images.map((img) => (
                <button
                  key={img}
                  className={
                    "ld-thumb-btn " + (activeImage === img ? "is-active" : "")
                  }
                  onClick={() => setActiveImage(img)}
                  type="button"
                >
                  <img className="ld-thumb" src={img} alt="thumb" />
                </button>
              ))}
            </div>
          </div>

          {/* MIDDLE: Info */}
          <div className="ld-info">
            <div className="ld-title-row">
              <h2 className="ld-title">{listing.title}</h2>
              <div className="ld-price">
                <span className="ld-price-amount">
                  {listing.currency}
                  {listing.price.toLocaleString()}
                </span>
                <span className="ld-price-sub"> / month</span>
              </div>
              <div className="ld-location">{listing.city}</div>
            </div>

            <div className="ld-stats">
              <div className="ld-stat">
                <div className="ld-stat-value">{listing.beds}</div>
                <div className="ld-stat-label">Beds</div>
              </div>
              <div className="ld-stat">
                <div className="ld-stat-value">{listing.baths}</div>
                <div className="ld-stat-label">Bath</div>
              </div>
              <div className="ld-stat">
                <div className="ld-stat-value">{listing.areaSqft}</div>
                <div className="ld-stat-label">sq ft</div>
              </div>
            </div>

            <div className="ld-description">
              {listing.description.split("\n").map((line, idx) => (
                <p key={idx}>{line}</p>
              ))}
            </div>

            <div className="ld-section">
              <h3 className="ld-section-title">Amenities</h3>
              <ul className="ld-amenities">
                {listing.amenities.map((a) => (
                  <li key={a} className="ld-amenity">
                    <span className="ld-check">›</span>
                    <span>{a}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* RIGHT: Contact card */}
          <div className="ld-contact">
            <div className="ld-contact-card">
              <h3 className="ld-contact-title">Contact Landlord</h3>

              <div className="ld-landlord">
                <img
                  className="ld-avatar"
                  src={listing.landlord.avatar}
                  alt="Landlord"
                />
                <div className="ld-landlord-meta">
                  <div className="ld-landlord-name">{listing.landlord.name}</div>
                  <div className="ld-landlord-phone">{listing.landlord.phone}</div>
                </div>
              </div>

              <button className="ld-primary-btn" type="button">
                Send Message
              </button>
            </div>
          </div>
        </div>

        {/* Messages section */}
        <div className="ld-messages">
          <div className="ld-messages-header">
            <h3 className="ld-section-title">Message</h3>
          </div>

          <div className="ld-message-box">
            <textarea
              className="ld-textarea"
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write a message to the landlord..."
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
          </div>
        </div>
      </div>
    </div>
  );
}
