import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { fetchMyAccount, getToken, updateMyProfile, uploadMyProfilePhoto } from "../services/Auth.service";
import "./Profile.css";

export default function Profile() {
  const navigate = useNavigate();
  const token = getToken();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [account, setAccount] = useState(null);
  const [form, setForm] = useState({
    displayName: "",
    bio: "",
    budgetMin: "",
    budgetMax: "",
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
        const data = await fetchMyAccount();
        if (cancelled) return;

        setAccount(data);
        setForm({
          displayName: data?.profile?.displayName || "",
          bio: data?.profile?.bio || "",
          budgetMin: data?.profile?.budgetMin ?? "",
          budgetMax: data?.profile?.budgetMax ?? "",
        });
      } catch (err) {
        if (!cancelled) setError(err?.message || "Failed to load profile.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [navigate, token]);

  function onChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function onSave(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        displayName: form.displayName.trim(),
        bio: form.bio.trim() || null,
        budgetMin: form.budgetMin === "" ? null : Number(form.budgetMin),
        budgetMax: form.budgetMax === "" ? null : Number(form.budgetMax),
      };

      const result = await updateMyProfile(payload);
      setSuccess("Profile updated.");
      setAccount((prev) => ({ ...prev, profile: result.profile }));
    } catch (err) {
      setError(err?.message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  }

  async function onPhotoChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPhoto(true);
    setError("");
    setSuccess("");

    try {
      const uploaded = await uploadMyProfilePhoto(file);
      setAccount((prev) => ({
        ...prev,
        profile: { ...(prev?.profile || {}), avatarUrl: uploaded.avatarUrl }
      }));
      setSuccess("Profile photo updated.");
    } catch (err) {
      setError(err?.message || "Failed to upload profile photo.");
    } finally {
      setUploadingPhoto(false);
      e.target.value = "";
    }
  }

  if (loading) {
    return (
      <div className="pf-page">
        <div className="pf-container">
          <div className="pf-card">Loading profile...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="pf-page">
      <div className="pf-container">
        <div className="pf-grid">
          <section className="pf-card">
            <h2 className="pf-title">My Profile</h2>

            {error ? <div className="pf-error">{error}</div> : null}
            {success ? <div className="pf-success">{success}</div> : null}

            <form className="pf-form" onSubmit={onSave}>
              <div className="pf-avatar-row">
                <img
                  className="pf-avatar"
                  src={
                    account?.profile?.avatarUrl ||
                    "https://ui-avatars.com/api/?name=User&background=EAF0FF&color=1D4ED8"
                  }
                  alt="Profile"
                />
                <label className="pf-upload-label">
                  {uploadingPhoto ? "Uploading..." : "Upload Profile Photo"}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={onPhotoChange}
                    disabled={uploadingPhoto}
                  />
                </label>
              </div>

              <label>
                Display name
                <input
                  name="displayName"
                  value={form.displayName}
                  onChange={onChange}
                  minLength={2}
                  maxLength={80}
                  required
                />
              </label>

              <label>
                Bio
                <textarea
                  name="bio"
                  value={form.bio}
                  onChange={onChange}
                  rows={4}
                  placeholder="Tell others about your housing preferences."
                />
              </label>

              <div className="pf-budget-grid">
                <label>
                  Budget Min
                  <input
                    name="budgetMin"
                    value={form.budgetMin}
                    onChange={onChange}
                    type="number"
                    min={0}
                  />
                </label>

                <label>
                  Budget Max
                  <input
                    name="budgetMax"
                    value={form.budgetMax}
                    onChange={onChange}
                    type="number"
                    min={0}
                  />
                </label>
              </div>

              <button className="pf-save-btn" type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save Profile"}
              </button>
            </form>
          </section>

          <aside className="pf-card">
            <h2 className="pf-title">Account</h2>
            <div className="pf-meta-row">
              <span>Email</span>
              <strong>{account?.user?.email}</strong>
            </div>
            <div className="pf-meta-row">
              <span>Role</span>
              <strong>{account?.user?.role}</strong>
            </div>
            <div className="pf-meta-row">
              <span>Status</span>
              <strong>{account?.user?.status}</strong>
            </div>

            <div className="pf-links">
              <Link className="pf-link-btn" to="/dashboard">
                Manage Listings
              </Link>
              <Link className="pf-link-btn secondary" to="/messages">
                Open Messages
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
