import React, { useCallback, useEffect, useState } from "react";
import { Box, Button, Chip, CircularProgress, Dialog, FormControl, IconButton, InputLabel, MenuItem, Select, TextField, Typography } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import { useTranslation } from "react-i18next";
import UserAvatar from "./UserAvatar";
import session from "../app/Session";
import config from "../app/config";
import accountApi from "../app/AccountApi";
import subscriptionManager from "../app/SubscriptionManager";
import { maybeWithBearerAuth } from "../app/utils";

const statusOptions = [
  { key: "profile_status_available", fallback: "Verfuegbar" },
  { key: "profile_status_busy", fallback: "Beschaeftigt" },
  { key: "profile_status_dnd", fallback: "Nicht stoeren" },
  { key: "profile_status_away", fallback: "Abwesend" },
];

const OnlineIndicator = ({ lastSeen }) => {
  const { t } = useTranslation();
  const now = Math.floor(Date.now() / 1000);
  const diff = now - (lastSeen || 0);

  let color, label;
  if (lastSeen === 0 || diff > 900) {
    color = "#9CA3AF";
    label = t("profile_offline", "Offline");
  } else if (diff > 120) {
    color = "#FFD700";
    label = t("profile_recently", "Kuerzlich online");
  } else {
    color = "#22C55E";
    label = t("profile_online", "Online");
  }

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
      <Box sx={{
        width: 10,
        height: 10,
        borderRadius: "50%",
        backgroundColor: color,
        border: "2px solid var(--coop-black)",
        flexShrink: 0,
      }} />
      <Typography variant="body2" sx={{ color: "var(--coop-gray-500)" }}>
        {label}
      </Typography>
    </Box>
  );
};

