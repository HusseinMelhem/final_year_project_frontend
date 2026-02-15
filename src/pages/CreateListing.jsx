import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getToken } from "../services/Auth.service";
import { createListing, uploadListingPhoto } from "../services/Listings.service";
import { getCities } from "../services/Meta.service";
import "./CreateListing.css";

function getApiErrorMessage(err, fallback) {
  const data = err?.response?.data;
  if (data?.error) return data.error;

  const formErrors = Array.isArray(data?.formErrors) ? data.formErrors : [];
  if (formErrors.length > 0) return formErrors[0];

  const fieldErrors = data?.fieldErrors;
  if (fieldErrors && typeof fieldErrors === "object") {
    for (const messages of Object.values(fieldErrors)) {
      if (Array.isArray(messages) && messages.length > 0) {
        return messages[0];
      }
    }
  }

  return err?.message || fallback;
}

export default function CreateListing() {
  const navigate = useNavigate();
  const token = getToken();

  const [cities, setCities] = useState([]);
  const [loadingCities, setLoadingCities] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [photos, setPhotos] = useState([]);
  const [photoPreviews, setPhotoPreviews] = useState([]);
  const [form, setForm] = useState({
    cityId: "",
    title: "",
    description: "",
    roomType: "PRIVATE_ROOM",
    priceMonthly: "",
    currency: "USD",
    genderPreference: "ANY",
    addressText: "",
    approxLocation: "",
    availableFrom: "",
    latitude: "",
    longitude: "",
    googleMapsPlaceId: "",
    googleMapsUrl: ""
  });

  useEffect(() => {
    let cancelled = false;

    async function loadCities() {
      setLoadingCities(true);
      try {
        const items = await getCities();
        if (cancelled) return;
        setCities(items);
      } catch (err) {
        if (!cancelled) setError(err?.message || "Failed to load cities.");
      } finally {
        if (!cancelled) setLoadingCities(false);
      }
    }

    loadCities();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const next = photos.map((file) => ({ file, url: URL.createObjectURL(file) }));
    setPhotoPreviews(next);

    return () => {
      next.forEach((item) => URL.revokeObjectURL(item.url));
    };
  }, [photos]);

  const mapEmbedUrl = useMemo(() => {
    const lat = form.latitude === "" ? NaN : Number(form.latitude);
    const lng = form.longitude === "" ? NaN : Number(form.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return "";
    return `https://maps.google.com/maps?q=${lat},${lng}&z=14&output=embed`;
  }, [form.latitude, form.longitude]);

  function onChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function onPhotoChange(e) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setPhotos((prev) => [...prev, ...files]);
    e.target.value = "";
  }

  function removePhotoAt(index) {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  }

  function clearPhotos() {
    setPhotos([]);
  }

  function buildPayload() {
    const lat = form.latitude === "" ? null : Number(form.latitude);
    const lng = form.longitude === "" ? null : Number(form.longitude);
    if ((lat === null) !== (lng === null)) {
      throw new Error("Latitude and longitude must be provided together.");
    }
    if (lat !== null) {
      if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
        throw new Error("Latitude must be between -90 and 90.");
      }
      if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
        throw new Error("Longitude must be between -180 and 180.");
      }
    }

    const payload = {
      cityId: Number(form.cityId),
      title: form.title.trim(),
      description: form.description.trim(),
      roomType: form.roomType,
      priceMonthly: Number(form.priceMonthly),
      currency: form.currency,
      genderPreference: form.genderPreference
    };

    if (!payload.cityId) throw new Error("Please select a city.");
    if (!payload.title) throw new Error("Title is required.");
    if (!payload.description) throw new Error("Description is required.");
    if (!payload.priceMonthly || Number.isNaN(payload.priceMonthly)) {
      throw new Error("Price must be a valid number.");
    }
    if (payload.description.length < 20) {
      throw new Error("Description must be at least 20 characters.");
    }

    if (form.addressText.trim()) payload.addressText = form.addressText.trim();
    if (form.approxLocation.trim()) payload.approxLocation = form.approxLocation.trim();
    if (form.availableFrom) payload.availableFrom = form.availableFrom;
    if (lat !== null && lng !== null) {
      payload.latitude = lat;
      payload.longitude = lng;
    }
    if (form.googleMapsPlaceId.trim()) payload.googleMapsPlaceId = form.googleMapsPlaceId.trim();
    if (form.googleMapsUrl.trim()) payload.googleMapsUrl = form.googleMapsUrl.trim();

    return payload;
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!token) {
      navigate("/auth");
      return;
    }

    setSubmitting(true);
    try {
      const payload = buildPayload();
      const created = await createListing(payload);

      if (photos.length > 0) {
        for (let i = 0; i < photos.length; i += 1) {
          await uploadListingPhoto(created.id, photos[i], i);
        }
      }

      setSuccess("Listing created successfully.");
      setTimeout(() => navigate("/dashboard"), 900);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to create listing."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="cl-page">
      <div className="cl-container">
        <div className="cl-header">
          <h1>Create Listing</h1>
          <p>Create a new listing with photos and map location details.</p>
        </div>

        {error ? <div className="cl-alert error">{error}</div> : null}
        {success ? (
          <div className="cl-alert success">
            {success}{" "}
            <Link to="/dashboard" className="cl-inline-link">
              Open dashboard
            </Link>
          </div>
        ) : null}

        <form className="cl-card" onSubmit={onSubmit}>
          <div className="cl-grid">
            <label>
              City
              <select name="cityId" value={form.cityId} onChange={onChange} required disabled={loadingCities}>
                <option value="">{loadingCities ? "Loading cities..." : "Select city"}</option>
                {cities.map((city) => (
                  <option key={city.id} value={city.id}>
                    {city.name} ({city.country_code})
                  </option>
                ))}
              </select>
            </label>

            <label>
              Room Type
              <select name="roomType" value={form.roomType} onChange={onChange}>
                <option value="WHOLE_APT">WHOLE_APT</option>
                <option value="PRIVATE_ROOM">PRIVATE_ROOM</option>
                <option value="SHARED_ROOM">SHARED_ROOM</option>
                <option value="STUDIO">STUDIO</option>
              </select>
            </label>

            <label>
              Price Monthly
              <input
                type="number"
                min={1}
                name="priceMonthly"
                value={form.priceMonthly}
                onChange={onChange}
                required
              />
            </label>

            <label>
              Currency
              <select name="currency" value={form.currency} onChange={onChange}>
                <option value="USD">USD</option>
                <option value="LBP">LBP</option>
                <option value="EUR">EUR</option>
              </select>
            </label>

            <label className="cl-span-2">
              Title
              <input name="title" value={form.title} onChange={onChange} required minLength={5} maxLength={80} />
            </label>

            <label className="cl-span-2">
              Description
              <textarea
                name="description"
                value={form.description}
                onChange={onChange}
                rows={4}
                required
                minLength={20}
              />
            </label>

            <label>
              Address Text
              <input name="addressText" value={form.addressText} onChange={onChange} />
            </label>

            <label>
              Approx Location
              <input name="approxLocation" value={form.approxLocation} onChange={onChange} />
            </label>

            <label>
              Available From
              <input type="date" name="availableFrom" value={form.availableFrom} onChange={onChange} />
            </label>

            <label>
              Gender Preference
              <select name="genderPreference" value={form.genderPreference} onChange={onChange}>
                <option value="ANY">ANY</option>
                <option value="MALE_ONLY">MALE_ONLY</option>
                <option value="FEMALE_ONLY">FEMALE_ONLY</option>
                <option value="SAME_AS_ME">SAME_AS_ME</option>
              </select>
            </label>

            <label>
              Latitude
              <input
                type="number"
                step="any"
                min={-90}
                max={90}
                name="latitude"
                value={form.latitude}
                onChange={onChange}
              />
            </label>

            <label>
              Longitude
              <input
                type="number"
                step="any"
                min={-180}
                max={180}
                name="longitude"
                value={form.longitude}
                onChange={onChange}
              />
            </label>

            <label className="cl-span-2">
              Google Maps URL
              <input name="googleMapsUrl" value={form.googleMapsUrl} onChange={onChange} />
            </label>

            <label className="cl-span-2">
              Google Place ID
              <input name="googleMapsPlaceId" value={form.googleMapsPlaceId} onChange={onChange} />
            </label>

            <label className="cl-span-2">
              Listing Photos (can select multiple)
              <input type="file" accept="image/*" multiple onChange={onPhotoChange} />
            </label>

            {photos.length > 0 ? (
              <div className="cl-photo-preview cl-span-2">
                <div className="cl-photo-preview-top">
                  <strong>{photos.length} photo{photos.length > 1 ? "s" : ""} selected</strong>
                  <button type="button" className="cl-mini-btn" onClick={clearPhotos}>
                    Clear all
                  </button>
                </div>
                <div className="cl-photo-grid">
                  {photoPreviews.map((item, idx) => (
                    <div key={`${item.file.name}-${idx}`} className="cl-photo-item">
                      <img src={item.url} alt={item.file.name || `photo-${idx + 1}`} />
                      <button
                        type="button"
                        className="cl-mini-btn danger"
                        onClick={() => removePhotoAt(idx)}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          {mapEmbedUrl ? (
            <iframe
              title="Listing map preview"
              className="cl-map"
              src={mapEmbedUrl}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          ) : (
            <div className="cl-map-empty">Add latitude and longitude to preview map.</div>
          )}

          <div className="cl-actions">
            <button type="button" className="cl-btn ghost" onClick={() => navigate("/dashboard")}>
              Cancel
            </button>
            <button type="submit" className="cl-btn primary" disabled={submitting}>
              {submitting ? "Creating..." : "Create Listing"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
