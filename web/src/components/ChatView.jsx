import React, { useCallback, useContext, useEffect, useRef, useState } from "react";
import { Box, Button, ButtonBase, Chip, Container, Divider, Fab, IconButton, Link, Stack, Tooltip, Typography } from "@mui/material";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import ReplyIcon from "@mui/icons-material/Reply";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import { useTranslation } from "react-i18next";
import session from "../app/Session";
import userManager from "../app/UserManager";
import connectionManager from "../app/ConnectionManager";
import { formatBytes, formatShortDateTime, maybeWithAuth, unmatchedTags } from "../app/utils";
import { formatTitle, isImage } from "../app/notificationUtils";
import { NotificationBody, UserActions } from "./Notifications";
import { ReplyContext } from "./App";
import EmojiReactionPicker from "./EmojiReactionPicker";
import ImageLightbox from "./ImageLightbox";
import UserAvatar from "./UserAvatar";
import UserProfile from "./UserProfile";

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

const ReactionChips = ({ reactions, onToggle }) => {
  if (!reactions || reactions.length === 0) return null;
  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 0.5, px: 0.5 }}>
      {reactions.map((r) => (
        <Chip
          key={r.emoji}
          label={`${r.emoji} ${r.count}`}
          size="small"
          onClick={() => onToggle(r.emoji)}
          sx={{
            borderRadius: 0,
            border: r.reacted ? "2px solid var(--coop-accent)" : "2px solid var(--coop-black)",
            backgroundColor: r.reacted ? "var(--coop-accent)" : "transparent",
            color: "var(--coop-black)",
            boxShadow: "2px 2px 0px var(--coop-black)",
            fontWeight: 700,
            fontSize: "0.75rem",
            height: 26,
            cursor: "pointer",
            "&:hover": {
              backgroundColor: r.reacted ? "var(--coop-accent-hover)" : "var(--coop-gray-100)",
              boxShadow: "3px 3px 0px var(--coop-black)",
            },
          }}
        />
      ))}
    </Box>
  );
};

const ChatAttachment = ({ attachment }) => {
  const { t } = useTranslation();
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const expired = attachment.expires && attachment.expires < Date.now() / 1000;

  if (expired) {
    return (
      <Typography variant="caption" sx={{ mt: 1, color: "var(--coop-gray-500)", fontStyle: "italic" }}>
        {t("chat_attachment_expired", "Anhang abgelaufen")}
      </Typography>
    );
  }

  // Image
  if (isImage(attachment)) {
    return (
      <>
        <Box
          component="img"
          src={attachment.url}
          loading="lazy"
          alt={attachment.name || t("chat_attachment_image", "Bild")}
          onClick={() => setLightboxOpen(true)}
          sx={{
            mt: 1,
            maxWidth: 300,
            maxHeight: 400,
            objectFit: "cover",
            border: "3px solid var(--coop-black)",
            boxShadow: "var(--coop-shadow-sm)",
            cursor: "pointer",
            display: "block",
            "&:hover": {
              boxShadow: "var(--coop-shadow)",
            },
          }}
        />
        <ImageLightbox
          open={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
          src={attachment.url}
          alt={attachment.name}
        />
      </>
    );
  }

  // Video
  if (attachment.type?.startsWith("video/")) {
    return (
      <Box
        component="video"
        controls
        preload="metadata"
        src={attachment.url}
        sx={{
          mt: 1,
          maxWidth: 300,
          maxHeight: 300,
          border: "3px solid var(--coop-black)",
          boxShadow: "var(--coop-shadow-sm)",
          display: "block",
        }}
      />
    );
  }

  // Audio
  if (attachment.type?.startsWith("audio/")) {
    return (
      <Box
        component="audio"
        controls
        preload="metadata"
        src={attachment.url}
        sx={{
          mt: 1,
          display: "block",
          width: "100%",
          maxWidth: 300,
        }}
      />
    );
  }

  // Other file type - download link
  return (
    <ButtonBase
      component={Link}
      href={attachment.url}
      target="_blank"
      rel="noopener"
      sx={{
        mt: 1,
        display: "flex",
        alignItems: "center",
        gap: 1,
        p: 1,
        border: "2px solid var(--coop-black)",
        boxShadow: "2px 2px 0px var(--coop-black)",
        textDecoration: "none",
        color: "var(--coop-black)",
        "&:hover": {
          boxShadow: "3px 3px 0px var(--coop-black)",
          backgroundColor: "var(--coop-gray-100)",
        },
      }}
    >
      <InsertDriveFileIcon sx={{ fontSize: 20 }} />
      <Box>
        <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
          {attachment.name}
        </Typography>
        {attachment.size > 0 && (
          <Typography variant="caption" sx={{ color: "var(--coop-gray-500)" }}>
            {formatBytes(attachment.size)}
          </Typography>
        )}
      </Box>
    </ButtonBase>
  );
};

const URL_REGEX = /\bhttps?:\/\/[^\s]+/gi;

const extractUrls = (text) => {
  if (!text) return [];
  const matches = text.match(URL_REGEX);
  if (!matches) return [];
  // Deduplicate and limit to 3
  return [...new Set(matches)].slice(0, 3);
};

const getDomain = (url) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};