const UserProfile = ({ open, onClose, username, initialEditMode = false }) => {
  const { t } = useTranslation();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(initialEditMode);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);
  const isOwnProfile = username === session.username();

  const fetchProfile = useCallback(async () => {
    if (!username || !open) return;
    setLoading(true);
    try {
      const url = isOwnProfile
        ? `${config.base_url}/v1/coop/profile`
        : `${config.base_url}/v1/coop/profile/${username}`;
      const headers = maybeWithBearerAuth({}, session.token());
      const response = await fetch(url, { headers });
      if (response.ok) {
        const data = await response.json();
        setProfile(data);
        setDisplayName(data.display_name || "");
        setBio(data.bio || "");
      }
    } catch (e) {
      console.warn("[UserProfile] Failed to load profile", e);
    } finally {
      setLoading(false);
    }
  }, [username, open, isOwnProfile]);

  useEffect(() => {
    fetchProfile();
    setEditMode(initialEditMode);
  }, [fetchProfile, initialEditMode]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const url = `${config.base_url}/v1/coop/profile`;
      const headers = {
        ...maybeWithBearerAuth({}, session.token()),
        "Content-Type": "application/json",
      };
      const response = await fetch(url, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ display_name: displayName, bio }),
      });
      if (response.ok) {
        const updated = await response.json();
        setProfile(updated);
        setEditMode(false);
      }
    } catch (e) {
      console.warn("[UserProfile] Failed to save profile", e);
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 512 * 1024) {
      alert(t("profile_avatar_too_large", "Bild zu gross (max. 512 KB)"));
      return;
    }
    const formData = new FormData();
    formData.append("file", file);
    try {
      const url = `${config.base_url}/v1/coop/profile/avatar`;
      const headers = maybeWithBearerAuth({}, session.token());
      const response = await fetch(url, { method: "PUT", headers, body: formData });
      if (response.ok) {
        fetchProfile();
      }
    } catch (e) {
      console.warn("[UserProfile] Avatar upload failed", e);
    }
  };

  const handleAvatarDelete = async () => {
    try {
      const url = `${config.base_url}/v1/coop/profile/avatar`;
      const headers = maybeWithBearerAuth({}, session.token());
      await fetch(url, { method: "DELETE", headers });
      fetchProfile();
    } catch (e) {
      console.warn("[UserProfile] Avatar delete failed", e);
    }
  };

  const [privacy, setPrivacy] = useState("request");
  const [contactAction, setContactAction] = useState(null); // null, "sent", "add"

  // Check contact status for non-own profiles
  useEffect(() => {
    if (isOwnProfile || !username || !open) return;
    const checkContact = async () => {
      try {
        const contacts = await accountApi.getContacts();
        const isContact = contacts.some((c) => c.username === username);
        setContactAction(isContact ? null : "add");
      } catch {
        setContactAction("add");
      }
    };
    checkContact();
  }, [username, open, isOwnProfile]);

  useEffect(() => {
    if (profile?.privacy) setPrivacy(profile.privacy);
  }, [profile]);

  const handleSendMessage = async () => {
    try {
      const result = await accountApi.startDM(username);
      const dmDisplayName = result.display_name || username;
      // Create local subscription with partner display name
      await subscriptionManager.add(config.base_url, result.topic, {
        displayName: dmDisplayName,
      });
      // Persist display name on server for sync across devices
      try {
        await accountApi.addSubscription(config.base_url, result.topic);
        await accountApi.updateSubscription(config.base_url, result.topic, { display_name: dmDisplayName });
      } catch (e) {
        // Non-critical - local displayName is sufficient
      }
      onClose();
      window.location.hash = `#/${result.topic}`;
    } catch (e) {
      console.warn("[UserProfile] Start DM failed", e);
    }
  };

  const handleAddContact = async () => {
    try {
      await accountApi.addContact(username);
      setContactAction("sent");
    } catch (e) {
      console.warn("[UserProfile] Add contact failed", e);
    }
  };

  const handlePrivacyChange = async (newPrivacy) => {
    setPrivacy(newPrivacy);
    try {
      await fetch(`${config.base_url}/v1/coop/profile`, {
        method: "PATCH",
        headers: {
          ...maybeWithBearerAuth({}, session.token()),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ privacy: newPrivacy }),
      });
    } catch (e) {
      console.warn("[UserProfile] Privacy update failed", e);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          border: "3px solid var(--coop-black)",
          borderRadius: 0,
          boxShadow: "8px 8px 0px var(--coop-shadow-color)",
          backgroundColor: "var(--coop-bg)",
          minWidth: 320,
          maxWidth: 400,
          p: 3,
        },
      }}
    >
      <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </Box>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
          <CircularProgress />
        </Box>
      ) : profile ? (
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1.5 }}>
          <Box sx={{ position: "relative" }}>
            <UserAvatar
              username={profile.username}
              displayName={profile.display_name}
              avatarUrl={profile.avatar_url}
              size="lg"
            />
            {isOwnProfile && (
              <Box sx={{ mt: 1, display: "flex", gap: 1, justifyContent: "center" }}>
                <Button
                  component="label"
                  size="small"
                  sx={{
                    border: "2px solid var(--coop-black)",
                    borderRadius: 0,
                    fontFamily: "'DM Sans', sans-serif",
                    textTransform: "none",
                    fontSize: "0.75rem",
                    py: 0.25,
                    px: 1,
                  }}
                >
                  {t("profile_avatar_change", "Aendern")}
                  <input type="file" hidden accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleAvatarUpload} />
                </Button>
                {profile.avatar_url && (
                  <Button
                    size="small"
                    onClick={handleAvatarDelete}
                    sx={{
                      border: "2px solid var(--coop-black)",
                      borderRadius: 0,
                      fontFamily: "'DM Sans', sans-serif",
                      textTransform: "none",
                      fontSize: "0.75rem",
                      py: 0.25,
                      px: 1,
                      color: "#EF4444",
                    }}
                  >
                    {t("profile_avatar_delete", "Loeschen")}
                  </Button>
                )}
              </Box>
            )}
          </Box>

          {isOwnProfile && editMode ? (
            <Box sx={{ width: "100%", display: "flex", flexDirection: "column", gap: 1.5 }}>
              <TextField
                label={t("profile_display_name", "Anzeigename")}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value.slice(0, 50))}
                fullWidth
                size="small"
                inputProps={{ maxLength: 50 }}
                sx={{ "& .MuiOutlinedInput-root": { borderRadius: 0 } }}
              />
              <TextField
                label={t("profile_bio", "Status")}
                value={bio}
                onChange={(e) => setBio(e.target.value.slice(0, 200))}
                fullWidth
                size="small"
                multiline
                maxRows={3}
                inputProps={{ maxLength: 200 }}
                sx={{ "& .MuiOutlinedInput-root": { borderRadius: 0 } }}
              />
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                {statusOptions.map((s) => (
                  <Chip
                    key={s.key}
                    label={t(s.key, s.fallback)}
                    size="small"
                    onClick={() => setBio(t(s.key, s.fallback))}
                    sx={{
                      borderRadius: 0,
                      border: "2px solid var(--coop-black)",
                      fontFamily: "'DM Sans', sans-serif",
                      cursor: "pointer",
                      "&:hover": { backgroundColor: "var(--coop-accent)" },
                    }}
                  />
                ))}
              </Box>
              <FormControl fullWidth size="small">
                <InputLabel>{t("profile_privacy_label", "Wer kann mich kontaktieren?")}</InputLabel>
                <Select
                  value={privacy}
                  label={t("profile_privacy_label", "Wer kann mich kontaktieren?")}
                  onChange={(e) => handlePrivacyChange(e.target.value)}
                  sx={{ borderRadius: 0 }}
                >
                  <MenuItem value="open">{t("profile_privacy_open", "Alle (offen)")}</MenuItem>
                  <MenuItem value="request">{t("profile_privacy_request", "Nur mit Anfrage")}</MenuItem>
                  <MenuItem value="invite_only">{t("profile_privacy_invite", "Nur per Einladung")}</MenuItem>
                </Select>
              </FormControl>
              <Button
                onClick={handleSave}
                disabled={saving}
                fullWidth
                sx={{
                  border: "3px solid var(--coop-black)",
                  borderRadius: 0,
                  boxShadow: "4px 4px 0px var(--coop-shadow-color)",
                  backgroundColor: "var(--coop-accent)",
                  color: "var(--coop-black)",
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  "&:hover": {
                    transform: "translate(-2px, -2px)",
                    boxShadow: "6px 6px 0px var(--coop-shadow-color)",
                    backgroundColor: "var(--coop-accent)",
                  },
                }}
              >
                {saving ? <CircularProgress size={20} /> : t("profile_save", "Profil speichern")}
              </Button>
            </Box>
          ) : (
            <>
              <Typography
                variant="h6"
                sx={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontWeight: 700,
                  textAlign: "center",
                }}
              >
                {profile.display_name || profile.username}
              </Typography>
              <Typography variant="body2" sx={{ color: "var(--coop-gray-500)" }}>
                @{profile.username}
              </Typography>
              {profile.bio && (
                <Typography variant="body2" sx={{ fontStyle: "italic", textAlign: "center" }}>
                  {profile.bio}
                </Typography>
              )}
              <OnlineIndicator lastSeen={profile.last_seen} />

              {isOwnProfile ? (
                <Button
                  onClick={() => setEditMode(true)}
                  fullWidth
                  sx={{
                    border: "3px solid var(--coop-black)",
                    borderRadius: 0,
                    boxShadow: "4px 4px 0px var(--coop-shadow-color)",
                    backgroundColor: "var(--coop-accent)",
                    color: "var(--coop-black)",
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    mt: 1,
                    "&:hover": {
                      transform: "translate(-2px, -2px)",
                      boxShadow: "6px 6px 0px var(--coop-shadow-color)",
                      backgroundColor: "var(--coop-accent)",
                    },
                  }}
                >
                  {t("profile_edit", "Profil bearbeiten")}
                </Button>
              ) : (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1, width: "100%", mt: 1 }}>
                  <Button
                    onClick={handleSendMessage}
                    fullWidth
                    sx={{
                      border: "3px solid var(--coop-black)",
                      borderRadius: 0,
                      boxShadow: "4px 4px 0px var(--coop-shadow-color)",
                      backgroundColor: "var(--coop-accent)",
                      color: "var(--coop-black)",
                      fontFamily: "'Space Grotesk', sans-serif",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      "&:hover": {
                        transform: "translate(-2px, -2px)",
                        boxShadow: "6px 6px 0px var(--coop-shadow-color)",
                        backgroundColor: "var(--coop-accent)",
                      },
                    }}
                  >
                    {t("profile_send_message", "Nachricht senden")}
                  </Button>
                  {contactAction === "add" && (
                    <Button
                      onClick={handleAddContact}
                      fullWidth
                      startIcon={<PersonAddIcon />}
                      sx={{
                        border: "2px solid var(--coop-black)",
                        borderRadius: 0,
                        boxShadow: "2px 2px 0px var(--coop-shadow-color)",
                        color: "var(--coop-black)",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        "&:hover": {
                          backgroundColor: "var(--coop-gray-100)",
                        },
                      }}
                    >
                      {t("profile_add_contact", "Als Kontakt hinzufuegen")}
                    </Button>
                  )}
                  {contactAction === "sent" && (
                    <Typography variant="body2" sx={{ textAlign: "center", color: "var(--coop-green)", fontWeight: 600 }}>
                      {t("profile_contact_sent", "Kontaktanfrage gesendet")}
                    </Typography>
                  )}
                </Box>
              )}
            </>
          )}
        </Box>
      ) : (
        <Typography sx={{ textAlign: "center", py: 2 }}>
          {t("profile_not_found", "Profil nicht gefunden")}
        </Typography>
      )}
    </Dialog>
  );
};

export { OnlineIndicator };
export default UserProfile;
