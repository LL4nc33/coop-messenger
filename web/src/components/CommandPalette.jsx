import React, { useCallback, useEffect, useState } from "react";
import { Box, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";

const CommandPalette = ({ commands, selectedIndex, onSelect }) => {
  const { t } = useTranslation();

  if (!commands || commands.length === 0) return null;

  return (
    <Box
      sx={{
        position: "absolute",
        bottom: "100%",
        left: 16,
        right: 16,
        mb: 0.5,
        border: "3px solid var(--coop-black)",
        boxShadow: "var(--coop-shadow)",
        backgroundColor: "var(--coop-white)",
        zIndex: 1300,
        maxHeight: 200,
        overflow: "auto",
      }}
    >
      {commands.map((cmd, index) => (
        <Box
          key={cmd.name}
          onClick={() => onSelect(cmd)}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            px: 2,
            py: 1,
            cursor: "pointer",
            backgroundColor: index === selectedIndex ? "var(--coop-accent)" : "transparent",
            borderBottom: index < commands.length - 1 ? "1px solid var(--coop-gray-200)" : "none",
            "&:hover": {
              backgroundColor: index === selectedIndex ? "var(--coop-accent)" : "var(--coop-gray-100)",
            },
          }}
        >
          <Typography
            variant="body2"
            sx={{
              fontFamily: "'JetBrains Mono', monospace",
              fontWeight: 700,
              color: "var(--coop-black)",
            }}
          >
            /{cmd.name}
          </Typography>
          {cmd.args && (
            <Typography
              variant="caption"
              sx={{
                fontFamily: "'JetBrains Mono', monospace",
                color: "var(--coop-gray-500)",
              }}
            >
              {cmd.args}
            </Typography>
          )}
          <Typography
            variant="caption"
            sx={{
              color: "var(--coop-gray-500)",
              fontFamily: "var(--coop-font-body)",
              ml: "auto",
            }}
          >
            {t(`command_${cmd.name}`, cmd.description)}
          </Typography>
        </Box>
      ))}
    </Box>
  );
};

export default CommandPalette;
