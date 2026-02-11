import * as React from "react";
import { useContext, useState } from "react";
import {
  Alert,
  Box,
  Button,
  TextField,
  Dialog,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Chip,
  InputAdornment,
  Portal,
  Snackbar,
  Typography,
  useMediaQuery,
  MenuItem,
  IconButton,
  ListItemIcon,
  useTheme,
} from "@mui/material";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  Clear,
  ClearAll,
  ContentCopy,
  Edit,
  EnhancedEncryption,
  InfoOutlined,
  Lock,
  LockOpen,
  Notifications,
  NotificationsOff,
  RemoveCircle,
  Send,
  Share,
} from "@mui/icons-material";
import subscriptionManager from "../app/SubscriptionManager";
import DialogFooter from "./DialogFooter";
import accountApi, { Role } from "../app/AccountApi";
import session from "../app/Session";
import routes from "./routes";
import PopupMenu from "./PopupMenu";
import { formatShortDateTime, shuffle } from "../app/utils";
import api from "../app/Api";
import { AccountContext } from "./App";
import { ReserveAddDialog, ReserveDeleteDialog, ReserveEditDialog } from "./ReserveDialogs";
import { UnauthorizedError } from "../app/errors";

export const SubscriptionPopup = (props) => {
  const { t } = useTranslation();
  const { account } = useContext(AccountContext);
  const navigate = useNavigate();
  const [displayNameDialogOpen, setDisplayNameDialogOpen] = useState(false);
  const [chatInfoDialogOpen, setChatInfoDialogOpen] = useState(false);
  const [reserveAddDialogOpen, setReserveAddDialogOpen] = useState(false);
  const [reserveEditDialogOpen, setReserveEditDialogOpen] = useState(false);
  const [reserveDeleteDialogOpen, setReserveDeleteDialogOpen] = useState(false);
  const [showPublishError, setShowPublishError] = useState(false);
  const [showCopiedSnackbar, setShowCopiedSnackbar] = useState(false);
  const { subscription } = props;
  const placement = props.placement ?? "left";
  const reservations = account?.reservations || [];

  const showReservationAdd = config.enable_reservations && !subscription?.reservation && account?.stats.reservations_remaining > 0;
  const showReservationAddDisabled =
    !showReservationAdd &&
    config.enable_reservations &&
    !subscription?.reservation &&
    (config.enable_payments || account?.stats.reservations_remaining === 0);
  const showReservationEdit = config.enable_reservations && !!subscription?.reservation;
  const showReservationDelete = config.enable_reservations && !!subscription?.reservation;

  const handleShareChatId = async () => {
    const topicId = subscription.topic;
    if (navigator.share) {
      try {
        await navigator.share({
          title: t("share_chat_id_title", "Chat-ID teilen"),
          text: t("share_chat_id_text", "Tritt meinem Chat bei! Chat-ID: {{topic}}", { topic: topicId }),
        });
      } catch (e) {
        // User cancelled share or error - fall back to clipboard
        if (e.name !== "AbortError") {
          copyToClipboard(topicId);
          setShowCopiedSnackbar(true);
        }
      }
    } else {
      copyToClipboard(topicId);
      setShowCopiedSnackbar(true);
    }
    props.onClose();
  };

  const copyToClipboard = (text) => {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text);
    } else {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
  };

  const handleChangeDisplayName = async () => {
    setDisplayNameDialogOpen(true);
  };

  const handleReserveAdd = async () => {
    setReserveAddDialogOpen(true);
  };

  const handleReserveEdit = async () => {
    setReserveEditDialogOpen(true);
  };

  const handleReserveDelete = async () => {
    setReserveDeleteDialogOpen(true);
  };

  const handleSendTestMessage = async () => {
    const { baseUrl, topic } = props.subscription;
    const tags = shuffle([
      "grinning",
      "octopus",
      "upside_down_face",
      "palm_tree",
      "maple_leaf",
      "apple",
      "skull",
      "warning",
      "jack_o_lantern",
      "de-server-1",
      "backups",
      "cron-script",
      "script-error",
      "team-updates",
      "mouse",
      "go-rocks",
      "hi-ben",
    ]).slice(0, Math.round(Math.random() * 4));
    const priority = shuffle([1, 2, 3, 4, 5])[0];
    const title = shuffle([
      "",
      "",
      "", // Higher chance of no title
      "Oh my, another test message?",
      "Titles are optional, did you know that?",
      "Coop ist Open Source und wird immer kostenlos bleiben!",
      "I don't really like apples",
      "My favorite TV show is The Wire. You should watch it!",
      "You can attach files and URLs to messages too",
      "You can delay messages up to 3 days",
    ])[0];
    const nowSeconds = Math.round(Date.now() / 1000);
    const message = shuffle([
      `Hey! Das ist eine Testnachricht von Coop. Es ist gerade ${formatShortDateTime(nowSeconds, "de")}. Alles klar bei dir?`,
      `Coop ist Open Source - wenn es dir gefaellt, gib uns einen Stern auf GitHub!`,
      `Das ist eine Testnachricht. Coop laeuft auf deinem eigenen Server - keine Daten verlassen deine Infrastruktur.`,
      `Es ist schon ${formatShortDateTime(nowSeconds, "de")} - wo ist die Zeit geblieben? Hoffe dir geht's gut!`,
      `Wusstest du? Du kannst Dateien und Bilder an Nachrichten anhaengen.`,
      `Coop unterstuetzt Markdown, Tags, Prioritaeten und zeitversetzte Nachrichten.`,
      `Tipp: Enter sendet die Nachricht, Shift+Enter macht einen Zeilenumbruch.`,
    ])[0];
    try {
      await api.publish(baseUrl, topic, message, {
        title,
        priority,
        tags,
      });
    } catch (e) {
      console.log(`[SubscriptionPopup] Error publishing message`, e);
      setShowPublishError(true);
    }
  };

  const handleClearAll = async () => {
    console.log(`[SubscriptionPopup] Deleting all notifications from ${props.subscription.id}`);
    await subscriptionManager.deleteNotifications(props.subscription.id);
  };

  const handleSetMutedUntil = async (mutedUntil) => {
    await subscriptionManager.setMutedUntil(subscription.id, mutedUntil);
  };

  const handleUnsubscribe = async () => {
    console.log(`[SubscriptionPopup] Unsubscribing`);
    await subscriptionManager.remove(props.subscription);
    if (session.exists() && !subscription.internal) {
      try {
        await accountApi.deleteSubscription(props.subscription.baseUrl, props.subscription.topic);
      } catch (e) {
        console.log(`[SubscriptionPopup] Error unsubscribing`, e);
        if (e instanceof UnauthorizedError) {
          await session.resetAndRedirect(routes.login);
        }
      }
    }
    const newSelected = await subscriptionManager.first(); // May be undefined
    if (newSelected && !newSelected.internal) {
      navigate(routes.forSubscription(newSelected));
    } else {
      navigate(routes.app);
    }
  };

  return (
    <>
      <PopupMenu horizontal={placement} anchorEl={props.anchor} open={!!props.anchor} onClose={props.onClose}>
        <MenuItem onClick={() => { setChatInfoDialogOpen(true); props.onClose(); }}>
          <ListItemIcon>
            <InfoOutlined fontSize="small" />
          </ListItemIcon>
          {t("action_bar_chat_info", "Chat-Info")}
        </MenuItem>
        <MenuItem onClick={handleShareChatId}>
          <ListItemIcon>
            <Share fontSize="small" />
          </ListItemIcon>
          {t("action_bar_share_chat_id", "Chat-ID teilen")}
        </MenuItem>
        <MenuItem onClick={handleChangeDisplayName}>
          <ListItemIcon>
            <Edit fontSize="small" />
          </ListItemIcon>
          {t("action_bar_change_display_name")}
        </MenuItem>
        {showReservationAdd && (
          <MenuItem onClick={handleReserveAdd}>
            <ListItemIcon>
              <Lock fontSize="small" />
            </ListItemIcon>
            {t("action_bar_reservation_add")}
          </MenuItem>
        )}
        {showReservationAddDisabled && (
          <MenuItem sx={{ cursor: "default" }}>
            <ListItemIcon>
              <Lock fontSize="small" color="disabled" />
            </ListItemIcon>
            <span style={{ opacity: 0.3 }}>{t("action_bar_reservation_add")}</span>
            <ReserveLimitChip />
          </MenuItem>
        )}
        {showReservationEdit && (
          <MenuItem onClick={handleReserveEdit}>
            <ListItemIcon>
              <EnhancedEncryption fontSize="small" />
            </ListItemIcon>
            {t("action_bar_reservation_edit")}
          </MenuItem>
        )}
        {showReservationDelete && (
          <MenuItem onClick={handleReserveDelete}>
            <ListItemIcon>
              <LockOpen fontSize="small" />
            </ListItemIcon>
            {t("action_bar_reservation_delete")}
          </MenuItem>
        )}
        <MenuItem onClick={handleSendTestMessage}>
          <ListItemIcon>
            <Send fontSize="small" />
          </ListItemIcon>
          {t("action_bar_send_test_notification")}
        </MenuItem>
        <MenuItem onClick={handleClearAll}>
          <ListItemIcon>
            <ClearAll fontSize="small" />
          </ListItemIcon>
          {t("action_bar_clear_notifications")}
        </MenuItem>
        {!!subscription.mutedUntil && (
          <MenuItem onClick={() => handleSetMutedUntil(0)}>
            <ListItemIcon>
              <Notifications fontSize="small" />
            </ListItemIcon>
            {t("action_bar_unmute_notifications")}
          </MenuItem>
        )}
        {!subscription.mutedUntil && (
          <MenuItem onClick={() => handleSetMutedUntil(1)}>
            <ListItemIcon>
              <NotificationsOff fontSize="small" />
            </ListItemIcon>
            {t("action_bar_mute_notifications")}
          </MenuItem>
        )}
        <MenuItem onClick={handleUnsubscribe}>
          <ListItemIcon>
            <RemoveCircle fontSize="small" />
          </ListItemIcon>
          {t("action_bar_unsubscribe")}
        </MenuItem>
      </PopupMenu>
      <Portal>
        <Snackbar
          open={showPublishError}
          autoHideDuration={3000}
          onClose={() => setShowPublishError(false)}
          message={t("message_bar_error_publishing")}
        />
        <Snackbar
          open={showCopiedSnackbar}
          autoHideDuration={2000}
          onClose={() => setShowCopiedSnackbar(false)}
          message={t("share_chat_id_copied", "Chat-ID in Zwischenablage kopiert")}
        />
        <DisplayNameDialog open={displayNameDialogOpen} subscription={subscription} onClose={() => setDisplayNameDialogOpen(false)} />
        <ChatInfoDialog open={chatInfoDialogOpen} subscription={subscription} onClose={() => setChatInfoDialogOpen(false)} />
        {showReservationAdd && (
          <ReserveAddDialog
            open={reserveAddDialogOpen}
            topic={subscription.topic}
            reservations={reservations}
            onClose={() => setReserveAddDialogOpen(false)}
          />
        )}
        {showReservationEdit && (
          <ReserveEditDialog
            open={reserveEditDialogOpen}
            reservation={subscription.reservation}
            reservations={props.reservations}
            onClose={() => setReserveEditDialogOpen(false)}
          />
        )}
        {showReservationDelete && (
          <ReserveDeleteDialog
            open={reserveDeleteDialogOpen}
            topic={subscription.topic}
            onClose={() => setReserveDeleteDialogOpen(false)}
          />
        )}
      </Portal>
    </>
  );
};

