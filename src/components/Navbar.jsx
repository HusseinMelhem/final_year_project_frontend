import { Link } from "react-router-dom";

export default function Navbar() {
  return (
    <nav style={styles.nav}>
      <h2 style={styles.logo}>RentMate</h2>

      <div style={styles.links}>
        <Link to="/" style={styles.link}>
          Browse Listings
        </Link>
        <Link to="/messages" style={styles.link}>
          Messages
        </Link>
        <Link to="/dashboard" style={styles.link}>
          Dashboard
        </Link>
        <Link to="/login" style={styles.login}>
          Login / Sign Up
        </Link>
      </div>
    </nav>
  );
}

const styles = {
  nav: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "15px 40px",
    background: "white",
    borderBottom: "1px solid #e5e7eb",
  },

  logo: {
    margin: 0,
    color: "#04215f", 
    fontWeight: "bold",
  },

  links: {
    display: "flex",
    gap: "70px",
  },

  link: {
    textDecoration: "none",
    color: "#374151",
    fontWeight: "500",
  },

  login: {
    textDecoration: "none",
    color: "#2563eb", // blue
    fontWeight: "600",
  },
};
