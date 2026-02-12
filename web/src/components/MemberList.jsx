import React, { useEffect, useState } from "react";
import { Box, Drawer, IconButton, List, ListItemButton, ListItemText, Typography } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useTranslation } from "react-i18next";
import UserAvatar from "./UserAvatar";
import UserProfile from "./UserProfile";
import { OnlineIndicator } from "./UserProfile";
import session from "../app/Session";
import config from "../app/config";
import { maybeWithBearerAuth } from "../app/utils";

const MemberList = ({ open, onClose, topic }) => {
  const { t } = useTranslation();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [profileUser, setProfileUser] = useState(null);

  useEffect(() => {
    if (!open || !topic) return;
    setLoading(true);
    const fetchMembers = async () => {
      try {
        const url = `${config.base_url}/v1/coop/profiles?topic=${encodeURIComponent(topic)}`;
        const headers = maybeWithBearerAuth({}, session.token());
        const response = await fetch(url, { headers });
        if (response.ok) {
          const data = await response.json();
          // Sort: online first, then recently, then offline, then alphabetically
          const now = Math.floor(Date.now() / 1000);
          data.sort((a, b) => {
            const statusA = getOnlineStatus(a.last_seen, now);
            const statusB = getOnlineStatus(b.last_seen, now);
            if (statusA !== statusB) return statusA - statusB;
            return (a.display_name || a.username).localeCompare(b.display_name || b.username);
          });
          setMembers(data);
        }
      } catch (e) {
        console.warn("[MemberList] Failed to load members", e);
      } finally {
        setLoading(false);
      }
    };
    fetchMembers();
  }, [open, topic]);

  const getOnlineStatus = (lastSeen, now) => {
    const diff = now - (lastSeen || 0);
    if (lastSeen > 0 && diff <= 120) return 0; // online
    if (lastSeen > 0 && diff <= 900) return 1; // recently
    return 2; // offline
  };

  return (
    <>
      <Drawer
        anchor="right"
        open={open}
        onClose={onClose}
        PaperProps={{
          sx: {
            width: 300,
            border: "3px solid var(--coop-black)",
            borderRadius: 0,
            backgroundColor: "var(--coop-bg)",
          },
        }}
      >
        <Box sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          p: 2,
          borderBottom: "2px solid var(--coop-black)",
        }}>
          <Typography
            variant="h6"
            sx={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 700,
            }}
          >
            {t("member_list_title", "Mitglieder")}
            {!loading && ` (${members.length})`}
          </Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>

        <List sx={{ p: 0 }}>
          {members.map((member) => (
            <ListItemButton
              key={member.username}
              onClick={() => setProfileUser(member.username)}
              sx={{
                borderBottom: "2px solid var(--coop-gray-200)",
                py: 1.5,
                px: 2,
                gap: 1.5,
              }}
            >
              <UserAvatar
                username={member.username}
                displayName={member.display_name}
                avatarUrl={member.avatar_url}
                size="md"
              />
              <ListItemText
                primary={member.display_name || member.username}
                secondary={member.bio || `@${member.username}`}
                primaryTypographyProps={{
                  sx: {
                    fontFamily: "'DM Sans', sans-serif",
                    fontWeight: 600,
                    fontSize: "0.9rem",
                  },
                }}
                secondaryTypographyProps={{
                  sx: {
                    fontSize: "0.75rem",
                    color: "var(--coop-gray-500)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  },
                }}
              />
              <OnlineIndicator lastSeen={member.last_seen} />
            </ListItemButton>
          ))}
          {!loading && members.length === 0 && (
            <Box sx={{ p: 3, textAlign: "center" }}>
              <Typography variant="body2" sx={{ color: "var(--coop-gray-500)" }}>
                {t("member_list_empty", "Keine Mitglieder gefunden")}
              </Typography>
            </Box>
          )}
        </List>
      </Drawer>

      <UserProfile
        open={!!profileUser}
        onClose={() => setProfileUser(null)}
        username={profileUser}
      />
    </>
  );
};

export default MemberList;
