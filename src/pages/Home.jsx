import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getListings } from "../services/Listings.service";
import { getCities } from "../services/Meta.service";
import "./Home.css";

export default function Home() {
  const navigate = useNavigate();
  const [listings, setListings] = useState([]);
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [query, setQuery] = useState("");
  const [cityId, setCityId] = useState("");
  const [roomType, setRoomType] = useState("");
  const [priceRange, setPriceRange] = useState("");
  const [sort, setSort] = useState("newest");

  function parsePriceRange(value) {
    if (value === "0-1000") return { minPrice: 0, maxPrice: 1000 };
    if (value === "1000-2000") return { minPrice: 1000, maxPrice: 2000 };
    if (value === "2000-5000") return { minPrice: 2000, maxPrice: 5000 };
    if (value === "5000+") return { minPrice: 5000 };
    return {};
  }

  async function loadListings(next = {}) {
    const filters = {
      query: next.query ?? query,
      cityId: next.cityId ?? cityId,
      roomType: next.roomType ?? roomType,
      sort: next.sort ?? sort,
      ...parsePriceRange(next.priceRange ?? priceRange),
    };

    try {
      setLoading(true);
      setError("");
      const items = await getListings(filters);
      setListings(items || []);
    } catch (err) {
      console.error("Error fetching listings:", err);
      setListings([]);
      setError(err?.response?.data?.error || err?.message || "Failed to load listings.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      try {
        const cityRows = await getCities();
        if (!cancelled) setCities(cityRows || []);
      } catch {
        if (!cancelled) setCities([]);
      }

      try {
        setLoading(true);
        setError("");
        const items = await getListings({ sort: "newest" });
        if (!cancelled) setListings(items || []);
      } catch (err) {
        if (!cancelled) {
          setListings([]);
          setError(err?.response?.data?.error || err?.message || "Failed to load listings.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    boot();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSearch() {
    await loadListings();
    const el = document.getElementById("featured");
    el?.scrollIntoView({ behavior: "smooth" });
  }

  function uiTitle(x) {
    return x.title || x.name || x.listingTitle || "Untitled Listing";
  }

  function uiLocation(x) {
    return x.city || x.location || x.addressCity || "Unknown";
  }

  function uiPrice(x) {
    const val = Number(x.price ?? x.monthlyPrice ?? x.price_monthly ?? 0);
    return Number.isNaN(val) ? 0 : val;
  }

  function uiImage(x) {
    if (x.photo_url) return x.photo_url;
    if (x.imageUrl) return x.imageUrl;
    if (Array.isArray(x.images) && x.images.length > 0) return x.images[0];
    if (Array.isArray(x.photos) && x.photos.length > 0) return x.photos[0]?.url || x.photos[0];
    return "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=1200&fit=crop";
  }

  function uiId(x) {
    return x.id || x._id || x.listingId;
  }

  function uiOwner(x) {
    const name = x?.owner?.displayName || x?.owner_display_name || "Listing Owner";
    const avatar =
      x?.owner?.avatarUrl ||
      x?.owner_avatar_url ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=EAF0FF&color=1D4ED8`;

    return { name, avatar };
  }

  function onSearchSubmit(e) {
    e.preventDefault();
    onSearch();
  }

  return (
    <div className="home-page">
      <section className="home-hero">
        <div className="home-hero-overlay" />

        <form className="home-search-card" onSubmit={onSearchSubmit}>
          <div className="home-filters">
            <div className="home-input">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by title, city, address..."
              />
            </div>

            <div className="home-select">
              <select value={cityId} onChange={(e) => setCityId(e.target.value)}>
                <option value="">All Cities</option>
                {cities.map((city) => (
                  <option key={city.id} value={city.id}>
                    {city.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="home-select">
              <select value={roomType} onChange={(e) => setRoomType(e.target.value)}>
                <option value="">All Room Types</option>
                <option value="WHOLE_APT">Whole Apartment</option>
                <option value="PRIVATE_ROOM">Private Room</option>
                <option value="SHARED_ROOM">Shared Room</option>
                <option value="STUDIO">Studio</option>
              </select>
            </div>

            <div className="home-select">
              <select value={priceRange} onChange={(e) => setPriceRange(e.target.value)}>
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
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
              </select>
            </div>

            <button className="home-search-btn" type="submit">
              Search
            </button>
          </div>
        </form>
      </section>

      <section id="featured" className="home-section">
        <div className="home-container">
          <h2 className="home-title">Featured Listings</h2>
          {error ? <div className="home-empty">{error}</div> : null}

          {loading ? (
            <div className="home-empty">Loading...</div>
          ) : listings.length === 0 ? (
            <div className="home-empty">No listings found for the selected search.</div>
          ) : (
            <div className="home-grid">
              {listings.map((x) => {
                const id = uiId(x);
                const owner = uiOwner(x);
                return (
                  <button key={id} className="home-card" onClick={() => navigate(`/listing/${id}`)}>
                    <img className="home-card-img" src={uiImage(x)} alt="" />
                    <div className="home-card-body">
                      <div className="home-owner-row">
                        <img className="home-owner-avatar" src={owner.avatar} alt={owner.name} />
                        <div className="home-owner-name">{owner.name}</div>
                      </div>
                      <div className="home-card-title">{uiTitle(x)}</div>
                      <div className="home-card-loc">Location: {uiLocation(x)}</div>
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
