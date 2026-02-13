import { Link } from "react-router-dom";

export default function ListingCard({ listing }) {
  return (
    <Link
      to={`/listing/${listing.id}`}
      style={{ textDecoration: "none", color: "inherit" }}
    >
      <div style={styles.card}>
        {/* Image from backend */}
        <img
          src={listing.image || "https://via.placeholder.com/300"}
          alt={listing.title}
          style={styles.image}
        />

        <div style={styles.content}>
          <h3>{listing.title}</h3>

          <p style={styles.price}>
            ${listing.price_monthly}
          </p>

          <p style={styles.location}>
            {listing.city}
          </p>
        </div>
      </div>
    </Link>
  );
}

const styles = {
  card: {
    background: "white",
    borderRadius: "10px",
    overflow: "hidden",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
  },

  image: {
    width: "100%",
    height: "180px",
    objectFit: "cover",
  },

  content: {
    padding: "15px",
  },

  price: {
    color: "#2563eb",
    fontWeight: "bold",
  },

  location: {
    color: "#6b7280",
    fontSize: "14px",
  },
};
