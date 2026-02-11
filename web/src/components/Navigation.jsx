import {
  Alert,
  Badge,
  Box,
  Button,
  CircularProgress,
  Divider,
  Drawer,
  IconButton,
  Link,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  ListSubheader,
  Portal,
  Tooltip,
  Typography,
  useTheme,
} from "@mui/material";
import * as React from "react";
import { useContext, useState, useRef, useEffect, useCallback } from "react";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import Person from "@mui/icons-material/Person";
import SettingsIcon from "@mui/icons-material/Settings";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import AddIcon from "@mui/icons-material/Add";
import { useLocation, useNavigate } from "react-router-dom";
import { ChatBubble, Home, MoreVert, NotificationsOffOutlined, Close } from "@mui/icons-material";
import ArticleIcon from "@mui/icons-material/Article";
import { Trans, useTranslation } from "react-i18next";
import CelebrationIcon from "@mui/icons-material/Celebration";
import SubscribeDialog from "./SubscribeDialog";
import { formatShortDateTime, topicDisplayName, topicUrl } from "../app/utils";
import routes from "./routes";
import { ConnectionState } from "../app/Connection";
import subscriptionManager from "../app/SubscriptionManager";
import notifier from "../app/Notifier";
import config from "../app/config";
import session from "../app/Session";
import accountApi, { Role } from "../app/AccountApi";
import UpgradeDialog from "./UpgradeDialog";
import { AccountContext } from "./App";
import { SubscriptionPopup } from "./SubscriptionPopup";
import { useLiveQuery } from "dexie-react-hooks";
import { useNotificationPermissionListener, useVersionChangeListener } from "./hooks";

const navWidth = 280;

const Navigation = (props) => {
  const { t } = useTranslation();
  const navigationList = <NavList {...props} />;
  return (
    <Box component="nav" role="navigation" sx={{ width: { sm: Navigation.width }, flexShrink: { sm: 0 } }}>
      {/* Mobile drawer; only shown if menu icon clicked (mobile open) and display is small */}
      <Drawer
        variant="temporary"
        role="menubar"
        open={props.mobileDrawerOpen}
        onClose={props.onMobileDrawerToggle}
        ModalProps={{ keepMounted: true }}
        sx={{
          zIndex: 1300,
          display: { xs: "block", sm: "none" },
          "& .MuiDrawer-paper": { boxSizing: "border-box", width: navWidth, backgroundImage: "none" },
        }}
      >
        <Box sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          px: 2,
          py: 1,
          minHeight: 56,
          borderBottom: "var(--coop-border)",
          background: "var(--coop-accent)",
        }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box
              component="img"
              src="/static/images/coop.png"
              alt="Coop"
              sx={{ width: 28, height: 28, imageRendering: "pixelated" }}
            />
            <Typography sx={{ fontFamily: "'Space Grotesk'", fontWeight: 800, fontSize: 18, color: "var(--coop-black)" }}>COOP</Typography>
          </Box>
          <IconButton onClick={props.onMobileDrawerToggle} aria-label={t("nav_button_close_menu", "Menue schliessen")}>
            <Close />
          </IconButton>
        </Box>
        {navigationList}
      </Drawer>
      {/* Big screen drawer; persistent, shown if screen is big */}
      <Drawer
        open
        variant="permanent"
        role="menubar"
        sx={{
          display: { xs: "none", sm: "block" },
          "& .MuiDrawer-paper": { boxSizing: "border-box", width: navWidth },
        }}
      >
        {navigationList}
      </Drawer>
    </Box>
  );
};
Navigation.width = navWidth;

