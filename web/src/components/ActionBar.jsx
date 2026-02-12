import { AppBar, Toolbar, IconButton, Typography, Box, MenuItem, Button, Divider, ListItemIcon, Tooltip, useTheme, useMediaQuery } from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import PeopleOutlineIcon from "@mui/icons-material/PeopleOutline";
import NotificationsIcon from "@mui/icons-material/Notifications";
import NotificationsOffIcon from "@mui/icons-material/NotificationsOff";
import { useTranslation } from "react-i18next";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import { Logout, Person, Settings } from "@mui/icons-material";
import Brightness4Icon from "@mui/icons-material/Brightness4";
import Brightness7Icon from "@mui/icons-material/Brightness7";
import config from "../app/config";
import session from "../app/Session";
import subscriptionManager from "../app/SubscriptionManager";
import routes from "./routes";
import db from "../app/db";
import { topicDisplayName, darkModeEnabled } from "../app/utils";
import Navigation from "./Navigation";
import accountApi from "../app/AccountApi";
import PopupMenu from "./PopupMenu";
import MemberList from "./MemberList";
import { SubscriptionPopup } from "./SubscriptionPopup";
import { useIsLaunchedPWA } from "./hooks";
import prefs, { THEME } from "../app/Prefs";
import { useLiveQuery } from "dexie-react-hooks";

const ActionBar = (props) => {
  const theme = useTheme();
  const { t } = useTranslation();
  const location = useLocation();
  const isLaunchedPWA = useIsLaunchedPWA();
  const themePreference = useLiveQuery(() => prefs.theme());
  const prefersDarkMode = useMediaQuery("(prefers-color-scheme: dark)");
  const isDark = darkModeEnabled(prefersDarkMode, themePreference);

  let title = t("nav_button_all_notifications", "Startseite");
  if (props.selected) {
    title = topicDisplayName(props.selected);
  } else if (location.pathname === routes.settings) {
    title = t("action_bar_settings");
  } else if (location.pathname === routes.account) {
    title = t("action_bar_account");
  } else if (location.pathname === routes.admin) {
    title = "Admin";
  } else if (location.pathname === routes.docs) {
    title = t("nav_button_documentation", "Dokumentation");
  }

  const getActionBarBackground = () => {
    if (isLaunchedPWA) {
      return "var(--coop-accent)";
    }
    return isDark ? "var(--coop-bg-dark)" : "var(--coop-accent)";
  };

  const handleThemeToggle = async () => {
    const next = isDark ? THEME.LIGHT : THEME.DARK;
    await prefs.setTheme(next);
  };

  const getThemeIcon = () => {
    return isDark ? <Brightness4Icon /> : <Brightness7Icon />;
  };

  const getThemeTooltip = () => {
    return isDark
      ? t("action_bar_theme_light", "Zum hellen Modus wechseln")
      : t("action_bar_theme_dark", "Zum dunklen Modus wechseln");
  };

  const fg = isDark ? "var(--coop-white)" : "var(--coop-black)";

  return (
    <AppBar
      position="fixed"
      sx={{
        width: { xs: "100%", sm: `calc(100% - ${Navigation.width}px)` },
        zIndex: { xs: 1100, sm: 1200 },
        ml: { sm: `${Navigation.width}px` },
      }}
    >
      <Toolbar
        sx={{
          pr: "24px",
          background: getActionBarBackground(),
          color: fg,
        }}
      >
        <IconButton
          edge="start"
          aria-label={t("action_bar_show_menu")}
          onClick={props.onMobileDrawerToggle}
          sx={{ mr: 2, display: { sm: "none" }, color: fg }}
        >
          <MenuIcon />
        </IconButton>
        <Box
          component="img"
          src="/static/images/coop.png"
          alt="Coop"
          sx={{
            display: { xs: "none", sm: "flex" },
            mr: "10px",
            width: 36,
            height: 36,
            imageRendering: "pixelated",
            border: `2px solid ${fg}`,
          }}
        />
        <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 22 }}>
          {title}
        </Typography>
        <Tooltip title={getThemeTooltip()}>
          <IconButton
            color="inherit"
            size="large"
            onClick={handleThemeToggle}
            aria-label={t("action_bar_theme_toggle", "Theme wechseln")}
          >
            {getThemeIcon()}
          </IconButton>
        </Tooltip>
        {props.selected && <SettingsIcons subscription={props.selected} onUnsubscribe={props.onUnsubscribe} />}
        <ProfileIcon />
      </Toolbar>
    </AppBar>
  );
};