const LinkPreviewBlock = ({ urls }) => {
  if (!urls || urls.length === 0) return null;
  return (
    <Box sx={{ mt: 0.5, display: "flex", flexDirection: "column", gap: 0.5 }}>
      {urls.map((url) => (
        <Link
          key={url}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          underline="none"
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            p: 0.75,
            border: "2px solid var(--coop-gray-300)",
            backgroundColor: "var(--coop-gray-100)",
            color: "var(--coop-black)",
            fontSize: "0.75rem",
            fontFamily: "var(--coop-font-body)",
            overflow: "hidden",
            "&:hover": {
              borderColor: "var(--coop-accent)",
              backgroundColor: "var(--coop-gray-200)",
            },
          }}
        >
          <Typography
            variant="caption"
            sx={{
              fontWeight: 700,
              color: "var(--coop-accent)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {getDomain(url)}
          </Typography>
        </Link>
      ))}
    </Box>
  );
};

const ChatBubble = React.memo(({ notification, onReply, reactions, onReactionToggle, onReactionAdd, profilesCache, onAvatarClick }) => {
  const { t, i18n } = useTranslation();
  const isOwn = notification.sender === session.username();
  const otherTags = unmatchedTags(notification.tags);
  const urls = extractUrls(notification.message);
  const senderProfile = profilesCache?.[notification.sender];
  const displayName = senderProfile?.display_name || notification.sender;

  return (
    <Box
      id={`msg-${notification.id}`}
      sx={{
        display: "flex",
        flexDirection: isOwn ? "row-reverse" : "row",
        alignItems: "flex-end",
        gap: 1,
        maxWidth: "100%",
        "&:hover .reply-btn": { opacity: 1 },
      }}
    >
      {!isOwn && notification.sender && (
        <UserAvatar
          username={notification.sender}
          displayName={senderProfile?.display_name}
          avatarUrl={senderProfile?.avatar_url}
          size="sm"
          onClick={() => onAvatarClick?.(notification.sender)}
        />
      )}
      <Box sx={{
        maxWidth: "75%",
        display: "flex",
        flexDirection: "column",
        alignItems: isOwn ? "flex-end" : "flex-start",
      }}>
        {!isOwn && notification.sender && (
          <Typography
            variant="caption"
            sx={{ fontWeight: 700, mb: 0.25, px: 0.5, color: "text.secondary", cursor: "pointer" }}
            onClick={() => onAvatarClick?.(notification.sender)}
          >
            {displayName}
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

          {notification.attachment && <ChatAttachment attachment={notification.attachment} />}

          {urls.length > 0 && !notification.attachment && (
            <LinkPreviewBlock urls={urls} />
          )}

          {otherTags.length > 0 && (
            <Box sx={{ mt: 0.5 }}>
              {otherTags.map(tag => (
                <Chip key={tag} label={tag} size="small" sx={{ mr: 0.5, borderRadius: 0, border: "3px solid var(--coop-black)" }} />
              ))}
            </Box>
          )}
        </Box>

        <ReactionChips reactions={reactions} onToggle={(emoji) => onReactionToggle(notification.id, emoji)} />

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
          <EmojiReactionPicker onSelect={(emoji) => onReactionAdd(notification.id, emoji)} />
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

const NudgeBubble = React.memo(({ notification, profilesCache, onAvatarClick }) => {
  const { t } = useTranslation();
  const isOwn = notification.sender === session.username();
  const senderProfile = profilesCache?.[notification.sender];
  const displayName = senderProfile?.display_name || notification.sender;

  return (
    <Box
      id={`msg-${notification.id}`}
      className="coop-nudge"
      sx={{
        display: "flex",
        flexDirection: isOwn ? "row-reverse" : "row",
        alignItems: "center",
        gap: 1,
        maxWidth: "100%",
      }}
    >
      {!isOwn && notification.sender && (
        <UserAvatar
          username={notification.sender}
          displayName={senderProfile?.display_name}
          avatarUrl={senderProfile?.avatar_url}
          size="sm"
          onClick={() => onAvatarClick?.(notification.sender)}
        />
      )}
      <Box sx={{
        display: "flex",
        alignItems: "center",
        gap: 1,
        px: 2,
        py: 1,
        border: "3px solid var(--coop-black)",
        backgroundColor: "var(--coop-yellow)",
        boxShadow: "var(--coop-shadow)",
        fontWeight: 700,
      }}>
        <NotificationsActiveIcon sx={{ fontSize: 20 }} />
        <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: "var(--coop-font-display)" }}>
          {isOwn
            ? t("nudge_sent_self", "Du hast gegurrt!")
            : t("nudge_received", "{sender} hat dich angegurrt!").replace("{sender}", displayName)
          }
        </Typography>
      </Box>
    </Box>
  );
});

const TypingIndicator = ({ typingUsers }) => {
  const { t } = useTranslation();
  if (!typingUsers || typingUsers.length === 0) return null;

  let label;
  if (typingUsers.length === 1) {
    label = t("typing_one", "{user} pickt...").replace("{user}", typingUsers[0]);
  } else if (typingUsers.length === 2) {
    label = t("typing_two", "{user1} und {user2} picken...")
      .replace("{user1}", typingUsers[0])
      .replace("{user2}", typingUsers[1]);
  } else {
    label = t("typing_many", "Mehrere picken...");
  }

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, px: 2, py: 0.5 }}>
      <Box sx={{ display: "flex", gap: "3px" }}>
        <Box className="coop-typing-dot" sx={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "var(--coop-gray-500)" }} />
        <Box className="coop-typing-dot" sx={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "var(--coop-gray-500)" }} />
        <Box className="coop-typing-dot" sx={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "var(--coop-gray-500)" }} />
      </Box>
      <Typography variant="caption" sx={{ color: "var(--coop-gray-500)", fontStyle: "italic" }}>
        {label}
      </Typography>
    </Box>
  );
};

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
  const [reactionsMap, setReactionsMap] = useState({});
  const [profilesCache, setProfilesCache] = useState({});
  const [profileUser, setProfileUser] = useState(null);
  const [typingUsers, setTypingUsers] = useState([]);
  const typingTimersRef = useRef({});

  // Listen for typing events via ConnectionManager
  useEffect(() => {
    if (!subscription) return;
    const handler = (subId, event) => {
      if (event.event !== "coop_typing") return;
      if (event.topic !== subscription.topic) return;
      const sender = event.sender;
      if (!sender || sender === session.username()) return;

      // Add/refresh typing user
      setTypingUsers((prev) => {
        if (!prev.includes(sender)) return [...prev, sender];
        return prev;
      });

      // Clear existing timer for this user
      if (typingTimersRef.current[sender]) {
        clearTimeout(typingTimersRef.current[sender]);
      }
      // Remove after 5 seconds
      typingTimersRef.current[sender] = setTimeout(() => {
        setTypingUsers((prev) => prev.filter((u) => u !== sender));
        delete typingTimersRef.current[sender];
      }, 5000);
    };

    connectionManager.registerSocialEventListener(handler);
    return () => {
      connectionManager.resetSocialEventListener();
      // Cleanup timers
      Object.values(typingTimersRef.current).forEach(clearTimeout);
      typingTimersRef.current = {};
    };
  }, [subscription?.topic]);

  // Load profiles for topic members
  useEffect(() => {
    if (!subscription) return;
    const loadProfiles = async () => {
      try {
        const user = await userManager.get(subscription.baseUrl);
        const headers = maybeWithAuth({}, user);
        const resp = await fetch(
          `${subscription.baseUrl}/v1/coop/profiles?topic=${encodeURIComponent(subscription.topic)}`,
          { headers },
        );
        if (!resp.ok) return;
        const data = await resp.json();
        const cache = {};
        for (const p of data) {
          cache[p.username] = p;
        }
        setProfilesCache(cache);
      } catch (e) {
        // Profiles are optional, don't break chat
      }
    };
    loadProfiles();
  }, [subscription?.baseUrl, subscription?.topic]);

  const allMessages = notifications.filter(n => n.event === "message" || n.event === "coop_nudge");
  const messages = allMessages.length > maxCount
    ? allMessages.slice(0, maxCount).reverse()
    : [...allMessages].reverse();

  // Load reactions for the topic
  useEffect(() => {
    if (!subscription) return;
    const loadReactions = async () => {
      try {
        const user = await userManager.get(subscription.baseUrl);
        const headers = maybeWithAuth({}, user);
        const resp = await fetch(
          `${subscription.baseUrl}/v1/coop/reactions?topic=${encodeURIComponent(subscription.topic)}`,
          { headers },
        );
        if (!resp.ok) return;
        const data = await resp.json();
        const map = {};
        for (const item of data) {
          map[item.message_id] = item.reactions;
        }
        setReactionsMap(map);
      } catch (e) {
        console.error("[ChatView] Failed to load reactions", e);
      }
    };
    loadReactions();
  }, [subscription?.baseUrl, subscription?.topic]);

  // Toggle reaction (optimistic update)
  const handleReactionToggle = useCallback(async (messageId, emoji) => {
    if (!subscription) return;
    const username = session.username();

    // Optimistic update
    setReactionsMap((prev) => {
      const current = prev[messageId] || [];
      const existing = current.find((r) => r.emoji === emoji);
      if (existing) {
        if (existing.reacted) {
          // Remove own reaction
          const newCount = existing.count - 1;
          if (newCount <= 0) {
            return { ...prev, [messageId]: current.filter((r) => r.emoji !== emoji) };
          }
          return {
            ...prev,
            [messageId]: current.map((r) =>
              r.emoji === emoji
                ? { ...r, count: newCount, reacted: false, users: r.users.filter((u) => u !== username) }
                : r,
            ),
          };
        }
        // Add own reaction to existing emoji
        return {
          ...prev,
          [messageId]: current.map((r) =>
            r.emoji === emoji
              ? { ...r, count: r.count + 1, reacted: true, users: [...r.users, username] }
              : r,
          ),
        };
      }
      // New emoji
      return {
        ...prev,
        [messageId]: [...current, { emoji, count: 1, users: [username], reacted: true }],
      };
    });

    // Send to server
    try {
      const user = await userManager.get(subscription.baseUrl);
      const headers = maybeWithAuth({ "Content-Type": "application/json" }, user);
      await fetch(`${subscription.baseUrl}/v1/coop/messages/${messageId}/reactions`, {
        method: "POST",
        headers,
        body: JSON.stringify({ emoji }),
      });
    } catch (e) {
      console.error("[ChatView] Failed to toggle reaction", e);
    }
  }, [subscription]);

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
    <>
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
              {notification.event === "coop_nudge" ? (
                <NudgeBubble
                  notification={notification}
                  profilesCache={profilesCache}
                  onAvatarClick={setProfileUser}
                />
              ) : (
                <ChatBubble
                  notification={notification}
                  onReply={handleReply}
                  reactions={reactionsMap[notification.id]}
                  onReactionToggle={handleReactionToggle}
                  onReactionAdd={handleReactionToggle}
                  profilesCache={profilesCache}
                  onAvatarClick={setProfileUser}
                />
              )}
            </React.Fragment>
          );
        })}
      </Stack>
      <TypingIndicator typingUsers={typingUsers} />
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

    <UserProfile
      open={!!profileUser}
      onClose={() => setProfileUser(null)}
      username={profileUser}
    />
    </>
  );
};

export default ChatView;
