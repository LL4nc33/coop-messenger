import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Box, Button, Chip, Container, Divider, Fab, IconButton, Stack, Tooltip, Typography } from "@mui/material";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import ReplyIcon from "@mui/icons-material/Reply";
import { useTranslation } from "react-i18next";
import session from "../app/Session";
import { formatShortDateTime, unmatchedTags } from "../app/utils";
import { formatTitle } from "../app/notificationUtils";
import { NotificationBody, Attachment, UserActions } from "./Notifications";
import { ReplyContext } from "./App";

const QuoteBlock = ({ replyToText, replyToSender }) => (
  <Box sx={{
    borderLeft: "3px solid var(--coop-accent)",
    backgroundColor: "var(--coop-gray-100)",
    px: 1.5,
    py: 0.5,
    mb: 0.5,
    cursor: "pointer",
  }}>
    {replyToSender && (
      <Typography variant="caption" sx={{ fontWeight: 700, display: "block", fontSize: "0.7rem" }}>
        {replyToSender}
      </Typography>
    )}
    <Typography variant="caption" sx={{ color: "var(--coop-gray-500)", fontStyle: "italic", fontSize: "0.75rem" }}>
      {replyToText || "..."}
    </Typography>
  </Box>
);

const ChatBubble = React.memo(({ notification, onReply }) => {
  const { t, i18n } = useTranslation();
  const isOwn = notification.sender === session.username();
  const otherTags = unmatchedTags(notification.tags);

  return (
    <Box
      id={`msg-${notification.id}`}
      sx={{
        display: "flex",
        flexDirection: isOwn ? "row-reverse" : "row",
        maxWidth: "100%",
        "&:hover .reply-btn": { opacity: 1 },
      }}
    >
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
          {notification.reply_to_text && (
            <QuoteBlock replyToText={notification.reply_to_text} />
          )}

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

        <Box sx={{ display: "flex", alignItems: "center", mt: 0.25, px: 0.5, gap: 0.5 }}>
          <Typography variant="caption" sx={{ fontFamily: "monospace", color: "text.disabled" }}>
            {formatShortDateTime(notification.time, i18n.language)}
          </Typography>
          <Tooltip title={t("chat_reply_button", "Antworten")} placement="top">
            <IconButton
              className="reply-btn"
              size="small"
              onClick={() => onReply?.(notification)}
              sx={{ opacity: 0, transition: "opacity 0.15s", p: 0.25 }}
            >
              <ReplyIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Tooltip>
        </Box>

        {notification.actions?.length > 0 && (
          <Box sx={{ mt: 0.5 }}>
            <UserActions notification={notification} />
          </Box>
        )}
      </Box>
    </Box>
  );
});

const isSameDay = (d1, d2) =>
  d1.getFullYear() === d2.getFullYear() &&
  d1.getMonth() === d2.getMonth() &&
  d1.getDate() === d2.getDate();

const getDateLabel = (timestamp, t) => {
  const msgDate = new Date(timestamp * 1000);
  const today = new Date();
  if (isSameDay(msgDate, today)) return t("chat_date_today", "Heute");
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (isSameDay(msgDate, yesterday)) return t("chat_date_yesterday", "Gestern");
  return msgDate.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
};

const getDateKey = (timestamp) => {
  const d = new Date(timestamp * 1000);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
};

const DateSeparator = ({ label }) => (
  <Box sx={{ display: "flex", alignItems: "center", my: 1.5 }}>
    <Divider sx={{ flexGrow: 1, borderColor: "var(--coop-black)", borderWidth: "1px" }} />
    <Typography
      variant="caption"
      sx={{
        mx: 2,
        fontFamily: "var(--coop-font-body)",
        fontWeight: 600,
        color: "var(--coop-gray-500)",
        whiteSpace: "nowrap",
        fontSize: "0.75rem",
      }}
    >
      {label}
    </Typography>
    <Divider sx={{ flexGrow: 1, borderColor: "var(--coop-black)", borderWidth: "1px" }} />
  </Box>
);

