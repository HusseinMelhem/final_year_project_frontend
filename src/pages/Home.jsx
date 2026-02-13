import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getListings } from "../services/Listings.service";
import "./Home.css";

export default function Home() {
  const navigate = useNavigate();

  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  // filters (UI only for now)
  const [location, setLocation] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  const [sort, setSort] = useState("");

  useEffect(() => {
    const fetchListings = async () => {
      try {
        setLoading(true);
        const items = await getListings();
        console.log("FRONTEND DATA:", items);
        setListings(items || []);
      } catch (error) {
        console.error("Error fetching listings:", error);
        setListings([]);
      } finally {
        setLoading(false);
      }
    };

    fetchListings();
  }, []);

  // ✅ Optional: basic client-side filtering/sorting (works even before backend supports query params)
  const filteredListings = useMemo(() => {
    let arr = [...listings];

    // Location filter (depends on your API field names)
    if (location) {
      arr = arr.filter((x) =>
        String(x.city || x.location || "").toLowerCase().includes(location.toLowerCase())
      );
    }

    // Category filter
    if (category) {
      arr = arr.filter((x) =>
        String(x.category || x.type || "").toLowerCase().includes(category.toLowerCase())
      );
    }

    // Price filter
    const priceNum = (x) => Number(x.price ?? x.monthlyPrice ?? 0);
    if (price === "0-1000") arr = arr.filter((x) => priceNum(x) <= 1000);
    if (price === "1000-2000") arr = arr.filter((x) => priceNum(x) >= 1000 && priceNum(x) <= 2000);
    if (price === "2000-5000") arr = arr.filter((x) => priceNum(x) >= 2000 && priceNum(x) <= 5000);
    if (price === "5000+") arr = arr.filter((x) => priceNum(x) >= 5000);

    // Sort
    if (sort === "price_asc") arr.sort((a, b) => priceNum(a) - priceNum(b));
    if (sort === "price_desc") arr.sort((a, b) => priceNum(b) - priceNum(a));

    // If you have createdAt field, enable newest:
    if (sort === "newest") {
      arr.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    }

    return arr;
  }, [listings, location, category, price, sort]);

  function onSearch() {
    // Right now filtering is live via useMemo, so Search can just scroll.
    // Later: call getListings({location, category, price, sort}) with query params.
    const el = document.getElementById("featured");
    el?.scrollIntoView({ behavior: "smooth" });
  }

  // Map your API listing object to UI fields safely
  function uiTitle(x) {
    return x.title || x.name || x.listingTitle || "Untitled Listing";
  }
  function uiLocation(x) {
    return x.city || x.location || x.addressCity || "Unknown";
  }
  function uiPrice(x) {
    const val = Number(x.price ?? x.monthlyPrice ?? 0);
    return isNaN(val) ? 0 : val;
  }
  function uiImage(x) {
    // support many possible shapes
    if (x.imageUrl) return x.imageUrl;
    if (Array.isArray(x.images) && x.images.length > 0) return x.images[0];
    if (Array.isArray(x.photos) && x.photos.length > 0) return x.photos[0]?.url || x.photos[0];
    return "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=1200&fit=crop";
  }
  function uiId(x) {
    return x.id || x._id || x.listingId;
  }

  return (
    <div className="home-page">
      {/* HERO */}
      <section className="home-hero">
        <div className="home-hero-overlay" />

        <div className="home-search-card">
          <div className="home-filters">
            <div className="home-select">
              <select value={location} onChange={(e) => setLocation(e.target.value)}>
                <option value="">Location</option>
                <option value="New York">New York</option>
                <option value="Paris">Paris</option>
                <option value="Beirut">Beirut</option>
              </select>
            </div>

            <div className="home-select">
              <select value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="">Category</option>
                <option value="Apartment">Apartment</option>
                <option value="House">House</option>
                <option value="Condo">Condo</option>
              </select>
            </div>

            <div className="home-select">
              <select value={price} onChange={(e) => setPrice(e.target.value)}>
                <option value="">Price Range</option>
                <option value="0-1000">$0 - $1,000</option>
                <option value="1000-2000">$1,000 - $2,000</option>
                <option value="2000-5000">$2,000 - $5,000</option>
                <option value="5000+">$5,000+</option>
              </select>
            </div>

            <div className="home-select">
              <select value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="">Sort...</option>
                <option value="newest">Newest</option>
                <option value="price_asc">Price: Low → High</option>
                <option value="price_desc">Price: High → Low</option>
              </select>
            </div>

            <button className="home-search-btn" onClick={onSearch}>
              Search
            </button>
          </div>
        </div>
      </section>

      {/* FEATURED */}
      <section id="featured" className="home-section">
        <div className="home-container">
          <h2 className="home-title">Featured Listings</h2>

          {loading ? (
            <div className="home-empty">Loading...</div>
          ) : filteredListings.length === 0 ? (
            <div className="home-empty">No listings yet</div>
          ) : (
            <div className="home-grid">
              {filteredListings.map((x) => {
                const id = uiId(x);
                return (
                  <button
                    key={id}
                    className="home-card"
                    onClick={() => navigate(`/listing/${id}`)}
                  >
                    <img className="home-card-img" src={uiImage(x)} alt="" />
                    <div className="home-card-body">
                      <div className="home-card-title">{uiTitle(x)}</div>
                      <div className="home-card-loc">📍 {uiLocation(x)}</div>
                      <div className="home-card-price">
                        <span className="home-price">${uiPrice(x).toLocaleString()}</span>
                        <span className="home-month"> / month</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
