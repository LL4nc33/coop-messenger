import React, { useEffect, useState } from "react";
import { Box, Button, Checkbox, CircularProgress, Dialog, IconButton, List, ListItemButton, ListItemText, TextField, Typography } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import GroupAddIcon from "@mui/icons-material/GroupAdd";
import { useTranslation } from "react-i18next";
import UserAvatar from "./UserAvatar";
import accountApi from "../app/AccountApi";
import subscriptionManager from "../app/SubscriptionManager";
import config from "../app/config";

const GroupCreate = ({ open, onClose, onCreated }) => {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [contacts, setContacts] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    const fetchContacts = async () => {
      setLoading(true);
      try {
        const data = await accountApi.getContacts();
        setContacts(data || []);
      } catch (e) {
        console.warn("[GroupCreate] Failed to load contacts", e);
      } finally {
        setLoading(false);
      }
    };
    fetchContacts();
  }, [open]);

  const toggleMember = (username) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(username)) {
        next.delete(username);
      } else {
        next.add(username);
      }
      return next;
    });
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      setError(t("group_name_required", "Gruppenname erforderlich"));
      return;
    }
    if (selected.size === 0) {
      setError(t("group_members_required", "Mindestens ein Mitglied auswaehlen"));
      return;
    }
    setCreating(true);
    setError("");
    try {
      const groupName = name.trim();
      const result = await accountApi.createGroup(groupName, [...selected]);
      // Create local subscription with group name as display name
      await subscriptionManager.add(config.base_url, result.topic, {
        displayName: groupName,
      });
      // Persist display name on server for sync
      try {
        await accountApi.addSubscription(config.base_url, result.topic);
        await accountApi.updateSubscription(config.base_url, result.topic, { display_name: groupName });
      } catch (e) {
        // Non-critical
      }
      onCreated?.(result.topic);
      onClose();
    } catch (e) {
      setError(t("group_create_error", "Fehler beim Erstellen der Gruppe"));
    } finally {
      setCreating(false);
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
          {t("group_create_title", "Neue Gruppe")}
        </Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </Box>

      <TextField
        fullWidth
        size="small"
        label={t("group_name_label", "Gruppenname")}
        value={name}
        onChange={(e) => setName(e.target.value.slice(0, 50))}
        inputProps={{ maxLength: 50 }}
        sx={{ mb: 2, "& .MuiOutlinedInput-root": { borderRadius: 0 } }}
      />

      <Typography variant="body2" sx={{ fontWeight: 700, mb: 1, color: "var(--coop-gray-500)" }}>
        {t("group_select_members", "Mitglieder auswaehlen")} ({selected.size})
      </Typography>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
          <CircularProgress size={24} />
        </Box>
      ) : (
        <List sx={{ p: 0, maxHeight: 250, overflow: "auto", border: "2px solid var(--coop-gray-200)", mb: 2 }}>
          {contacts.map((contact) => (
            <ListItemButton
              key={contact.username}
              onClick={() => toggleMember(contact.username)}
              selected={selected.has(contact.username)}
              sx={{
                borderBottom: "1px solid var(--coop-gray-200)",
                py: 1,
                gap: 1,
              }}
            >
              <Checkbox
                checked={selected.has(contact.username)}
                size="small"
                sx={{ p: 0 }}
              />
              <UserAvatar
                username={contact.username}
                displayName={contact.display_name}
                avatarUrl={contact.avatar_url}
                size="sm"
              />
              <ListItemText
                primary={contact.display_name || contact.username}
                primaryTypographyProps={{ sx: { fontWeight: 600, fontSize: "0.85rem" } }}
              />
            </ListItemButton>
          ))}
          {contacts.length === 0 && (
            <Box sx={{ p: 2, textAlign: "center" }}>
              <Typography variant="body2" sx={{ color: "var(--coop-gray-500)" }}>
                {t("group_no_contacts", "Keine Kontakte vorhanden")}
              </Typography>
            </Box>
          )}
        </List>
      )}

      {error && (
        <Typography variant="body2" sx={{ color: "var(--coop-red)", mb: 1 }}>
          {error}
        </Typography>
      )}

      <Button
        fullWidth
        disabled={creating || !name.trim() || selected.size === 0}
        onClick={handleCreate}
        startIcon={creating ? <CircularProgress size={18} /> : <GroupAddIcon />}
        sx={{
          border: "3px solid var(--coop-black)",
          borderRadius: 0,
          boxShadow: "var(--coop-shadow)",
          backgroundColor: "var(--coop-accent)",
          color: "var(--coop-black)",
          fontFamily: "'Space Grotesk', sans-serif",
          fontWeight: 700,
          textTransform: "uppercase",
          "&:hover": {
            transform: "translate(-2px, -2px)",
            boxShadow: "var(--coop-shadow-hover)",
            backgroundColor: "var(--coop-accent)",
          },
          "&:active": {
            boxShadow: "none",
            transform: "translate(2px, 2px)",
          },
        }}
      >
        {t("group_create_button", "Gruppe erstellen")}
      </Button>
    </Dialog>
  );
};

export default GroupCreate;
