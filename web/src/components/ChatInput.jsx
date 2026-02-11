import { useState } from "react";
import { Paper, TextField, IconButton, Portal, Snackbar } from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import { useTranslation } from "react-i18next";
import Navigation from "./Navigation";

const ChatInput = ({ onSend }) => {
  const { t } = useTranslation();
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);

  const handleSend = async () => {
    if (message.trim()) {
      try {
        await onSend(message.trim());
        setMessage("");
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
        display: "flex",
        alignItems: "flex-end",
        gap: 1,
        position: "fixed",
        bottom: 0,
        right: 0,
        padding: 2,
        width: { xs: "100%", sm: `calc(100% - ${Navigation.width}px)` },
        borderTop: "3px solid var(--coop-black)",
        backgroundColor: "var(--coop-gray-100)",
        borderRadius: 0,
      }}
    >
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
            border: "3px solid var(--coop-black)",
            boxShadow: "var(--coop-shadow)",
            backgroundColor: "var(--coop-white)",
            color: "var(--coop-black)",
            "& fieldset": { border: "none" },
            "&:hover": { boxShadow: "var(--coop-shadow-hover)" },
            "&.Mui-focused": { boxShadow: "var(--coop-shadow-hover)" },
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
