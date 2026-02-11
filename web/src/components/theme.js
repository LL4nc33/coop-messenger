/** @type {import("@mui/material").ThemeOptions} */
const baseThemeOptions = {
  typography: {
    fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif",
    h1: { fontFamily: "'Space Grotesk', 'Arial Black', sans-serif", fontWeight: 700 },
    h2: { fontFamily: "'Space Grotesk', 'Arial Black', sans-serif", fontWeight: 700 },
    h3: { fontFamily: "'Space Grotesk', 'Arial Black', sans-serif", fontWeight: 700 },
    h4: { fontFamily: "'Space Grotesk', 'Arial Black', sans-serif", fontWeight: 700 },
    h5: { fontFamily: "'Space Grotesk', 'Arial Black', sans-serif", fontWeight: 700 },
    h6: { fontFamily: "'Space Grotesk', 'Arial Black', sans-serif", fontWeight: 700 },
    button: { fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" },
  },
  shape: { borderRadius: 0 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          border: "3px solid #000",
          boxShadow: "4px 4px 0px #000",
          borderRadius: 0,
          "&:hover": { transform: "translate(-2px, -2px)", boxShadow: "6px 6px 0px #000" },
          "&:active": { transform: "translate(2px, 2px)", boxShadow: "none" },
          transition: "transform 0.1s ease, box-shadow 0.1s ease",
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { border: "3px solid #000", boxShadow: "4px 4px 0px #000", borderRadius: 0 },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: { border: "3px solid #000", boxShadow: "4px 4px 0px #000", borderRadius: 0 },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          "& .MuiOutlinedInput-root": {
            borderRadius: 0,
            "& fieldset": { border: "3px solid #000" },
            "&:hover fieldset": { border: "3px solid #000" },
            "&.Mui-focused fieldset": { border: "3px solid #3B82F6", boxShadow: "4px 4px 0px #000" },
          },
        },
      },
    },
    MuiListItemIcon: { styleOverrides: { root: { minWidth: "36px" } } },
    MuiCardContent: { styleOverrides: { root: { ":last-child": { paddingBottom: "16px" } } } },
    MuiCardActions: { styleOverrides: { root: { overflowX: "auto" } } },
    MuiDrawer: {
      styleOverrides: {
        paper: { borderRight: "3px solid #000", borderRadius: 0 },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: { borderBottom: "3px solid #000", boxShadow: "none", borderRadius: 0 },
      },
    },
  },
};

/** @type {import("@mui/material").ThemeOptions} */
export const lightTheme = {
  ...baseThemeOptions,
  components: { ...baseThemeOptions.components },
  palette: {
    mode: "light",
    background: { default: "#FFFDF7", paper: "#FFFFFF" },
    primary: { main: "#C4A265" },
    secondary: { main: "#3B82F6" },
    error: { main: "#EF4444" },
    success: { main: "#22C55E" },
    warning: { main: "#F97316" },
    text: { primary: "#000000", secondary: "#404040" },
  },
};

/** @type {import("@mui/material").ThemeOptions} */
export const darkTheme = {
  ...baseThemeOptions,
  components: {
    ...baseThemeOptions.components,
    MuiButton: {
      styleOverrides: {
        root: {
          ...baseThemeOptions.components.MuiButton.styleOverrides.root,
          border: "3px solid #FFFDF7",
          boxShadow: "4px 4px 0px rgba(255,255,255,0.3)",
          "&:hover": { transform: "translate(-2px, -2px)", boxShadow: "6px 6px 0px rgba(255,255,255,0.3)" },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { border: "3px solid #FFFDF7", boxShadow: "4px 4px 0px rgba(255,255,255,0.3)", borderRadius: 0 },
      },
    },
    MuiSnackbarContent: { styleOverrides: { root: { color: "#000", backgroundColor: "#aeaeae" } } },
  },
  palette: {
    mode: "dark",
    background: { default: "#1a1a1a", paper: "#2a2a2a" },
    primary: { main: "#8B9A6B" },
    secondary: { main: "#3B82F6" },
    error: { main: "#EF4444" },
    success: { main: "#22C55E" },
    text: { primary: "#FFFDF7", secondary: "#D4D4CF" },
  },
};
