export default function Hero() {
  return (
    <section style={styles.hero}>
      <div style={styles.overlay}>
        <div style={styles.searchBox}>
          <select style={styles.input}>
            <option>Location</option>
          </select>

          <select style={styles.input}>
            <option>Category</option>
          </select>

          <select style={styles.input}>
            <option>Price Range</option>
          </select>

          <button style={styles.button}>Search</button>
        </div>
      </div>
    </section>
  );
}

const styles = {
  hero: {
    height: "350px",
    backgroundImage:
      "url('https://images.unsplash.com/photo-1502005229762-cf1b2da7c5d6')",
    backgroundSize: "cover",
    backgroundPosition: "center",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  overlay: {
    background: "rgba(0,0,0,0.3)",
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  searchBox: {
    background: "white",
    padding: "20px",
    borderRadius: "10px",
    display: "flex",
    gap: "10px",
    boxShadow: "0 4px 10px rgba(0,0,0,0.2)",
  },

  input: {
    padding: "10px",
    borderRadius: "5px",
    border: "1px solid #ccc",
  },

  button: {
    background: "#2563eb",
    color: "white",
    border: "none",
    padding: "10px 20px",
    borderRadius: "5px",
    cursor: "pointer",
  },
};
