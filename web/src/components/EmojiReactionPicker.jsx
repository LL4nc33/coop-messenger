import { useState } from "react";
import { Box, IconButton, Popover } from "@mui/material";
import AddReactionIcon from "@mui/icons-material/AddReaction";
import { useTranslation } from "react-i18next";

const quickReactions = ["\u{1F44D}", "\u{2764}\u{FE0F}", "\u{1F602}", "\u{1F62E}", "\u{1F622}", "\u{1F525}"];

const EmojiReactionPicker = ({ onSelect }) => {
  const { t } = useTranslation();
  const [anchorEl, setAnchorEl] = useState(null);

  const handleOpen = (e) => {
    e.stopPropagation();
    setAnchorEl(e.currentTarget);
  };

  const handleClose = () => setAnchorEl(null);

  const handleSelect = (emoji) => {
    onSelect(emoji);
    handleClose();
  };

  return (
    <>
      <IconButton
        className="reply-btn"
        size="small"
        onClick={handleOpen}
        aria-label={t("chat_reaction_add", "Reaktion hinzufuegen")}
        sx={{ opacity: 0, transition: "opacity 0.15s", p: 0.25 }}
      >
        <AddReactionIcon sx={{ fontSize: 14 }} />
      </IconButton>
      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        transformOrigin={{ vertical: "bottom", horizontal: "center" }}
        slotProps={{
          paper: {
            sx: {
              borderRadius: 0,
              border: "3px solid var(--coop-black)",
              boxShadow: "var(--coop-shadow)",
              p: 0.5,
              display: "flex",
              gap: 0.25,
            },
          },
        }}
      >
        {quickReactions.map((emoji) => (
          <Box
            key={emoji}
            onClick={() => handleSelect(emoji)}
            sx={{
              cursor: "pointer",
              fontSize: "1.3rem",
              width: 36,
              height: 36,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 0,
              "&:hover": {
                backgroundColor: "var(--coop-gray-100)",
                border: "2px solid var(--coop-black)",
              },
            }}
          >
            {emoji}
          </Box>
        ))}
      </Popover>
    </>
  );
};

export default EmojiReactionPicker;