const SettingsIcons = (props) => {
  const { t } = useTranslation();
  const [anchorEl, setAnchorEl] = useState(null);
  const [memberListOpen, setMemberListOpen] = useState(false);
  const { subscription } = props;

  const handleToggleMute = async () => {
    const mutedUntil = subscription.mutedUntil ? 0 : 1;
    await subscriptionManager.setMutedUntil(subscription.id, mutedUntil);
  };

  return (
    <>
      <Tooltip title={t("action_bar_member_list", "Mitglieder anzeigen")}>
        <IconButton color="inherit" size="large" edge="end" onClick={() => setMemberListOpen(true)} aria-label={t("action_bar_member_list", "Mitglieder anzeigen")}>
          <PeopleOutlineIcon />
        </IconButton>
      </Tooltip>
      <Tooltip title={subscription.mutedUntil ? t("action_bar_unmute_notifications", "Stummschaltung aufheben") : t("action_bar_mute_notifications", "Stumm schalten")}>
        <IconButton color="inherit" size="large" edge="end" onClick={handleToggleMute} aria-label={t("action_bar_toggle_mute")}>
          {subscription.mutedUntil ? <NotificationsOffIcon /> : <NotificationsIcon />}
        </IconButton>
      </Tooltip>
      <Tooltip title={t("action_bar_toggle_action_menu", "Aktionsmenue oeffnen/schliessen")}>
        <IconButton
          color="inherit"
          size="large"
          edge="end"
          onClick={(ev) => setAnchorEl(ev.currentTarget)}
          aria-label={t("action_bar_toggle_action_menu")}
        >
          <MoreVertIcon />
        </IconButton>
      </Tooltip>
      <SubscriptionPopup subscription={subscription} anchor={anchorEl} placement="right" onClose={() => setAnchorEl(null)} />
      <MemberList open={memberListOpen} onClose={() => setMemberListOpen(false)} topic={subscription.topic} />
    </>
  );
};

const ProfileIcon = () => {
  const { t } = useTranslation();
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);
  const navigate = useNavigate();

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    try {
      await accountApi.logout();
      await db().delete();
    } finally {
      await session.resetAndRedirect(routes.app);
    }
  };

  return (
    <>
      {session.exists() && (
        <Tooltip title={t("action_bar_profile_title", "Profil")}>
          <IconButton color="inherit" size="large" edge="end" onClick={handleClick} aria-label={t("action_bar_profile_title")}>
            <AccountCircleIcon />
          </IconButton>
        </Tooltip>
      )}
      {!session.exists() && config.enable_login && (
        <Button color="inherit" variant="text" onClick={() => navigate(routes.login)} sx={{ m: 1 }} aria-label={t("action_bar_sign_in")}>
          {t("action_bar_sign_in")}
        </Button>
      )}
      {!session.exists() && config.enable_signup && (
        <Button color="inherit" variant="outlined" onClick={() => navigate(routes.signup)} aria-label={t("action_bar_sign_up")}>
          {t("action_bar_sign_up")}
        </Button>
      )}
      <PopupMenu horizontal="right" anchorEl={anchorEl} open={open} onClose={handleClose}>
        <MenuItem onClick={() => navigate(routes.account)}>
          <ListItemIcon>
            <Person />
          </ListItemIcon>
          <b>{session.username()}</b>
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => navigate(routes.settings)}>
          <ListItemIcon>
            <Settings fontSize="small" />
          </ListItemIcon>
          {t("action_bar_profile_settings")}
        </MenuItem>
        <MenuItem onClick={handleLogout}>
          <ListItemIcon>
            <Logout fontSize="small" />
          </ListItemIcon>
          {t("action_bar_profile_logout")}
        </MenuItem>
      </PopupMenu>
    </>
  );
};

export default ActionBar;