const DisplayNameDialog = (props) => {
  const theme = useTheme();
  const { t } = useTranslation();
  const { subscription } = props;
  const [error, setError] = useState("");
  const [displayName, setDisplayName] = useState(subscription.displayName ?? "");
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));

  const handleSave = async () => {
    await subscriptionManager.setDisplayName(subscription.id, displayName);
    if (session.exists() && !subscription.internal) {
      try {
        console.log(`[SubscriptionSettingsDialog] Updating subscription display name to ${displayName}`);
        await accountApi.updateSubscription(subscription.baseUrl, subscription.topic, { display_name: displayName });
      } catch (e) {
        console.log(`[SubscriptionSettingsDialog] Error updating subscription`, e);
        if (e instanceof UnauthorizedError) {
          await session.resetAndRedirect(routes.login);
        } else {
          setError(e.message);
          return;
        }
      }
    }
    props.onClose();
  };

  return (
    <Dialog open={props.open} onClose={props.onClose} maxWidth="sm" fullWidth fullScreen={fullScreen}>
      <DialogTitle>{t("display_name_dialog_title")}</DialogTitle>
      <DialogContent>
        <DialogContentText>{t("display_name_dialog_description")}</DialogContentText>
        <TextField
          autoFocus
          placeholder={t("display_name_dialog_placeholder")}
          value={displayName}
          onChange={(ev) => setDisplayName(ev.target.value)}
          type="text"
          fullWidth
          variant="outlined"
          sx={{
            mt: 1,
            "& .MuiOutlinedInput-root": {
              borderRadius: 0,
              border: "3px solid var(--coop-black)",
              boxShadow: "var(--coop-shadow-sm)",
              "& fieldset": { border: "none" },
              "&:hover": { boxShadow: "var(--coop-shadow)" },
              "&.Mui-focused": { boxShadow: "var(--coop-shadow)" },
            },
            "& .MuiInputLabel-root": {
              fontWeight: 600,
            },
            "& .MuiInputLabel-shrink": {
              transform: "translate(14px, -9px) scale(0.75)",
              backgroundColor: "var(--coop-bg)",
              padding: "0 6px",
            },
          }}
          inputProps={{
            maxLength: 64,
            "aria-label": t("display_name_dialog_placeholder"),
          }}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton onClick={() => setDisplayName("")} edge="end">
                  <Clear />
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
      </DialogContent>
      <DialogFooter status={error}>
        <Button onClick={props.onClose}>{t("common_cancel")}</Button>
        <Button onClick={handleSave}>{t("common_save")}</Button>
      </DialogFooter>
    </Dialog>
  );
};

