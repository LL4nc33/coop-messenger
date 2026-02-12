import React, { useCallback, useState } from "react";
import { Alert, Box, Button, CircularProgress, Dialog, IconButton, List, ListItemButton, ListItemText, TextField, Typography } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import CheckIcon from "@mui/icons-material/Check";
import { useTranslation } from "react-i18next";
import UserAvatar from "./UserAvatar";
import accountApi from "../app/AccountApi";

const ContactAdd = ({ open, onClose }) => {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [sentTo, setSentTo] = useState(new Set());
  const [error, setError] = useState("");

  const handleSearch = useCallback(async (q) => {
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    setError("");
    try {
      const data = await accountApi.searchUsers(q);
      setResults(data || []);
    } catch (e) {
      console.warn("[ContactAdd] Search failed", e);
      setError(t("contacts_search_error", "Suche fehlgeschlagen"));
    } finally {
      setSearching(false);
    }
  }, [t]);

  const handleQueryChange = (e) => {
    const q = e.target.value;
    setQuery(q);
    // Debounce: search after 300ms
    clearTimeout(handleQueryChange._timer);
    handleQueryChange._timer = setTimeout(() => handleSearch(q), 300);
  };

  const handleAdd = async (username) => {
    setError("");
    try {
      await accountApi.addContact(username);
      setSentTo((prev) => new Set([...prev, username]));
    } catch (e) {
      const msg = e.message || "";
      if (msg.includes("already exists")) {
        setError(t("contacts_already_exists", "Kontaktanfrage existiert bereits"));
      } else if (msg.includes("invite")) {
        setError(t("contacts_invite_only", "Dieser Benutzer akzeptiert nur Einladungen"));
      } else {
        setError(t("contacts_add_error", "Fehler beim Hinzufuegen"));
      }
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
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Typography variant="h6" sx={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700 }}>
          {t("contacts_add_title", "Kontakt hinzufuegen")}
        </Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </Box>

      <TextField
        fullWidth
        size="small"
        placeholder={t("contacts_search_placeholder", "Benutzername oder Name suchen...")}
        value={query}
        onChange={handleQueryChange}
        autoFocus
        sx={{ mb: 2, "& .MuiOutlinedInput-root": { borderRadius: 0 } }}
      />

      {error && (
        <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>
      )}

      {searching && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
          <CircularProgress size={24} />
        </Box>
      )}

      <List sx={{ p: 0, maxHeight: 300, overflow: "auto" }}>
        {results.map((user) => {
          const alreadySent = sentTo.has(user.username);
          return (
            <ListItemButton
              key={user.username}
              disabled={alreadySent}
              sx={{
                borderBottom: "1px solid var(--coop-gray-200)",
                py: 1,
                gap: 1,
              }}
            >
              <UserAvatar
                username={user.username}
                displayName={user.display_name}
                avatarUrl={user.avatar_url}
                size="sm"
              />
              <ListItemText
                primary={user.display_name || user.username}
                secondary={`@${user.username}`}
                primaryTypographyProps={{ sx: { fontWeight: 600, fontSize: "0.9rem" } }}
                secondaryTypographyProps={{ sx: { fontSize: "0.75rem", color: "var(--coop-gray-500)" } }}
              />
              {alreadySent ? (
                <CheckIcon sx={{ color: "var(--coop-green)", fontSize: 20 }} />
              ) : (
                <IconButton
                  size="small"
                  onClick={(e) => { e.stopPropagation(); handleAdd(user.username); }}
                  aria-label={t("contacts_add_button", "Hinzufuegen")}
                >
                  <PersonAddIcon sx={{ fontSize: 20 }} />
                </IconButton>
              )}
            </ListItemButton>
          );
        })}
        {!searching && query.length >= 2 && results.length === 0 && (
          <Box sx={{ p: 2, textAlign: "center" }}>
            <Typography variant="body2" sx={{ color: "var(--coop-gray-500)" }}>
              {t("contacts_search_empty", "Keine Benutzer gefunden")}
            </Typography>
          </Box>
        )}
      </List>
    </Dialog>
  );
};

export default ContactAdd;
