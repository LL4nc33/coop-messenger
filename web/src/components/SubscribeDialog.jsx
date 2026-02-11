import * as React from "react";
import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Tab,
  Tabs,
  TextField,
  Dialog,
  DialogContent,
  DialogContentText,
  DialogTitle,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { useTranslation } from "react-i18next";
import api from "../app/Api";
import { randomAlphanumericString, topicUrl, validTopic } from "../app/utils";
import userManager from "../app/UserManager";
import subscriptionManager from "../app/SubscriptionManager";
import poller from "../app/Poller";
import DialogFooter from "./DialogFooter";
import session from "../app/Session";
import routes from "./routes";
import accountApi from "../app/AccountApi";
import config from "../app/config";
import { UnauthorizedError } from "../app/errors";

export const subscribeTopic = async (baseUrl, topic, opts) => {
  const subscription = await subscriptionManager.add(baseUrl, topic, opts);
  if (session.exists()) {
    try {
      await accountApi.addSubscription(baseUrl, topic);
      if (opts?.displayName) {
        await accountApi.updateSubscription(baseUrl, topic, { display_name: opts.displayName });
      }
    } catch (e) {
      console.log(`[SubscribeDialog] Subscribing failed`, e);
      if (e instanceof UnauthorizedError) {
        await session.resetAndRedirect(routes.login);
      }
    }
  }
  return subscription;
};

const SubscribeDialog = (props) => {
  const theme = useTheme();
  const [baseUrl, setBaseUrl] = useState("");
  const [topic, setTopic] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showLoginPage, setShowLoginPage] = useState(false);
  const [mode, setMode] = useState("create"); // "create" or "join"
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));

  const handleSuccess = async () => {
    console.log(`[SubscribeDialog] Subscribing to topic`);
    const actualBaseUrl = baseUrl || config.base_url;
    const opts = {};
    if (displayName.trim()) {
      opts.displayName = displayName.trim();
    }
    const subscription = await subscribeTopic(actualBaseUrl, topic, opts);
    poller.pollInBackground(subscription); // Dangle!
    props.onSuccess(subscription);
  };

  return (
    <Dialog open={props.open} onClose={props.onCancel} fullScreen={fullScreen}>
      {showLoginPage ? (
        <LoginPage baseUrl={baseUrl} topic={topic} onBack={() => setShowLoginPage(false)} onSuccess={handleSuccess} />
      ) : mode === "create" ? (
        <CreateChatPage
          baseUrl={baseUrl}
          setBaseUrl={setBaseUrl}
          topic={topic}
          setTopic={setTopic}
          displayName={displayName}
          setDisplayName={setDisplayName}
          subscriptions={props.subscriptions}
          onCancel={props.onCancel}
          onNeedsLogin={() => setShowLoginPage(true)}
          onSuccess={handleSuccess}
          onSwitchToJoin={() => { setMode("join"); setTopic(""); }}
        />
      ) : (
        <JoinChatPage
          baseUrl={baseUrl}
          topic={topic}
          setTopic={setTopic}
          displayName={displayName}
          setDisplayName={setDisplayName}
          subscriptions={props.subscriptions}
          onCancel={props.onCancel}
          onNeedsLogin={() => setShowLoginPage(true)}
          onSuccess={handleSuccess}
          onSwitchToCreate={() => { setMode("create"); setTopic(""); }}
        />
      )}
    </Dialog>
  );
};

// ==========================================================================
// Tab header shared between Create and Join
// ==========================================================================
const DialogTabs = ({ mode, onSwitchToCreate, onSwitchToJoin }) => {
  const { t } = useTranslation();
  return (
    <Tabs
      value={mode === "create" ? 0 : 1}
      onChange={(_, v) => (v === 0 ? onSwitchToCreate() : onSwitchToJoin())}
      variant="fullWidth"
      sx={{
        minHeight: 40,
        borderBottom: "3px solid var(--coop-black)",
        "& .MuiTabs-indicator": {
          backgroundColor: "var(--coop-black)",
          height: 3,
        },
        "& .MuiTab-root": {
          fontWeight: 700,
          textTransform: "uppercase",
          fontSize: "0.8rem",
          letterSpacing: "0.03em",
          minHeight: 40,
        },
      }}
    >
      <Tab label={t("subscribe_dialog_tab_create", "Neuer Chat")} />
      <Tab label={t("subscribe_dialog_tab_join", "Chat beitreten")} />
    </Tabs>
  );
};

