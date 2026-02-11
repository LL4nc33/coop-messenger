import { useEffect } from "react";
import { Box, IconButton, Modal } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

const ImageLightbox = ({ open, onClose, src, alt }) => {
  useEffect(() => {
    if (!open) return;
    const handleKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  return (
    <Modal open={open} onClose={onClose}>
      <Box
        onClick={onClose}
        sx={{
          position: "fixed",
          inset: 0,
          backgroundColor: "rgba(0, 0, 0, 0.9)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1300,
        }}
      >
        <IconButton
          onClick={onClose}
          sx={{
            position: "absolute",
            top: 16,
            right: 16,
            width: 48,
            height: 48,
            borderRadius: 0,
            border: "3px solid white",
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            color: "white",
            boxShadow: "4px 4px 0px rgba(255, 255, 255, 0.3)",
            "&:hover": {
              backgroundColor: "rgba(0, 0, 0, 0.8)",
              boxShadow: "6px 6px 0px rgba(255, 255, 255, 0.3)",
            },
          }}
        >
          <CloseIcon />
        </IconButton>
        <Box
          component="img"
          src={src}
          alt={alt || ""}
          onClick={(e) => e.stopPropagation()}
          sx={{
            maxWidth: "90vw",
            maxHeight: "90vh",
            objectFit: "contain",
            border: "3px solid white",
            boxShadow: "8px 8px 0px rgba(255, 255, 255, 0.2)",
          }}
        />
      </Box>
    </Modal>
  );
};

export default ImageLightbox;