const NavList = (props) => {
  const theme = useTheme();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { account } = useContext(AccountContext);
  const [subscribeDialogKey, setSubscribeDialogKey] = useState(0);
  const [subscribeDialogOpen, setSubscribeDialogOpen] = useState(false);
  const [versionChanged, setVersionChanged] = useState(false);

  const handleVersionChange = () => {
    setVersionChanged(true);
  };

  useVersionChangeListener(handleVersionChange);

  const handleSubscribeReset = () => {
    setSubscribeDialogOpen(false);
    setSubscribeDialogKey((prev) => prev + 1);
  };

  const handleSubscribeSubmit = (subscription) => {
    console.log(`[Navigation] New subscription added`);
    handleSubscribeReset();
    navigate(routes.forSubscription(subscription));
  };

  const handleAccountClick = () => {
    accountApi.sync(); // Dangle!
    navigate(routes.account);
  };

  const listRef = useRef(null);
  const [indicatorStyle, setIndicatorStyle] = useState({ top: 0, height: 0, opacity: 0 });

  const updateIndicator = useCallback(() => {
    if (listRef.current) {
      const selected = listRef.current.querySelector('.Mui-selected');
      if (selected) {
        setIndicatorStyle({
          top: selected.offsetTop,
          height: selected.offsetHeight,
          opacity: 1,
        });
      } else {
        setIndicatorStyle(prev => ({ ...prev, opacity: 0 }));
      }
    }
  }, []);

  useEffect(() => {
    updateIndicator();
  }, [props.selectedSubscription, location.pathname, updateIndicator]);

  const isAdmin = account?.role === Role.ADMIN;
  const isPaid = account?.billing?.subscription;
  const showUpgradeBanner = config.enable_payments && !isAdmin && !isPaid;
  const showSubscriptionsList = props.subscriptions?.length > 0;
  const showNotificationPermissionRequired = useNotificationPermissionListener(() => notifier.notRequested());
  const showNotificationPermissionDenied = useNotificationPermissionListener(() => notifier.denied());
  const showNotificationIOSInstallRequired = notifier.iosSupportedButInstallRequired();
  const showNotificationBrowserNotSupportedBox = !showNotificationIOSInstallRequired && !notifier.browserSupported();
  const showNotificationContextNotSupportedBox = notifier.browserSupported() && !notifier.contextSupported(); // Only show if notifications are generally supported in the browser

  const alertVisible =
    versionChanged ||
    showNotificationPermissionRequired ||
    showNotificationPermissionDenied ||
    showNotificationIOSInstallRequired ||
    showNotificationBrowserNotSupportedBox ||
    showNotificationContextNotSupportedBox;

  return (
    <>
      <Box sx={{
        display: { xs: "none", sm: "flex" },
        alignItems: "center",
        gap: 1.5,
        px: 2,
        py: 1.5,
        minHeight: 64,
        borderBottom: "1px solid var(--coop-gray-200)",
      }}>
        <Box
          component="img"
          src="/static/images/coop.png"
          alt="Coop"
          sx={{ width: 32, height: 32, imageRendering: "pixelated" }}
        />
        <Typography sx={{ fontFamily: "'Space Grotesk'", fontWeight: 800, fontSize: 20, letterSpacing: "2px", color: "var(--coop-black)" }}>
          COOP
        </Typography>
      </Box>
      <List ref={listRef} component="nav" sx={{ paddingTop: { xs: 0, sm: alertVisible ? 0 : "" }, position: "relative" }}>
        {/* Slide Indicator */}
        <Box sx={{
          position: "absolute",
          left: 0,
          width: 6,
          top: indicatorStyle.top,
          height: indicatorStyle.height,
          opacity: indicatorStyle.opacity,
          backgroundColor: "var(--coop-black)",
          transition: "top 0.25s cubic-bezier(0.4, 0, 0.2, 1), height 0.25s ease, opacity 0.15s ease",
          zIndex: 1,
          pointerEvents: "none",
        }} />
        {versionChanged && <VersionUpdateBanner />}
        {showNotificationPermissionRequired && <NotificationPermissionRequired />}
        {showNotificationPermissionDenied && <NotificationPermissionDeniedAlert />}
        {showNotificationBrowserNotSupportedBox && <NotificationBrowserNotSupportedAlert />}
        {showNotificationContextNotSupportedBox && <NotificationContextNotSupportedAlert />}
        {showNotificationIOSInstallRequired && <NotificationIOSInstallRequiredAlert />}
        {alertVisible && <Divider />}
        {!showSubscriptionsList && (
          <ListItemButton onClick={() => navigate(routes.app)} selected={location.pathname === config.app_root}>
            <ListItemIcon>
              <Home />
            </ListItemIcon>
            <ListItemText primary={t("nav_button_all_notifications")} />
          </ListItemButton>
        )}
        {showSubscriptionsList && (
          <>
            <ListSubheader sx={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700 }}>{t("nav_topics_title")}</ListSubheader>
            <ListItemButton onClick={() => navigate(routes.app)} selected={location.pathname === config.app_root}>
              <ListItemIcon>
                <Home />
              </ListItemIcon>
              <ListItemText primary={t("nav_button_all_notifications")} />
            </ListItemButton>
            <SubscriptionList subscriptions={props.subscriptions} selectedSubscription={props.selectedSubscription} onMobileDrawerToggle={props.onMobileDrawerToggle} />
            <Divider sx={{ my: 1 }} />
          </>
        )}
        {session.exists() && (
          <ListItemButton onClick={handleAccountClick} selected={location.pathname === routes.account}>
            <ListItemIcon>
              <Person />
            </ListItemIcon>
            <ListItemText primary={t("nav_button_account")} />
          </ListItemButton>
        )}
        {account?.role === "admin" && (
          <ListItemButton onClick={() => navigate(routes.admin)} selected={location.pathname === routes.admin}>
            <ListItemIcon>
              <AdminPanelSettingsIcon />
            </ListItemIcon>
            <ListItemText primary="Admin" />
          </ListItemButton>
        )}
        <ListItemButton onClick={() => navigate(routes.settings)} selected={location.pathname === routes.settings}>
          <ListItemIcon>
            <SettingsIcon />
          </ListItemIcon>
          <ListItemText primary={t("nav_button_settings")} />
        </ListItemButton>
        <ListItemButton onClick={() => navigate(routes.docs)} selected={location.pathname === routes.docs}>
          <ListItemIcon>
            <ArticleIcon />
          </ListItemIcon>
          <ListItemText primary={t("nav_button_documentation")} />
        </ListItemButton>
        <Box sx={{ px: 1.5, py: 1 }}>
          <Button
            fullWidth
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setSubscribeDialogOpen(true)}
            sx={{
              backgroundColor: "var(--coop-accent)",
              color: "var(--coop-black)",
              border: "3px solid var(--coop-black)",
              borderRadius: 0,
              boxShadow: "var(--coop-shadow)",
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              py: 1.2,
              "&:hover": {
                backgroundColor: "var(--coop-accent-hover)",
                boxShadow: "var(--coop-shadow-hover)",
                transform: "translate(-2px, -2px)",
              },
              "&:active": {
                boxShadow: "none",
                transform: "translate(4px, 4px)",
              },
            }}
          >
            {t("nav_button_subscribe")}
          </Button>
        </Box>
        {showUpgradeBanner && (
          // The text background gradient didn't seem to do well with switching between light/dark mode,
          // So adding a `key` forces React to replace the entire component when the theme changes
          <UpgradeBanner key={`upgrade-banner-${theme.palette.mode}`} mode={theme.palette.mode} />
        )}
      </List>
      <SubscribeDialog
        key={`subscribeDialog${subscribeDialogKey}`} // Resets dialog when canceled/closed
        open={subscribeDialogOpen}
        subscriptions={props.subscriptions}
        onCancel={handleSubscribeReset}
        onSuccess={handleSubscribeSubmit}
      />
    </>
  );
};

