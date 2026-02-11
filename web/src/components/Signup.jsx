import { useState } from "react";
import { TextField, Button, Box, Typography, InputAdornment, IconButton } from "@mui/material";
import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import accountApi from "../app/AccountApi";
import AvatarBox from "./AvatarBox";
import session from "../app/Session";
import routes from "./routes";
import { AccountCreateLimitReachedError, UserExistsError } from "../app/errors";

const neoInputSx = {
  "& .MuiOutlinedInput-root": {
    borderRadius: 0,
    border: "3px solid var(--coop-black)",
    boxShadow: "var(--coop-shadow)",
    "& fieldset": { border: "none" },
    "&:hover": { boxShadow: "var(--coop-shadow-hover)" },
    "&.Mui-focused": { boxShadow: "var(--coop-shadow-hover)" },
  },
  "& .MuiInputLabel-root": {
    fontWeight: 600,
  },
  "& .MuiInputLabel-shrink": {
    transform: "translate(14px, -9px) scale(0.75)",
    backgroundColor: "var(--coop-bg)",
    padding: "0 6px",
  },
};

const neoButtonSx = {
  mt: 2,
  mb: 2,
  borderRadius: 0,
  border: "3px solid var(--coop-black)",
  boxShadow: "var(--coop-shadow)",
  backgroundColor: "var(--coop-accent)",
  color: "var(--coop-black)",
  fontWeight: 700,
  fontFamily: "'Space Grotesk', sans-serif",
  fontSize: "1rem",
  "&:hover": {
    backgroundColor: "var(--coop-accent-hover)",
    boxShadow: "var(--coop-shadow-hover)",
  },
  "&:active": {
    boxShadow: "none",
    transform: "translate(2px, 2px)",
  },
  "&.Mui-disabled": {
    border: "3px solid var(--coop-gray-400)",
    backgroundColor: "var(--coop-gray-200)",
    boxShadow: "2px 2px 0px var(--coop-gray-400)",
  },
};

const Signup = () => {
  const { t } = useTranslation();
  const [error, setError] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const user = { username, password };
    try {
      await accountApi.create(user.username, user.password);
      const token = await accountApi.login(user);
      console.log(`[Signup] User signup successful`);
      await session.store(user.username, token);
      window.location.href = routes.app;
    } catch (e) {
      console.log(`[Signup] Signup failed`, e);
      if (e instanceof UserExistsError) {
        setError(t("signup_error_username_taken", { username: e.username }));
      } else if (e instanceof AccountCreateLimitReachedError) {
        setError(t("signup_error_creation_limit_reached"));
      } else {
        setError(e.message);
      }
    }
  };

  if (!config.enable_signup) {
    return (
      <AvatarBox>
        <Typography sx={{ typography: "h6" }}>{t("signup_disabled")}</Typography>
      </AvatarBox>
    );
  }

  return (
    <AvatarBox>
      <Typography sx={{ typography: "h6", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700 }}>
        {t("signup_title")}
      </Typography>
      <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1, width: "100%" }}>
        <TextField
          margin="dense"
          required
          fullWidth
          id="username"
          label={t("signup_form_username")}
          name="username"
          variant="outlined"
          value={username}
          onChange={(ev) => setUsername(ev.target.value.trim())}
          autoFocus
          sx={neoInputSx}
        />
        <TextField
          margin="dense"
          required
          fullWidth
          name="password"
          label={t("signup_form_password")}
          type={showPassword ? "text" : "password"}
          id="password"
          variant="outlined"
          autoComplete="new-password"
          value={password}
          onChange={(ev) => setPassword(ev.target.value.trim())}
          sx={neoInputSx}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  aria-label={t("signup_form_toggle_password_visibility")}
                  onClick={() => setShowPassword(!showPassword)}
                  onMouseDown={(ev) => ev.preventDefault()}
                  edge="end"
                >
                  {showPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
        <TextField
          margin="dense"
          required
          fullWidth
          name="confirm"
          label={t("signup_form_confirm_password")}
          type={showConfirm ? "text" : "password"}
          id="confirm"
          variant="outlined"
          autoComplete="new-password"
          value={confirm}
          onChange={(ev) => setConfirm(ev.target.value.trim())}
          sx={neoInputSx}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  aria-label={t("signup_form_toggle_password_visibility")}
                  onClick={() => setShowConfirm(!showConfirm)}
                  onMouseDown={(ev) => ev.preventDefault()}
                  edge="end"
                >
                  {showConfirm ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
        {password && confirm && password !== confirm && (
          <Typography variant="caption" color="error" sx={{ mt: 0.5, display: "block" }}>
            {t("invite_error_passwords_mismatch", "Passwoerter stimmen nicht ueberein")}
          </Typography>
        )}
        <Button
          type="submit"
          fullWidth
          variant="contained"
          disabled={username === "" || password === "" || password !== confirm}
          sx={neoButtonSx}
        >
          {t("signup_form_button_submit")}
        </Button>
        {error && (
          <Box
            sx={{
              mb: 1,
              display: "flex",
              flexGrow: 1,
              justifyContent: "center",
            }}
          >
            <WarningAmberIcon color="error" sx={{ mr: 1 }} />
            <Typography sx={{ color: "error.main" }}>{error}</Typography>
          </Box>
        )}
      </Box>
      {config.enable_login && (
        <Typography sx={{ mb: 4 }}>
          <NavLink to={routes.login} variant="body1">
            {t("signup_already_have_account")}
          </NavLink>
        </Typography>
      )}
    </AvatarBox>
  );
};

export default Signup;
