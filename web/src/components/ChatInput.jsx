import { useContext, useRef, useState } from "react";
import { Box, IconButton, Paper, Portal, Snackbar, TextField, Typography } from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import CloseIcon from "@mui/icons-material/Close";
import { useTranslation } from "react-i18next";
import Navigation from "./Navigation";
import { ReplyContext } from "./App";

const ChatInput = ({ onSend }) => {
  const { t } = useTranslation();
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  const successTimerRef = useRef(null);
  const { replyTo, setReplyTo } = useContext(ReplyContext);

  const handleSend = async () => {
    if (message.trim()) {
      try {
        const options = {};
        if (replyTo) {
          options.reply_to = replyTo.id;
        }
        await onSend(message.trim(), options);
        setMessage("");
        setReplyTo(null);
        // Flash green border briefly
        setSendSuccess(true);
        clearTimeout(successTimerRef.current);
        successTimerRef.current = setTimeout(() => setSendSuccess(false), 400);
      } catch (e) {
        console.error("[ChatInput] Error sending", e);
        setError(true);
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
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

      <Box sx={{ display: "flex", alignItems: "flex-end", gap: 1, padding: 2 }}>
        <TextField
          multiline
          maxRows={4}
          fullWidth
          variant="outlined"
          placeholder={t("chat_input_placeholder", "Nachricht... (Enter = Senden)")}
          aria-label={t("chat_input_placeholder", "Nachricht... (Enter = Senden)")}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
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
