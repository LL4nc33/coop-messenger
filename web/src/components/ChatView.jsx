import React, { useEffect, useRef, useState } from "react";
import { Box, Button, Chip, Container, Stack, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import session from "../app/Session";
import { formatShortDateTime, unmatchedTags } from "../app/utils";
import { formatTitle } from "../app/notificationUtils";
import { NotificationBody, Attachment, UserActions } from "./Notifications";

const ChatBubble = React.memo(({ notification }) => {
  const { i18n } = useTranslation();
  const isOwn = notification.sender === session.username();
  const otherTags = unmatchedTags(notification.tags);

  return (
    <Box sx={{
      display: "flex",
      flexDirection: isOwn ? "row-reverse" : "row",
      maxWidth: "100%",
    }}>
      <Box sx={{
        maxWidth: "75%",
        display: "flex",
        flexDirection: "column",
        alignItems: isOwn ? "flex-end" : "flex-start",
      }}>
        {!isOwn && notification.sender && (
          <Typography variant="caption" sx={{ fontWeight: 700, mb: 0.25, px: 0.5, color: "text.secondary" }}>
            {notification.sender}
          </Typography>
        )}

        <Box sx={{
          px: 2,
          py: 1,
          border: "3px solid var(--coop-black)",
          borderRadius: 0,
          backgroundColor: isOwn ? "var(--coop-accent)" : "var(--coop-white)",
          color: "var(--coop-black)",
          boxShadow: isOwn ? "var(--coop-shadow)" : "var(--coop-shadow-sm)",
          wordBreak: "break-word",
          whiteSpace: "pre-line",
        }}>
          {notification.title && (
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              {formatTitle(notification)}
            </Typography>
          )}

          <Typography variant="body2" sx={{ lineHeight: 1.5 }}>
            <NotificationBody notification={notification} />
          </Typography>

          {notification.attachment && <Attachment attachment={notification.attachment} />}

          {otherTags.length > 0 && (
            <Box sx={{ mt: 0.5 }}>
              {otherTags.map(tag => (
                <Chip key={tag} label={tag} size="small" sx={{ mr: 0.5, borderRadius: 0, border: "3px solid var(--coop-black)" }} />
              ))}
            </Box>
          )}
        </Box>

        <Typography variant="caption" sx={{ mt: 0.25, px: 0.5, fontFamily: "monospace", color: "text.disabled" }}>
          {formatShortDateTime(notification.time, i18n.language)}
        </Typography>

        {notification.actions?.length > 0 && (
          <Box sx={{ mt: 0.5 }}>
            <UserActions notification={notification} />
          </Box>
        )}
      </Box>
    </Box>
  );
});

const ChatView = ({ notifications, subscription }) => {
  const { t } = useTranslation();
  const messagesEndRef = useRef(null);
  const [maxCount, setMaxCount] = useState(20);

  const allMessages = notifications.filter(n => n.event === "message");
  const messages = allMessages.length > maxCount
    ? allMessages.slice(0, maxCount).reverse()
    : [...allMessages].reverse();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  return (
    <Container maxWidth="md" sx={{ pt: 2, pb: "100px" }}>
      {messages.length === 0 && (
        <Box sx={{ textAlign: "center", py: 8, color: "text.secondary" }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
            {t("chat_empty_title", "Noch keine Nachrichten")}
          </Typography>
          <Typography variant="body2">
            {t("chat_empty_description", "Schreibe die erste Nachricht unten im Eingabefeld.")}
            <br />
            {t("chat_empty_hint", "Enter = Senden, Shift+Enter = Zeilenumbruch.")}
          </Typography>
        </Box>
      )}
      {allMessages.length > maxCount && (
        <Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
          <Button
            onClick={() => setMaxCount(prev => prev + 20)}
            variant="outlined"
            sx={{
              borderRadius: 0,
              border: "3px solid var(--coop-black)",
              color: "var(--coop-black)",
              fontWeight: 700,
              "&:hover": { backgroundColor: "rgba(128,128,128,0.1)" },
            }}
          >
            {t("chat_load_more", "Aeltere Nachrichten laden")}
          </Button>
        </Box>
      )}
      <Stack spacing={1.5}>
        {messages.map(notification => (
          <ChatBubble key={notification.id} notification={notification} />
        ))}
      </Stack>
      <div ref={messagesEndRef} />
    </Container>
  );
};

export default ChatView;
