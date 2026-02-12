import React, { useEffect, useState, lazy, Suspense } from "react";
import { Badge, Box, Button, Drawer, IconButton, List, ListItemButton, ListItemText, Tab, Tabs, Typography } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import { useTranslation } from "react-i18next";
import UserAvatar from "./UserAvatar";
import { OnlineIndicator } from "./UserProfile";
import accountApi from "../app/AccountApi";
import subscriptionManager from "../app/SubscriptionManager";
import config from "../app/config";

const ContactAdd = lazy(() => import("./ContactAdd"));
const ContactRequests = lazy(() => import("./ContactRequests"));
const UserProfile = lazy(() => import("./UserProfile"));

const ContactList = ({ open, onClose, onStartDM }) => {
  const { t } = useTranslation();
  const [contacts, setContacts] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(0);
  const [addOpen, setAddOpen] = useState(false);
  const [profileUser, setProfileUser] = useState(null);

  const fetchData = async () => {
    if (!open) return;
    setLoading(true);
    try {
      const [contactsData, requestsData] = await Promise.all([
        accountApi.getContacts(),
        accountApi.getContactRequests(),
      ]);
      setContacts(contactsData || []);
      setRequests(requestsData || []);
    } catch (e) {
      console.warn("[ContactList] Failed to load", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [open]);

  const handleAccept = async (username) => {
    try {
      await accountApi.acceptContact(username);
      fetchData();
    } catch (e) {
      console.warn("[ContactList] Accept failed", e);
    }
  };

  const handleReject = async (username) => {
    try {
      await accountApi.rejectContact(username);
      fetchData();
    } catch (e) {
      console.warn("[ContactList] Reject failed", e);
    }
  };

  const handleRemove = async (username) => {
    try {
      await accountApi.removeContact(username);
      fetchData();
    } catch (e) {
      console.warn("[ContactList] Remove failed", e);
    }
  };

  const handleDM = async (username) => {
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
        // Non-critical
      }
      onStartDM?.(result.topic);
      onClose();
    } catch (e) {
      console.warn("[ContactList] Start DM failed", e);
    }
  };

  return (
    <>
      <Drawer
        anchor="right"
        open={open}
        onClose={onClose}
        PaperProps={{
          sx: {
            width: 320,
            border: "3px solid var(--coop-black)",
            borderRadius: 0,
            backgroundColor: "var(--coop-bg)",
            boxShadow: "-6px 0 0px var(--coop-black)",
          },
        }}
      >
        <Box sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          p: 2,
          borderBottom: "3px solid var(--coop-black)",
        }}>
          <Typography variant="h6" sx={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700 }}>
            {t("contacts_title", "Kontakte")}
          </Typography>
          <Box>
            <IconButton onClick={() => setAddOpen(true)} size="small" aria-label={t("contacts_add", "Kontakt hinzufuegen")}>
              <PersonAddIcon />
            </IconButton>
            <IconButton onClick={onClose} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </Box>

        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="fullWidth"
          sx={{ borderBottom: "2px solid var(--coop-gray-200)" }}
        >
          <Tab label={t("contacts_tab_all", "Alle")} />
          <Tab label={
            <Badge badgeContent={requests.length} color="error" sx={{ "& .MuiBadge-badge": { fontSize: "0.65rem" } }}>
              {t("contacts_tab_requests", "Anfragen")}
            </Badge>
          } />
        </Tabs>

        {tab === 0 && (
          <List sx={{ p: 0 }}>
            {contacts.map((contact) => (
              <ListItemButton
                key={contact.username}
                onClick={() => handleDM(contact.username)}
                sx={{
                  borderBottom: "2px solid var(--coop-gray-200)",
                  py: 1.5,
                  px: 2,
                  gap: 1.5,
                  transition: "transform 0.15s ease",
                  "&:hover": { transform: "translateX(4px)" },
                }}
              >
                <UserAvatar
                  username={contact.username}
                  displayName={contact.display_name}
                  avatarUrl={contact.avatar_url}
                  size="md"
                />
                <ListItemText
                  primary={contact.display_name || contact.username}
                  secondary={contact.bio || `@${contact.username}`}
                  primaryTypographyProps={{ sx: { fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: "0.9rem" } }}
                  secondaryTypographyProps={{ sx: { fontSize: "0.75rem", color: "var(--coop-gray-500)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }}
                />
                <OnlineIndicator lastSeen={contact.last_seen} />
              </ListItemButton>
            ))}
            {!loading && contacts.length === 0 && (
              <Box sx={{ p: 3, textAlign: "center" }}>
                <Typography variant="body2" sx={{ color: "var(--coop-gray-500)", mb: 2 }}>
                  {t("contacts_empty", "Noch keine Kontakte")}
                </Typography>
                <Button
                  onClick={() => setAddOpen(true)}
                  startIcon={<PersonAddIcon />}
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
                  {t("contacts_add", "Kontakt hinzufuegen")}
                </Button>
              </Box>
            )}
          </List>
        )}

        {tab === 1 && (
          <Suspense fallback={null}>
            <ContactRequests
              requests={requests}
              onAccept={handleAccept}
              onReject={handleReject}
            />
          </Suspense>
        )}
      </Drawer>

      {addOpen && (
        <Suspense fallback={null}>
          <ContactAdd
            open={addOpen}
            onClose={() => { setAddOpen(false); fetchData(); }}
          />
        </Suspense>
      )}

      {profileUser && (
        <Suspense fallback={null}>
          <UserProfile
            open={!!profileUser}
            onClose={() => setProfileUser(null)}
            username={profileUser}
          />
        </Suspense>
      )}
    </>
  );
};

export default ContactList;
