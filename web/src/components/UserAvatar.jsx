import React from "react";
import { Avatar, Box } from "@mui/material";

const avatarColors = ["#FF6B9D", "#3B82F6", "#FFD700", "#22C55E", "#A855F7", "#EF4444", "#F97316", "#06B6D4"];

const getInitials = (displayName, username) => {
  const name = displayName || username;
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name[0].toUpperCase();
};

const getAvatarColor = (username) => {
  if (!username) return avatarColors[0];
  let hash = 0;
  for (let i = 0; i < username.length; i++) hash = username.charCodeAt(i) + ((hash << 5) - hash);
  return avatarColors[Math.abs(hash) % avatarColors.length];
};

const sizes = {
  sm: 28,
  md: 36,
  lg: 120,
};

const UserAvatar = ({ username, displayName, avatarUrl, size = "md", onClick }) => {
  const px = sizes[size] || sizes.md;
  const initials = getInitials(displayName, username);
  const bgColor = getAvatarColor(username);
  const fontSize = size === "lg" ? "2.5rem" : size === "sm" ? "0.7rem" : "0.85rem";
  const borderWidth = size === "lg" ? 3 : 2;

  return (
    <Box
      onClick={onClick}
      sx={{
        cursor: onClick ? "pointer" : "default",
        flexShrink: 0,
      }}
    >
      {avatarUrl ? (
        <Avatar
          src={avatarUrl}
          sx={{
            width: px,
            height: px,
            border: `${borderWidth}px solid var(--coop-black)`,
          }}
        />
      ) : (
        <Avatar
          sx={{
            width: px,
            height: px,
            border: `${borderWidth}px solid var(--coop-black)`,
            backgroundColor: bgColor,
            color: "#fff",
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 700,
            fontSize,
          }}
        >
          {initials}
        </Avatar>
      )}
    </Box>
  );
};

export { getInitials, getAvatarColor };
export default UserAvatar;
