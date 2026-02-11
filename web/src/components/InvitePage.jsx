import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Box, Typography, CircularProgress, Alert } from "@mui/material";
import { useTranslation } from "react-i18next";
import config from "../app/config";
import session from "../app/Session";
import routes from "./routes";
import { subscribeTopic } from "./SubscribeDialog";
import poller from "../app/Poller";

const InvitePage = () => {
  const { t } = useTranslation();
  const { token } = useParams();
  const navigate = useNavigate();
  const redirectTimer = useRef(null);

  const [loading, setLoading] = useState(true);
  const [inviteData, setInviteData] = useState(null);
  const [error, setError] = useState(null);

  // Registration form state (for non-logged-in users)
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  // Join state (for logged-in users)
  const [joinSuccess, setJoinSuccess] = useState(false);

  const isLoggedIn = session.exists();

  // Cleanup redirect timer on unmount
  useEffect(() => {
    return () => {
      if (redirectTimer.current) {
        clearTimeout(redirectTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    const fetchInvite = async () => {
      try {
        const response = await fetch(`${config.base_url}/v1/invite/${token}`);

        if (!response.ok) {
          if (response.status === 404) {
            setError(t("invite_error_not_found", "Invite nicht gefunden"));
          } else {
            setError(t("invite_error_invalid", "Invite nicht gueltig"));
          }
          setLoading(false);
          return;
        }

        const data = await response.json();
        setInviteData(data);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching invite:", err);
        setError(t("invite_error_loading", "Fehler beim Laden der Einladung"));
        setLoading(false);
      }
    };

    if (token) {
      fetchInvite();
    } else {
      setError(t("invite_error_no_token", "Kein Token vorhanden"));
      setLoading(false);
    }
  }, [token]);

  const handleJoin = async () => {
    setSubmitError(null);
    setSubmitting(true);

    try {
      const response = await fetch(`${config.base_url}/v1/invite/${token}/join`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.token()}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        setSubmitError(errorData.error || t("invite_error_join_failed", "Beitreten fehlgeschlagen"));
        setSubmitting(false);
        return;
      }

      const data = await response.json();

      // Subscribe to each topic locally + server-side so they appear in the sidebar
      if (data.topics && data.topics.length > 0) {
        for (const topic of data.topics) {
          const subscription = await subscribeTopic(config.base_url, topic, {});
          poller.pollInBackground(subscription);
        }
      }

      setJoinSuccess(true);
      setSubmitting(false);

      // Redirect to main page after short delay
      redirectTimer.current = setTimeout(() => {
        navigate("/");
      }, 1500);
    } catch (err) {
      console.error("Error joining via invite:", err);
      setSubmitError(t("invite_error_network_join", "Netzwerkfehler beim Beitreten"));
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);

    if (!username.trim()) {
      setSubmitError(t("invite_error_username_required", "Bitte gib einen Benutzernamen ein"));
      return;
    }

    if (password.length < 8) {
      setSubmitError(t("invite_error_password_too_short", "Passwort muss mindestens 8 Zeichen lang sein"));
      return;
    }

    if (password !== passwordConfirm) {
      setSubmitError(t("invite_error_passwords_mismatch", "Passwoerter stimmen nicht ueberein"));
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(`${config.base_url}/v1/invite/${token}/redeem`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: username.trim(),
          password: password,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        setSubmitError(errorData.message || t("invite_error_register_failed", "Registrierung fehlgeschlagen"));
        setSubmitting(false);
        return;
      }

      // Success - redirect to login
      navigate(routes.login, {
        state: {
          message: t("invite_register_success", "Account erfolgreich erstellt! Bitte melde dich an."),
          username: username.trim()
        }
      });
    } catch (err) {
      console.error("Error redeeming invite:", err);
      setSubmitError(t("invite_error_network_register", "Netzwerkfehler bei der Registrierung"));
      setSubmitting(false);
    }
  };

  // Loading State
  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
          bgcolor: "var(--coop-bg)",
        }}
      >
        <CircularProgress size={60} sx={{ color: "var(--coop-accent)" }} />
      </Box>
    );
  }

  // Error State
  if (error) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
          bgcolor: "var(--coop-bg)",
          p: 2,
        }}
      >
        <div className="coop-card" style={{ maxWidth: "500px", textAlign: "center" }}>
          <Typography variant="h5" sx={{ fontWeight: "bold", mb: 2, textTransform: "uppercase" }}>
            {t("invite_error_title", "FEHLER")}
          </Typography>
          <Typography variant="body1">{error}</Typography>
        </div>
      </Box>
    );
  }

  // Expired or Exhausted State
  if (inviteData && !inviteData.available) {
    const isExpired = new Date(inviteData.expires_at * 1000) < new Date();
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
          bgcolor: "var(--coop-bg)",
          p: 2,
        }}
      >
        <div className="coop-card" style={{ maxWidth: "500px", textAlign: "center" }}>
          <Typography variant="h5" sx={{ fontWeight: "bold", mb: 2, textTransform: "uppercase" }}>
            {isExpired ? t("invite_expired_title", "EINLADUNG ABGELAUFEN") : t("invite_unavailable_title", "EINLADUNG NICHT VERFUEGBAR")}
          </Typography>
          <Typography variant="body1">
            {isExpired
              ? t("invite_expired_desc", "Diese Einladung ist leider abgelaufen.")
              : t("invite_unavailable_desc", "Diese Einladung wurde bereits verwendet oder ist nicht mehr verfuegbar.")}
          </Typography>
        </div>
      </Box>
    );
  }

  // Valid Invite State
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        bgcolor: "var(--coop-bg)",
        p: 2,
      }}
    >
      <div className="coop-invite-card" style={{ maxWidth: "600px", width: "100%" }}>
        <Typography
          variant="h4"
          sx={{
            fontWeight: "bold",
            mb: 3,
            textAlign: "center",
            color: "var(--coop-accent)",
            textTransform: "uppercase",
          }}
        >
          {t("invite_join_title", "DU WURDEST EINGELADEN!")}
        </Typography>

        {isLoggedIn ? (
          <>
            <Typography variant="body2" sx={{ color: "text.secondary", mb: 2, textAlign: "center" }}>
              {t("invite_join_logged_in_as", "Du bist als {{username}} eingeloggt. Tritt den folgenden Chat-Kanaelen bei:", { username: session.username() })}
            </Typography>

            {inviteData?.topics && inviteData.topics.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: "bold", mb: 1 }}>
                  {t("invite_join_channels", "Chat-Kanaele:")}
                </Typography>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                  {inviteData.topics.split(",").map((topic, index) => (
                    <Box
                      key={index}
                      sx={{
                        bgcolor: "var(--coop-accent)",
                        color: "var(--coop-black)",
                        px: 2,
                        py: 0.5,
                        border: "3px solid var(--coop-black)",
                        fontWeight: "bold",
                        fontSize: "0.9rem",
                      }}
                    >
                      {topic.trim()}
                    </Box>
                  ))}
                </Box>
              </Box>
            )}

            {joinSuccess && (
              <Alert severity="success" sx={{ mb: 3, borderRadius: 0, border: "3px solid var(--coop-black)" }}>
                {t("invite_join_success", "Erfolgreich beigetreten! Du wirst weitergeleitet...")}
              </Alert>
            )}

            {submitError && (
              <Alert severity="error" sx={{ mb: 3, borderRadius: 0, border: "3px solid var(--coop-black)" }}>
                {submitError}
              </Alert>
            )}

            <button
              type="button"
              className="coop-btn coop-btn-invite"
              disabled={submitting || joinSuccess}
              onClick={handleJoin}
              style={{
                width: "100%",
                fontSize: "1.1rem",
                opacity: (submitting || joinSuccess) ? 0.6 : 1,
                cursor: (submitting || joinSuccess) ? "not-allowed" : "pointer",
              }}
            >
              {submitting ? t("invite_join_joining", "WIRD BEIGETRETEN...") : joinSuccess ? t("invite_join_success", "Erfolgreich beigetreten! Du wirst weitergeleitet...") : t("invite_join_button", "BEITRETEN")}
            </button>
          </>
        ) : (
          <>
            <Typography variant="body2" sx={{ color: "text.secondary", mb: 2, textAlign: "center" }}>
              {t("invite_register_desc", "Erstelle einen Account um auf die folgenden Chat-Kanaele zuzugreifen:")}
            </Typography>

            {inviteData?.topics && inviteData.topics.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: "bold", mb: 1 }}>
                  {t("invite_join_channels", "Chat-Kanaele:")}
                </Typography>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                  {inviteData.topics.split(",").map((topic, index) => (
                    <Box
                      key={index}
                      sx={{
                        bgcolor: "var(--coop-accent)",
                        color: "var(--coop-black)",
                        px: 2,
                        py: 0.5,
                        border: "3px solid var(--coop-black)",
                        fontWeight: "bold",
                        fontSize: "0.9rem",
                      }}
                    >
                      {topic.trim()}
                    </Box>
                  ))}
                </Box>
              </Box>
            )}

            {inviteData?.expires_at && (
              <Typography variant="body2" sx={{ mb: 3, color: "text.secondary" }}>
                {t("invite_expires", "Gueltig bis:")} {new Date(inviteData.expires_at * 1000).toLocaleDateString("de-DE")}
              </Typography>
            )}

            <form onSubmit={handleSubmit}>
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: "bold", mb: 1 }}>
                  {t("signup_form_username", "Benutzername")}
                </Typography>
                <input
                  type="text"
                  className="coop-input"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={t("invite_username_placeholder", "DeinBenutzername")}
                  required
                  style={{ width: "100%", boxSizing: "border-box" }}
                />
              </Box>

              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: "bold", mb: 1 }}>
                  {t("signup_form_password", "Passwort")}
                </Typography>
                <input
                  type="password"
                  className="coop-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t("invite_password_placeholder", "Mindestens 8 Zeichen")}
                  required
                  style={{ width: "100%", boxSizing: "border-box" }}
                />
              </Box>

              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: "bold", mb: 1 }}>
                  {t("signup_form_confirm_password", "Passwort bestaetigen")}
                </Typography>
                <input
                  type="password"
                  className="coop-input"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  placeholder={t("invite_password_confirm_placeholder", "Passwort wiederholen")}
                  required
                  style={{ width: "100%", boxSizing: "border-box" }}
                />
              </Box>

              {submitError && (
                <Alert severity="error" sx={{ mb: 3, borderRadius: 0, border: "3px solid var(--coop-black)" }}>
                  {submitError}
                </Alert>
              )}

              <button
                type="submit"
                className="coop-btn coop-btn-invite"
                disabled={submitting}
                style={{
                  width: "100%",
                  fontSize: "1.1rem",
                  opacity: submitting ? 0.6 : 1,
                  cursor: submitting ? "not-allowed" : "pointer",
                }}
              >
                {submitting ? t("invite_register_submitting", "WIRD ERSTELLT...") : t("invite_register_button", "ACCOUNT ERSTELLEN")}
              </button>
            </form>

            <Box sx={{ mt: 3, textAlign: "center" }}>
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                {t("invite_already_have_account", "Bereits ein Account?")}{" "}
                <a
                  href={routes.login}
                  style={{
                    color: "var(--coop-accent)",
                    fontWeight: "bold",
                    textDecoration: "none"
                  }}
                >
                  {t("invite_login_link", "Hier anmelden")}
                </a>
              </Typography>
            </Box>
          </>
        )}
      </div>
    </Box>
  );
};

export default InvitePage;
