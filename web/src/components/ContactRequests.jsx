import React from "react";
import { Box, Button, List, ListItem, ListItemText, Typography } from "@mui/material";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import { useTranslation } from "react-i18next";
import UserAvatar from "./UserAvatar";

const ContactRequests = ({ requests, onAccept, onReject }) => {
  const { t } = useTranslation();

  if (!requests || requests.length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: "center" }}>
        <Typography variant="body2" sx={{ color: "var(--coop-gray-500)" }}>
          {t("contacts_no_requests", "Keine offenen Anfragen")}
        </Typography>
      </Box>
    );
  }

  return (
    <List sx={{ p: 0 }}>
      {requests.map((req) => (
        <ListItem
          key={req.username}
          sx={{
            borderBottom: "1px solid var(--coop-gray-200)",
            py: 1.5,
            px: 2,
            gap: 1,
          }}
        >
          <UserAvatar
            username={req.username}
            displayName={req.display_name}
            avatarUrl={req.avatar_url}
            size="md"
          />
          <ListItemText
            primary={req.display_name || req.username}
            secondary={`@${req.username}`}
            primaryTypographyProps={{ sx: { fontWeight: 600, fontSize: "0.9rem" } }}
            secondaryTypographyProps={{ sx: { fontSize: "0.75rem", color: "var(--coop-gray-500)" } }}
          />
          <Box sx={{ display: "flex", gap: 0.5, flexShrink: 0 }}>
            <Button
              size="small"
              onClick={() => onAccept(req.username)}
              sx={{
                minWidth: 32,
                border: "2px solid var(--coop-black)",
                borderRadius: 0,
                backgroundColor: "var(--coop-green)",
                color: "#fff",
                p: 0.5,
                "&:hover": { backgroundColor: "#16a34a" },
              }}
            >
              <CheckIcon sx={{ fontSize: 18 }} />
            </Button>
            <Button
              size="small"
              onClick={() => onReject(req.username)}
              sx={{
                minWidth: 32,
                border: "2px solid var(--coop-black)",
                borderRadius: 0,
                backgroundColor: "var(--coop-red)",
                color: "#fff",
                p: 0.5,
                "&:hover": { backgroundColor: "#dc2626" },
              }}
            >
              <CloseIcon sx={{ fontSize: 18 }} />
            </Button>
          </Box>
        </ListItem>
      ))}
    </List>
  );
};

export default ContactRequests;