const UpgradeBanner = ({ mode }) => {
  const { t } = useTranslation();
  const [dialogKey, setDialogKey] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleClick = () => {
    setDialogKey((k) => k + 1);
    setDialogOpen(true);
  };

  return (
    <Box
      sx={{
        position: "fixed",
        width: `${Navigation.width - 1}px`,
        bottom: 0,
        mt: "auto",
        background:
          mode === "light"
            ? "linear-gradient(150deg, rgba(196, 228, 221, 0.46) 0%, rgb(255, 255, 255) 100%)"
            : "linear-gradient(150deg, #203631 0%, #2a6e60 100%)",
      }}
    >
      <Divider />
      <ListItemButton onClick={handleClick} sx={{ pt: 2, pb: 2 }}>
        <ListItemIcon>
          <CelebrationIcon sx={{ color: mode === "light" ? "#55b86e" : "#00ff95" }} fontSize="large" />
        </ListItemIcon>
        <ListItemText
          sx={{ ml: 1 }}
          primary={t("nav_upgrade_banner_label")}
          secondary={t("nav_upgrade_banner_description")}
          primaryTypographyProps={{
            style: {
              fontWeight: 500,
              fontSize: "1.1rem",
              background:
                mode === "light"
                  ? "-webkit-linear-gradient(45deg, #09009f, #00ff95 80%)"
                  : "-webkit-linear-gradient(45deg,rgb(255, 255, 255), #00ff95 80%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            },
          }}
          secondaryTypographyProps={{
            style: {
              fontSize: "1rem",
            },
          }}
        />
      </ListItemButton>
      <UpgradeDialog key={`upgradeDialog${dialogKey}`} open={dialogOpen} onCancel={() => setDialogOpen(false)} />
    </Box>
  );
};

const SubscriptionList = (props) => {
  const filteredSubscriptions = props.subscriptions.filter((s) => !s.internal);

  // Load last message timestamp per subscription for sorting by activity
  const lastMessageTimes = useLiveQuery(async () => {
    const times = {};
    for (const sub of filteredSubscriptions) {
      const notifications = await subscriptionManager.getNotifications(sub.id);
      const messages = notifications.filter((n) => n.event === "message");
      times[sub.id] = messages.length > 0 ? messages[0].time : 0;
    }
    return times;
  }, [filteredSubscriptions.map((s) => s.id).join(",")]);

  const sortedSubscriptions = [...filteredSubscriptions].sort((a, b) => {
    const timeA = lastMessageTimes?.[a.id] || 0;
    const timeB = lastMessageTimes?.[b.id] || 0;
    if (timeA !== timeB) return timeB - timeA; // Newest first
    return topicUrl(a.baseUrl, a.topic) < topicUrl(b.baseUrl, b.topic) ? -1 : 1; // Fallback: alphabetical
  });

  return (
    <>
      {sortedSubscriptions.map((subscription) => (
        <SubscriptionItem
          key={subscription.id}
          subscription={subscription}
          selected={props.selectedSubscription && props.selectedSubscription.id === subscription.id}
          onMobileDrawerToggle={props.onMobileDrawerToggle}
        />
      ))}
    </>
  );
};

const SubscriptionItem = (props) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);

  const { subscription } = props;
  const hasUnread = subscription.new > 0;
  const unreadCount = subscription.new <= 99 ? subscription.new : "99+";
  const displayName = topicDisplayName(subscription);
  const ariaLabel = subscription.state === ConnectionState.Connecting ? `${displayName} (${t("nav_button_connecting")})` : displayName;
  const icon =
    subscription.state === ConnectionState.Connecting ? (
      <CircularProgress size="24px" />
    ) : (
      <ChatBubbleOutlineIcon />
    );

  // Letzte Nachricht fuer Vorschau laden
  const lastNotification = useLiveQuery(
    () => subscriptionManager.getNotifications(subscription.id).then((notifications) => {
      const messages = notifications.filter((n) => n.event === "message");
      return messages.length > 0 ? messages[0] : null;
    }),
    [subscription.id]
  );

  const previewText = lastNotification
    ? `${lastNotification.sender ? lastNotification.sender + ": " : ""}${(lastNotification.message || "").substring(0, 40)}`
    : null;
  const timeText = lastNotification ? formatShortDateTime(lastNotification.time, i18n.language) : null;

  const handleClick = async () => {
    navigate(routes.forSubscription(subscription));
    await subscriptionManager.markNotificationsRead(subscription.id);
    // Auto-close mobile drawer on chat selection
    if (window.innerWidth < 600 && props.onMobileDrawerToggle) {
      props.onMobileDrawerToggle();
    }
  };

  return (
    <>
      <ListItemButton onClick={handleClick} selected={props.selected} aria-label={ariaLabel} aria-live="polite" sx={{ alignItems: "flex-start", py: 1 }}>
        <ListItemIcon sx={{ mt: 1 }}>{icon}</ListItemIcon>
        <ListItemText
          primary={
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Typography
                variant="body1"
                sx={{
                  fontWeight: hasUnread ? 700 : 400,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  flexGrow: 1,
                }}
              >
                {displayName}
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, flexShrink: 0, ml: 1 }}>
                {timeText && (
                  <Typography variant="caption" sx={{ color: hasUnread ? "var(--coop-black)" : "text.secondary", fontFamily: "monospace", fontSize: "0.7rem", fontWeight: hasUnread ? 700 : 400 }}>
                    {timeText}
                  </Typography>
                )}
                {hasUnread && (
                  <Box sx={{
                    backgroundColor: "var(--coop-pink)",
                    color: "#fff",
                    border: "2px solid var(--coop-black)",
                    fontFamily: "var(--coop-font-display)",
                    fontWeight: 700,
                    fontSize: "0.65rem",
                    minWidth: 20,
                    height: 20,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    px: 0.5,
                  }}>
                    {unreadCount}
                  </Box>
                )}
              </Box>
            </Box>
          }
          secondary={previewText}
          secondaryTypographyProps={{
            sx: {
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              fontSize: "0.8rem",
              color: hasUnread ? "var(--coop-black)" : "text.secondary",
              fontWeight: hasUnread ? 600 : 400,
            },
          }}
        />
        {subscription.mutedUntil > 0 && (
          <ListItemIcon edge="end" sx={{ minWidth: "26px", mt: 1 }} aria-label={t("nav_button_muted")}>
            <Tooltip title={t("nav_button_muted")}>
              <NotificationsOffOutlined fontSize="small" />
            </Tooltip>
          </ListItemIcon>
        )}
        <ListItemIcon edge="end" sx={{ minWidth: "26px", mt: 1 }}>
          <IconButton
            size="small"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              setMenuAnchorEl(e.currentTarget);
            }}
            aria-label={t("nav_button_chat_options", "Chat-Optionen")}
          >
            <MoreVert fontSize="small" />
          </IconButton>
        </ListItemIcon>
      </ListItemButton>
      <Portal>
        <SubscriptionPopup subscription={subscription} anchor={menuAnchorEl} onClose={() => setMenuAnchorEl(null)} />
      </Portal>
    </>
  );
};

