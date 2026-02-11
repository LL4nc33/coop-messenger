import { useState } from "react";
import { Box, Container, Tabs, Tab, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";

const Section = ({ title, children, accent }) => (
  <Box
    sx={{
      border: "3px solid var(--coop-black)",
      boxShadow: "var(--coop-shadow)",
      backgroundColor: "var(--coop-white)",
      p: 3,
      mb: 3,
    }}
  >
    <Typography
      variant="h5"
      sx={{
        fontWeight: 800,
        mb: 2,
        borderBottom: accent
          ? "4px solid var(--coop-accent)"
          : "3px solid var(--coop-black)",
        pb: 1,
        textTransform: "uppercase",
        letterSpacing: "0.03em",
      }}
    >
      {title}
    </Typography>
    <Typography variant="body1" component="div" sx={{ lineHeight: 1.8 }}>
      {children}
    </Typography>
  </Box>
);

const Step = ({ number, title, children }) => (
  <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
    <Box
      sx={{
        width: 36,
        height: 36,
        minWidth: 36,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "var(--coop-accent)",
        border: "3px solid var(--coop-black)",
        fontWeight: 900,
        fontSize: "1.1rem",
        fontFamily: "'Space Grotesk', sans-serif",
      }}
    >
      {number}
    </Box>
    <Box>
      <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 0.5 }}>
        {title}
      </Typography>
      <Typography variant="body2">{children}</Typography>
    </Box>
  </Box>
);

const Kbd = ({ children }) => (
  <Box
    component="kbd"
    sx={{
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: "0.85rem",
      backgroundColor: "var(--coop-gray-100)",
      border: "2px solid var(--coop-black)",
      boxShadow: "2px 2px 0 var(--coop-black)",
      px: 1,
      py: 0.25,
      fontWeight: 700,
    }}
  >
    {children}
  </Box>
);

const TabPanel = ({ children, value, index }) => (
  <div role="tabpanel" hidden={value !== index}>
    {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
  </div>
);

const tabSx = {
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  fontSize: "0.9rem",
  borderRadius: 0,
  border: "2px solid var(--coop-black)",
  borderBottom: "none",
  mx: 0.5,
  minHeight: "48px",
  "&.Mui-selected": {
    backgroundColor: "var(--coop-accent)",
    color: "var(--coop-black)",
  },
};

const DocsPage = () => {
  const { t } = useTranslation();
  const [tabIndex, setTabIndex] = useState(0);

  return (
    <Container maxWidth="md" sx={{ py: 3 }}>
      {/* Tabs */}
      <Box sx={{ borderBottom: "3px solid var(--coop-black)" }}>
        <Tabs
          value={tabIndex}
          onChange={(_, v) => setTabIndex(v)}
          sx={{
            "& .MuiTabs-indicator": {
              left: 0,
              width: "6px",
              backgroundColor: "var(--coop-black)",
              transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            },
          }}
        >
          <Tab label={t("docs_tab_users", "Fuer Benutzer")} sx={tabSx} />
          <Tab label={t("docs_tab_admins", "Fuer Admins")} sx={tabSx} />
        </Tabs>
      </Box>

      {/* USER TAB */}
      <TabPanel value={tabIndex} index={0}>
        <Section title={t("docs_getting_started_title", "Erste Schritte")} accent>
          <Step number="1" title={t("docs_getting_started_step1_title", "Account erstellen")}>
            {t("docs_getting_started_step1")}
          </Step>
          <Step number="2" title={t("docs_getting_started_step2_title", "Anmelden")}>
            {t("docs_getting_started_step2")}
          </Step>
          <Step number="3" title={t("docs_getting_started_step3_title", "Loslegen")}>
            {t("docs_getting_started_step3")}
          </Step>
        </Section>

        <Section title={t("docs_create_chat_title", "Neuen Chat erstellen")}>
          <p>{t("docs_create_chat_desc")}</p>
        </Section>

        <Section title={t("docs_join_chat_title", "Bestehendem Chat beitreten")}>
          <p style={{ marginBottom: 16 }}>{t("docs_join_chat_desc", "Es gibt drei Wege einem bestehenden Chat beizutreten:")}</p>
          <Step number="1" title={t("docs_join_chat_way1_title", "Per Einladungslink")}>
            {t("docs_join_chat_way1")}
          </Step>
          <Step number="2" title={t("docs_join_chat_way2_title", "Per Chat-ID")}>
            {t("docs_join_chat_way2")}
          </Step>
          <Step number="3" title={t("docs_join_chat_way3_title", "Per Beitrittsanfrage")}>
            {t("docs_join_chat_way3")}
          </Step>
        </Section>

        <Section title={t("docs_send_messages_title", "Nachrichten senden")}>
          <p>{t("docs_send_messages_desc")}</p>
          <Box sx={{ mt: 2, display: "flex", flexDirection: "column", gap: 1 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Kbd>Enter</Kbd>
              <Typography variant="body2">{t("docs_send_messages_enter", "Nachricht senden")}</Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Kbd>Shift+Enter</Kbd>
              <Typography variant="body2">{t("docs_send_messages_shift_enter", "Neue Zeile einfuegen")}</Typography>
            </Box>
          </Box>
        </Section>

        <Section title={t("docs_display_name_title", "Anzeigename aendern")}>
          <p>{t("docs_display_name_desc")}</p>
        </Section>

        <Section title={t("docs_theme_title", "Dark Mode / Light Mode")}>
          <p>{t("docs_theme_desc_simple")}</p>
          <Box
            component="ul"
            sx={{ mt: 1, pl: 3, "& li": { mb: 0.5, fontWeight: 500 } }}
          >
            <li><strong>Light</strong> &ndash; {t("docs_theme_light", "Helles Theme mit Standard-Akzent")}</li>
            <li><strong>Dark</strong> &ndash; {t("docs_theme_dark", "Dunkles Theme, augenschonend")}</li>
          </Box>
          <p style={{ marginTop: 12 }}>{t("docs_accent_desc", "Unter Einstellungen > Darstellung kannst du ausserdem die Akzentfarbe aendern. Waehle zwischen vordefinierten Paletten (Sand, Khaki, Olive, Gold) oder setze eine eigene Farbe. Die Akzentfarbe wird fuer Buttons, Chat-Bubbles und Hervorhebungen verwendet.")}</p>
        </Section>

        <Section title={t("docs_notifications_title", "Benachrichtigungen")}>
          <p>{t("docs_notifications_desc")}</p>
        </Section>
      </TabPanel>

      {/* ADMIN TAB */}
      <TabPanel value={tabIndex} index={1}>
        <Section title={t("docs_admin_users_title", "Benutzer verwalten")} accent>
          <p>{t("docs_admin_users_desc")}</p>
        </Section>

        <Section title={t("docs_admin_access_title", "Chat-Zugriffe erteilen")}>
          <p>{t("docs_admin_access_desc")}</p>
        </Section>

        <Section title={t("docs_admin_join_requests_title", "Beitrittsanfragen verwalten")}>
          <p>{t("docs_admin_join_requests_desc")}</p>
        </Section>

        <Section title={t("docs_admin_invites_title", "Einladungen erstellen")}>
          <p>{t("docs_admin_invites_desc")}</p>
        </Section>

        <Section title={t("docs_admin_config_title", "Server-Konfiguration")}>
          <p>{t("docs_admin_config_desc")}</p>
        </Section>

        <Section title={t("docs_admin_security_title", "Sicherheit")}>
          <p>{t("docs_admin_security_desc")}</p>
        </Section>
      </TabPanel>
    </Container>
  );
};

export default DocsPage;