const ChatInfoDialog = (props) => {
  const theme = useTheme();
  const { t } = useTranslation();
  const { subscription } = props;
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const topicId = subscription.topic;
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(topicId);
    } else {
      const textarea = document.createElement("textarea");
      textarea.value = topicId;
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    setCopied(true);
  };

  const handleClose = () => {
    setCopied(false);
    props.onClose();
  };

  return (
    <Dialog open={props.open} onClose={handleClose} maxWidth="sm" fullWidth fullScreen={fullScreen}>
      <DialogTitle>{t("chat_info_dialog_title", "Chat-Info")}</DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
            {t("chat_info_dialog_created_by", "Erstellt von")}
          </Typography>
          <Typography variant="body1">
            {session.username()}
          </Typography>
        </Box>
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
            {t("chat_info_dialog_chat_id_label", "Chat-ID")}
          </Typography>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              border: "3px solid var(--coop-black)",
              borderRadius: 0,
              boxShadow: "var(--coop-shadow-sm)",
              overflow: "hidden",
            }}
          >
            <Typography
              sx={{
                flex: 1,
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "1rem",
                px: 1.5,
                py: 1,
                wordBreak: "break-all",
                userSelect: "all",
              }}
            >
              {subscription.topic}
            </Typography>
            <IconButton
              onClick={handleCopy}
              sx={{
                borderLeft: "3px solid var(--coop-black)",
                borderRadius: 0,
                px: 1.5,
                "&:hover": { backgroundColor: "var(--coop-yellow)" },
              }}
              aria-label={t("common_copy_to_clipboard", "In Zwischenablage kopieren")}
            >
              <ContentCopy fontSize="small" />
            </IconButton>
          </Box>
        </Box>
        {copied && (
          <Alert severity="success" sx={{ mb: 2, borderRadius: 0, border: "3px solid var(--coop-black)" }}>
            {t("chat_info_dialog_copied", "Chat-ID in Zwischenablage kopiert")}
          </Alert>
        )}
        <DialogContentText>
          {t("chat_info_dialog_description", "Teile diese Chat-ID mit anderen Personen, damit sie dem Chat beitreten koennen.")}
        </DialogContentText>
      </DialogContent>
      <DialogFooter>
        <Button onClick={handleClose}>{t("chat_info_dialog_close", "Schliessen")}</Button>
      </DialogFooter>
    </Dialog>
  );
};

export const ReserveLimitChip = () => {
  const { account } = useContext(AccountContext);
  if (account?.role === Role.ADMIN || account?.stats.reservations_remaining > 0) {
    return <></>;
  }
  if (config.enable_payments) {
    return account?.limits.reservations > 0 ? <LimitReachedChip /> : <ProChip />;
  }
  if (account) {
    return <LimitReachedChip />;
  }
  return <></>;
};

const LimitReachedChip = () => {
  const { t } = useTranslation();
  return (
    <Chip
      label={t("action_bar_reservation_limit_reached")}
      variant="outlined"
      color="primary"
      sx={{
        opacity: 0.8,
        borderWidth: "2px",
        height: "24px",
        marginLeft: "5px",
      }}
    />
  );
};

export const ProChip = () => (
  <Chip
    label="Coop Pro"
    variant="outlined"
    color="primary"
    sx={{
      opacity: 0.8,
      fontWeight: "bold",
      borderWidth: "2px",
      height: "24px",
      marginLeft: "5px",
    }}
  />
);