const NotificationPermissionRequired = () => {
  const { t } = useTranslation();
  const [dismissed, setDismissed] = useState(false);
  const requestPermission = async () => {
    await notifier.maybeRequestPermission();
  };
  if (dismissed) return null;
  return (
    <Alert severity="warning" sx={{ py: 0.5 }} onClose={() => setDismissed(true)}>
      <Typography variant="body2">{t("alert_notification_permission_required_description")}</Typography>
      <Button color="inherit" size="small" onClick={requestPermission} sx={{ mt: 0.5 }}>
        {t("alert_notification_permission_required_button")}
      </Button>
    </Alert>
  );
};

const NotificationPermissionDeniedAlert = () => {
  const { t } = useTranslation();
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return (
    <Alert severity="warning" sx={{ py: 0.5 }} onClose={() => setDismissed(true)}>
      <Typography variant="body2">{t("alert_notification_permission_denied_description")}</Typography>
    </Alert>
  );
};

const NotificationIOSInstallRequiredAlert = () => {
  const { t } = useTranslation();
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return (
    <Alert severity="warning" sx={{ py: 0.5 }} onClose={() => setDismissed(true)}>
      <Typography variant="body2">{t("alert_notification_ios_install_required_description")}</Typography>
    </Alert>
  );
};

const NotificationBrowserNotSupportedAlert = () => {
  const { t } = useTranslation();
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return (
    <Alert severity="warning" sx={{ py: 0.5 }} onClose={() => setDismissed(true)}>
      <Typography variant="body2">{t("alert_not_supported_description")}</Typography>
    </Alert>
  );
};

const NotificationContextNotSupportedAlert = () => {
  const { t } = useTranslation();
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return (
    <Alert severity="warning" sx={{ py: 0.5 }} onClose={() => setDismissed(true)}>
      <Typography variant="body2">
        <Trans
          i18nKey="alert_not_supported_context_description"
          components={{
            mdnLink: <Link href="https://developer.mozilla.org/en-US/docs/Web/API/notification" target="_blank" rel="noopener" />,
          }}
        />
      </Typography>
    </Alert>
  );
};

const VersionUpdateBanner = () => {
  const { t } = useTranslation();
  const handleRefresh = () => {
    window.location.reload();
  };
  return (
    <Alert severity="info" sx={{ py: 0.5 }}>
      <Typography variant="body2">{t("version_update_available_description")}</Typography>
      <Button color="inherit" size="small" onClick={handleRefresh} sx={{ mt: 0.5 }}>
        {t("common_refresh")}
      </Button>
    </Alert>
  );
};

export default Navigation;