const SCROLL_THRESHOLD = 150;

const isNearBottom = (container) => {
  if (!container) return true;
  return container.scrollHeight - container.scrollTop - container.clientHeight < SCROLL_THRESHOLD;
};

const ChatView = ({ notifications, subscription }) => {
  const { t } = useTranslation();
  const { setReplyTo } = useContext(ReplyContext);
  const scrollContainerRef = useRef(null);
  const messagesEndRef = useRef(null);
  const [maxCount, setMaxCount] = useState(20);
  const [showNewMsgButton, setShowNewMsgButton] = useState(false);
  const wasNearBottomRef = useRef(true);
  const prevMessageCountRef = useRef(0);

  const allMessages = notifications.filter(n => n.event === "message");
  const messages = allMessages.length > maxCount
    ? allMessages.slice(0, maxCount).reverse()
    : [...allMessages].reverse();

  // Track scroll position
  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const nearBottom = isNearBottom(container);
    wasNearBottomRef.current = nearBottom;
    if (nearBottom) {
      setShowNewMsgButton(false);
    }
  }, []);

  // Find scroll container (the #main element)
  useEffect(() => {
    const main = document.getElementById("main");
    if (main) {
      scrollContainerRef.current = main;
      main.addEventListener("scroll", handleScroll, { passive: true });
      return () => main.removeEventListener("scroll", handleScroll);
    }
  }, [handleScroll]);

  // Auto-scroll logic on new messages
  useEffect(() => {
    if (messages.length === 0) return;
    const prevCount = prevMessageCountRef.current;
    prevMessageCountRef.current = messages.length;

    // No new messages
    if (messages.length <= prevCount) return;

    const lastMsg = messages[messages.length - 1];
    const isOwnMessage = lastMsg?.sender === session.username();

    if (isOwnMessage || wasNearBottomRef.current) {
      // Auto-scroll to bottom
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    } else {
      // User is reading old messages - show button
      setShowNewMsgButton(true);
    }
  }, [messages.length]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    setShowNewMsgButton(false);
  };

  const handleReply = (notification) => {
    setReplyTo({
      id: notification.id,
      text: (notification.message || "").substring(0, 100),
      sender: notification.sender || "",
    });
  };

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
        {messages.map((notification, index) => {
          const showDateSep = index === 0 ||
            getDateKey(notification.time) !== getDateKey(messages[index - 1].time);
          return (
            <React.Fragment key={notification.id}>
              {showDateSep && <DateSeparator label={getDateLabel(notification.time, t)} />}
              <ChatBubble notification={notification} onReply={handleReply} />
            </React.Fragment>
          );
        })}
      </Stack>
      <div ref={messagesEndRef} />

      {/* "Neue Nachrichten" floating button */}
      {showNewMsgButton && (
        <Fab
          size="small"
          onClick={scrollToBottom}
          aria-label={t("chat_new_messages_button", "Neue Nachrichten")}
          sx={{
            position: "fixed",
            bottom: 90,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 1200,
            backgroundColor: "var(--coop-yellow)",
            color: "var(--coop-black)",
            border: "3px solid var(--coop-black)",
            borderRadius: 0,
            boxShadow: "var(--coop-shadow)",
            fontFamily: "var(--coop-font-display)",
            fontWeight: 700,
            fontSize: "0.75rem",
            textTransform: "uppercase",
            px: 2,
            width: "auto",
            height: "auto",
            minHeight: 36,
            "&:hover": {
              backgroundColor: "var(--coop-yellow-hover)",
              boxShadow: "var(--coop-shadow-hover)",
              transform: "translateX(-50%) translate(-2px, -2px)",
            },
          }}
        >
          <KeyboardArrowDownIcon sx={{ mr: 0.5, fontSize: 18 }} />
          {t("chat_new_messages_button", "Neue Nachrichten")}
        </Fab>
      )}
    </Container>
  );
};

export default ChatView;
