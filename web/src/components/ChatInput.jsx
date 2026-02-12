import { useContext, useRef, useState } from "react";
import { Box, IconButton, Paper, Portal, Snackbar, TextField, Tooltip, Typography } from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import CloseIcon from "@mui/icons-material/Close";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import { useTranslation } from "react-i18next";
import Navigation from "./Navigation";
import { ReplyContext } from "./App";
import CommandPalette from "./CommandPalette";
import { filterCommands, parseCommand, executeServerCommand } from "../app/SlashCommands";
import config from "../app/config";
import session from "../app/Session";
import { maybeWithBearerAuth } from "../app/utils";

const TYPING_INTERVAL = 3000; // 3 seconds between typing events

const ChatInput = ({ onSend, topic, onLocalCommand }) => {
  const { t } = useTranslation();
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  const successTimerRef = useRef(null);
  const lastTypingRef = useRef(0);
  const { replyTo, setReplyTo } = useContext(ReplyContext);

  // Command palette state
  const [filteredCommands, setFilteredCommands] = useState([]);
  const [commandIndex, setCommandIndex] = useState(0);

  const sendTypingEvent = () => {
    if (!topic) return;
    const now = Date.now();
    if (now - lastTypingRef.current < TYPING_INTERVAL) return;
    lastTypingRef.current = now;
    const url = `${config.base_url}/v1/coop/typing`;
    const headers = {
      ...maybeWithBearerAuth({}, session.token()),
      "Content-Type": "application/json",
    };
    fetch(url, { method: "POST", headers, body: JSON.stringify({ topic }) }).catch(() => {});
  };

  const handleSend = async () => {
    const trimmed = message.trim();
    if (!trimmed) return;

    // Check for slash commands
    const cmd = parseCommand(trimmed);
    if (cmd) {
      try {
        if (cmd.serverSide) {
          await executeServerCommand(cmd.name, topic, cmd.inputArgs);
        } else if (cmd.name === "mitglieder") {
          onLocalCommand?.("mitglieder");
        }
        setMessage("");
        setFilteredCommands([]);
      } catch (e) {
        console.error("[ChatInput] Command failed", e);
        setError(true);
      }
      return;
    }

    try {
      const options = { markdown: true };
      if (replyTo) {
        options.reply_to = replyTo.id;
      }
      await onSend(trimmed, options);
      setMessage("");
      setReplyTo(null);
      setSendSuccess(true);
      clearTimeout(successTimerRef.current);
      successTimerRef.current = setTimeout(() => setSendSuccess(false), 400);
    } catch (e) {
      console.error("[ChatInput] Error sending", e);
      setError(true);
    }
  };

  const handleNudge = async () => {
    if (!topic) return;
    try {
      const url = `${config.base_url}/v1/coop/nudge`;
      const headers = {
        ...maybeWithBearerAuth({}, session.token()),
        "Content-Type": "application/json",
      };
      const resp = await fetch(url, { method: "POST", headers, body: JSON.stringify({ topic }) });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        if (err.error?.includes("rate limit")) {
          // Silently ignore rate limit
          return;
        }
      }
    } catch (e) {
      console.error("[ChatInput] Nudge failed", e);
    }
  };

  const handleChange = (e) => {
    const val = e.target.value;
    setMessage(val);

    // Command palette
    if (val.startsWith("/")) {
      const cmds = filterCommands(val);
      setFilteredCommands(cmds);
      setCommandIndex(0);
    } else {
      setFilteredCommands([]);
    }
  };

  const handleKeyDown = (e) => {
    // Command palette navigation
    if (filteredCommands.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setCommandIndex((prev) => Math.min(prev + 1, filteredCommands.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setCommandIndex((prev) => Math.max(prev - 1, 0));
        return;
      }
      if (e.key === "Tab" || (e.key === "Enter" && !e.shiftKey && filteredCommands.length > 0 && message.trim().split(/\s+/).length === 1)) {
        e.preventDefault();
        const cmd = filteredCommands[commandIndex];
        if (cmd) {
          setMessage(`/${cmd.name} `);
          setFilteredCommands([]);
        }
        return;
      }
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
      return;
    }

    // Send typing event on any key except Enter
    sendTypingEvent();
  };

  const handleCommandSelect = (cmd) => {
    setMessage(`/${cmd.name} `);
    setFilteredCommands([]);
  };

  return (
    <Paper
      elevation={0}
      sx={{
        position: "fixed",
        bottom: 0,
        right: 0,
        width: { xs: "100%", sm: `calc(100% - ${Navigation.width}px)` },
        borderTop: "3px solid var(--coop-black)",
        backgroundColor: "var(--coop-gray-100)",
        borderRadius: 0,
      }}
    >
      {/* Reply banner */}
      {replyTo && (
        <Box sx={{
          display: "flex",
          alignItems: "center",
          px: 2,
          py: 1,
          borderBottom: "1px solid var(--coop-gray-200)",
          borderLeft: "3px solid var(--coop-accent)",
          backgroundColor: "var(--coop-white)",
        }}>
          <Box sx={{ flexGrow: 1, overflow: "hidden" }}>
            <Typography variant="caption" sx={{ fontWeight: 700, display: "block", fontSize: "0.7rem", color: "var(--coop-accent)" }}>
              {t("chat_reply_to", "Antwort an")} {replyTo.sender || t("chat_reply_unknown", "Unbekannt")}
            </Typography>
            <Typography variant="caption" sx={{ color: "var(--coop-gray-500)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>
              {replyTo.text}
            </Typography>
          </Box>
          <IconButton size="small" onClick={() => setReplyTo(null)} aria-label={t("chat_reply_cancel", "Antwort abbrechen")}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      )}

      {/* Command palette */}
      <CommandPalette
        commands={filteredCommands}
        selectedIndex={commandIndex}
        onSelect={handleCommandSelect}
      />

      <Box sx={{ display: "flex", alignItems: "flex-end", gap: 1, padding: 2 }}>
        <Tooltip title={t("chat_nudge_button", "Angurren")} placement="top">
          <IconButton
            onClick={handleNudge}
            aria-label={t("chat_nudge_button", "Angurren")}
            sx={{
              width: 48,
              height: 48,
              minWidth: 48,
              borderRadius: 0,
              border: "2px solid var(--coop-black)",
              backgroundColor: "var(--coop-white)",
              color: "var(--coop-black)",
              boxShadow: "2px 2px 0px var(--coop-black)",
              "&:hover": {
                backgroundColor: "var(--coop-yellow)",
                boxShadow: "3px 3px 0px var(--coop-black)",
              },
              "&:active": {
                boxShadow: "none",
                transform: "translate(2px, 2px)",
              },
            }}
          >
            <NotificationsActiveIcon sx={{ fontSize: 20 }} />
          </IconButton>
        </Tooltip>
        <TextField
          multiline
          maxRows={4}
          fullWidth
          variant="outlined"
          placeholder={t("chat_input_placeholder", "Nachricht... (Enter = Senden)")}
          aria-label={t("chat_input_placeholder", "Nachricht... (Enter = Senden)")}
          value={message}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          sx={{
            "& .MuiOutlinedInput-root": {
              borderRadius: 0,
              border: sendSuccess ? "3px solid var(--coop-green)" : "3px solid var(--coop-black)",
              boxShadow: sendSuccess ? "4px 4px 0px var(--coop-green)" : "var(--coop-shadow)",
              backgroundColor: "var(--coop-white)",
              color: "var(--coop-black)",
              transition: "border-color 0.2s ease, box-shadow 0.2s ease",
              "& fieldset": { border: "none" },
              "&:hover": { boxShadow: sendSuccess ? "4px 4px 0px var(--coop-green)" : "var(--coop-shadow-hover)" },
              "&.Mui-focused": { boxShadow: sendSuccess ? "4px 4px 0px var(--coop-green)" : "var(--coop-shadow-hover)" },
            },
          }}
        />
        <IconButton
          onClick={handleSend}
          disabled={!message.trim()}
          aria-label={t("chat_input_send", "Nachricht senden")}
          sx={{
            width: 48,
            height: 48,
            minWidth: 48,
            borderRadius: 0,
            border: "3px solid var(--coop-black)",
            backgroundColor: message.trim() ? "var(--coop-accent)" : "var(--coop-gray-200)",
            color: "var(--coop-black)",
            boxShadow: "var(--coop-shadow-sm)",
            "&:hover": {
              backgroundColor: "var(--coop-accent-hover)",
              boxShadow: "var(--coop-shadow)",
            },
            "&:active": {
              boxShadow: "none",
              transform: "translate(2px, 2px)",
            },
            "&.Mui-disabled": {
              border: "3px solid var(--coop-gray-400)",
              backgroundColor: "var(--coop-gray-200)",
              color: "var(--coop-gray-400)",
              boxShadow: "2px 2px 0px var(--coop-gray-400)",
            },
          }}
        >
          <SendIcon />
        </IconButton>
      </Box>
      <Portal>
        <Snackbar
          open={error}
          autoHideDuration={3000}
          onClose={() => setError(false)}
          message={t("message_bar_error_publishing", "Fehler beim Senden der Nachricht")}
        />
      </Portal>
    </Paper>
  );
};

export default ChatInput;