// ==========================================================================
// "Neuen Chat erstellen" - Page
// ==========================================================================
const CreateChatPage = (props) => {
  const { t } = useTranslation();
  const [error, setError] = useState("");
  const [showChatId, setShowChatId] = useState(false);
  const baseUrl = config.base_url;
  const { topic } = props;
  const existingTopicUrls = props.subscriptions.map((s) => topicUrl(s.baseUrl, s.topic));

  // Auto-generiere Chat-ID beim ersten Oeffnen
  React.useEffect(() => {
    if (!topic) {
      props.setTopic(randomAlphanumericString(16));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubscribe = async () => {
    const user = await userManager.get(baseUrl);
    const username = user ? user.username : t("subscribe_dialog_error_user_anonymous");

    const success = await api.topicAuth(baseUrl, topic, user);
    if (!success) {
      console.log(`[SubscribeDialog] Login failed`);
      if (user) {
        setError(
          t("subscribe_dialog_error_user_not_authorized", { username })
        );
        return;
      }
      props.onNeedsLogin();
      return;
    }

    console.log(`[SubscribeDialog] Login successful`);
    props.onSuccess();
  };

  const subscribeButtonEnabled = (() => {
    const isExistingTopicUrl = existingTopicUrls.includes(topicUrl(config.base_url, topic));
    return validTopic(topic) && !isExistingTopicUrl;
  })();

  return (
    <>
      <DialogTitle sx={{ pb: 0 }}>
        <DialogTabs mode="create" onSwitchToCreate={() => {}} onSwitchToJoin={props.onSwitchToJoin} />
      </DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mt: 1 }}>
          {t("subscribe_dialog_create_description", "Erstelle einen neuen Chat-Kanal. Die Chat-ID wird automatisch erzeugt.")}
        </DialogContentText>
        <TextField
          autoFocus
          margin="dense"
          id="displayName"
          label={t("subscribe_dialog_chat_name_label", "Chat-Name")}
          placeholder={t("subscribe_dialog_chat_name_placeholder", "z.B. Team-Chat, Familie, Projekte")}
          value={props.displayName}
          onChange={(ev) => props.setDisplayName(ev.target.value)}
          type="text"
          fullWidth
          variant="standard"
          helperText={t("subscribe_dialog_chat_name_helper", "Der Name der in deiner Chat-Liste angezeigt wird")}
          inputProps={{
            maxLength: 64,
            "aria-label": t("subscribe_dialog_chat_name_label", "Chat-Name"),
          }}
        />
        <Button
          size="small"
          onClick={() => setShowChatId(!showChatId)}
          sx={{ mt: 1.5, textTransform: "none", color: "text.secondary", fontSize: "0.8rem" }}
        >
          {showChatId ? t("subscribe_dialog_chat_id_label", "Chat-ID") + " \u25B2" : t("subscribe_dialog_chat_id_label", "Chat-ID") + " \u25BC"}
        </Button>
        {showChatId && (
          <div style={{ display: "flex" }} role="row">
            <TextField
              margin="dense"
              id="topic"
              label={t("subscribe_dialog_chat_id_label", "Chat-ID")}
              value={props.topic}
              onChange={(ev) => props.setTopic(ev.target.value)}
              type="text"
              fullWidth
              variant="standard"
              helperText={t("subscribe_dialog_chat_id_helper", "Eindeutiger Schluessel - nur wer die ID kennt, kann dem Chat beitreten")}
              inputProps={{
                maxLength: 64,
                "aria-label": t("subscribe_dialog_chat_id_label", "Chat-ID"),
                style: { fontFamily: "'JetBrains Mono', monospace", fontSize: "0.9rem" },
              }}
            />
            <Button
              onClick={() => {
                props.setTopic(randomAlphanumericString(16));
              }}
              style={{ flexShrink: "0", marginTop: "0.5em" }}
            >
              {t("subscribe_dialog_subscribe_button_generate_topic_name")}
            </Button>
          </div>
        )}
      </DialogContent>
      <DialogFooter status={error}>
        <Button onClick={props.onCancel}>{t("subscribe_dialog_subscribe_button_cancel")}</Button>
        <Button onClick={handleSubscribe} disabled={!subscribeButtonEnabled}>
          {t("subscribe_dialog_subscribe_button_subscribe")}
        </Button>
      </DialogFooter>
    </>
  );
};

// ==========================================================================
// "Chat beitreten" - Page
// ==========================================================================
const JoinChatPage = (props) => {
  const { t } = useTranslation();
  const [error, setError] = useState("");
  const [showJoinRequest, setShowJoinRequest] = useState(false);
  const [joinRequestSent, setJoinRequestSent] = useState(false);
  const [joinRequestError, setJoinRequestError] = useState("");
  const baseUrl = config.base_url;
  const { topic } = props;
  const existingTopicUrls = props.subscriptions.map((s) => topicUrl(s.baseUrl, s.topic));

  // Wenn Topic leer oder auto-generiert, leeren fuer manuelle Eingabe
  React.useEffect(() => {
    if (topic && topic.length === 16 && /^[a-zA-Z0-9]+$/.test(topic)) {
      // Sieht aus wie eine auto-generierte ID - leeren
      props.setTopic("");
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleJoin = async () => {
    setError("");
    setShowJoinRequest(false);

    const user = await userManager.get(baseUrl);
    const username = user ? user.username : t("subscribe_dialog_error_user_anonymous");

    const success = await api.topicAuth(baseUrl, topic, user);
    if (!success) {
      console.log(`[SubscribeDialog] Login failed`);
      if (user) {
        if (session.exists()) {
          setShowJoinRequest(true);
        } else {
          setError(
            t("subscribe_dialog_error_user_not_authorized", { username })
          );
        }
        return;
      }
      props.onNeedsLogin();
      return;
    }

    console.log(`[SubscribeDialog] Login successful`);
    props.onSuccess();
  };

  const handleSendJoinRequest = async () => {
    setJoinRequestError("");
    try {
      const response = await fetch(`${config.base_url}/v1/join-requests`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.token()}`,
        },
        body: JSON.stringify({ topic }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setJoinRequestError(data.error || t("subscribe_dialog_join_request_error", "Anfrage konnte nicht gesendet werden"));
        return;
      }
      setJoinRequestSent(true);
    } catch (e) {
      console.error("[SubscribeDialog] Error sending join request:", e);
      setJoinRequestError(t("subscribe_dialog_join_request_error", "Anfrage konnte nicht gesendet werden"));
    }
  };

  const joinButtonEnabled = (() => {
    const isExistingTopicUrl = existingTopicUrls.includes(topicUrl(config.base_url, topic));
    return validTopic(topic) && !isExistingTopicUrl;
  })();

  return (
    <>
      <DialogTitle sx={{ pb: 0 }}>
        <DialogTabs mode="join" onSwitchToCreate={props.onSwitchToCreate} onSwitchToJoin={() => {}} />
      </DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mt: 1 }}>
          {t("subscribe_dialog_join_description", "Gib die Chat-ID ein, die du von einem anderen Teilnehmer erhalten hast.")}
        </DialogContentText>
        <TextField
          autoFocus
          margin="dense"
          id="joinTopic"
          label={t("subscribe_dialog_chat_id_label", "Chat-ID")}
          placeholder={t("subscribe_dialog_join_id_placeholder", "Chat-ID eingeben")}
          value={topic}
          onChange={(ev) => {
            props.setTopic(ev.target.value);
            setShowJoinRequest(false);
            setError("");
          }}
          type="text"
          fullWidth
          variant="standard"
          helperText={t("subscribe_dialog_join_id_helper", "Die Chat-ID findest du im Chat-Info Menue oder bekommst sie vom Chat-Ersteller")}
          inputProps={{
            maxLength: 64,
            "aria-label": t("subscribe_dialog_chat_id_label", "Chat-ID"),
            style: { fontFamily: "'JetBrains Mono', monospace", fontSize: "0.9rem" },
          }}
        />
        <TextField
          margin="dense"
          id="joinDisplayName"
          label={t("subscribe_dialog_chat_name_label", "Chat-Name") + " (" + t("subscribe_dialog_join_optional", "optional") + ")"}
          placeholder={t("subscribe_dialog_chat_name_placeholder", "z.B. Team-Chat, Familie, Projekte")}
          value={props.displayName}
          onChange={(ev) => props.setDisplayName(ev.target.value)}
          type="text"
          fullWidth
          variant="standard"
          helperText={t("subscribe_dialog_chat_name_helper", "Der Name der in deiner Chat-Liste angezeigt wird")}
          inputProps={{
            maxLength: 64,
          }}
        />
        {showJoinRequest && (
          <Box sx={{ mt: 2 }}>
            {joinRequestSent ? (
              <Alert severity="success" sx={{ borderRadius: 0 }}>
                {t("subscribe_dialog_join_request_sent", "Beitrittsanfrage gesendet - warte auf Genehmigung durch einen Admin.")}
              </Alert>
            ) : (
              <>
                <Alert severity="info" sx={{ borderRadius: 0, mb: 1 }}>
                  {t("subscribe_dialog_join_request_info", "Du hast keinen Zugriff auf diesen Chat-Kanal. Du kannst eine Beitrittsanfrage an den Admin senden.")}
                </Alert>
                {joinRequestError && (
                  <Alert severity="error" sx={{ borderRadius: 0, mb: 1 }}>
                    {joinRequestError}
                  </Alert>
                )}
                <Button
                  variant="contained"
                  onClick={handleSendJoinRequest}
                  sx={{
                    textTransform: "none",
                    borderRadius: 0,
                    border: "3px solid var(--coop-black)",
                    boxShadow: "var(--coop-shadow)",
                    backgroundColor: "var(--coop-accent)",
                    color: "var(--coop-black)",
                    fontWeight: 700,
                    "&:hover": {
                      backgroundColor: "var(--coop-accent-hover)",
                      boxShadow: "var(--coop-shadow-hover)",
                    },
                  }}
                >
                  {t("subscribe_dialog_join_request_button", "Beitrittsanfrage senden")}
                </Button>
              </>
            )}
          </Box>
        )}
      </DialogContent>
      <DialogFooter status={showJoinRequest ? "" : error}>
        <Button onClick={props.onCancel}>{t("subscribe_dialog_subscribe_button_cancel")}</Button>
        {!showJoinRequest && (
          <Button onClick={handleJoin} disabled={!joinButtonEnabled}>
            {t("subscribe_dialog_join_button", "Beitreten")}
          </Button>
        )}
      </DialogFooter>
    </>
  );
};

const LoginPage = (props) => {
  const { t } = useTranslation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const baseUrl = props.baseUrl ? props.baseUrl : config.base_url;
  const { topic } = props;

  const handleLogin = async () => {
    const user = { baseUrl, username, password };
    const success = await api.topicAuth(baseUrl, topic, user);
    if (!success) {
      console.log(`[SubscribeDialog] Login failed`);
      setError(t("subscribe_dialog_error_user_not_authorized", { username }));
      return;
    }
    console.log(`[SubscribeDialog] Login successful`);
    await userManager.save(user);
    props.onSuccess();
  };

  return (
    <>
      <DialogTitle>{t("subscribe_dialog_login_title")}</DialogTitle>
      <DialogContent>
        <DialogContentText>{t("subscribe_dialog_login_description")}</DialogContentText>
        <TextField
          autoFocus
          margin="dense"
          id="username"
          label={t("subscribe_dialog_login_username_label")}
          value={username}
          onChange={(ev) => setUsername(ev.target.value)}
          type="text"
          fullWidth
          variant="standard"
          inputProps={{
            "aria-label": t("subscribe_dialog_login_username_label"),
          }}
        />
        <TextField
          margin="dense"
          id="password"
          label={t("subscribe_dialog_login_password_label")}
          type="password"
          value={password}
          onChange={(ev) => setPassword(ev.target.value)}
          fullWidth
          variant="standard"
          inputProps={{
            "aria-label": t("subscribe_dialog_login_password_label"),
          }}
        />
      </DialogContent>
      <DialogFooter status={error}>
        <Button onClick={props.onBack}>{t("common_back")}</Button>
        <Button onClick={handleLogin}>{t("subscribe_dialog_login_button_login")}</Button>
      </DialogFooter>
    </>
  );
};

export default SubscribeDialog;
