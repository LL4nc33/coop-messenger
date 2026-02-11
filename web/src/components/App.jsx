import * as React from "react";
import { createContext, Suspense, useContext, useEffect, useState, useMemo } from "react";
import { Box, Toolbar, CssBaseline, Backdrop, CircularProgress, useMediaQuery, ThemeProvider, createTheme } from "@mui/material";
import { useLiveQuery } from "dexie-react-hooks";
import { BrowserRouter, Outlet, Route, Routes, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AllSubscriptions, SingleSubscription } from "./Notifications";
import { darkTheme, lightTheme } from "./theme";
import Navigation from "./Navigation";
import ActionBar from "./ActionBar";
import Preferences from "./Preferences";
import subscriptionManager from "../app/SubscriptionManager";
import userManager from "../app/UserManager";
import { expandUrl, getKebabCaseLangStr, darkModeEnabled, updateFavicon } from "../app/utils";
import ErrorBoundary from "./ErrorBoundary";
import routes from "./routes";
import { useAccountListener, useBackgroundProcesses, useConnectionListeners, useWebPushTopics } from "./hooks";
import Messaging from "./Messaging";
import Login from "./Login";
import Signup from "./Signup";
import Account from "./Account";
import AdminPanel from "./AdminPanel";
import InvitePage from "./InvitePage";
import DocsPage from "./DocsPage";
import "../css/coop.css"; // Coop Neobrutalism Design System
import initI18n from "../app/i18n"; // Translations!
import prefs from "../app/Prefs";
import RTLCacheProvider from "./RTLCacheProvider";
import session from "../app/Session";

initI18n();

export const AccountContext = createContext(null);
export const ReplyContext = createContext({ replyTo: null, setReplyTo: () => {} });

const App = () => {
  const { i18n } = useTranslation();
  const languageDir = i18n.dir();
  const [account, setAccount] = useState(null);
  const accountMemo = useMemo(() => ({ account, setAccount }), [account, setAccount]);
  const prefersDarkMode = useMediaQuery("(prefers-color-scheme: dark)");
  const themePreference = useLiveQuery(() => prefs.theme());
  const accentPref = useLiveQuery(() => prefs.accentColor());
  const customAccent = useLiveQuery(() => prefs.customAccentColor());

  const accentPresets = {
    earth:  { light: "#C4A265", dark: "#8B9A6B" },
    khaki:  { light: "#B8A88A", dark: "#6B8E6B" },
    olive:  { light: "#A89272", dark: "#7D8B69" },
    gold:   { light: "#FFD700", dark: "#FFD700" },
  };

  const darkenColor = (hex, amount = 30) => {
    const num = parseInt(hex.replace("#", ""), 16);
    const r = Math.max(0, (num >> 16) - amount);
    const g = Math.max(0, ((num >> 8) & 0x00FF) - amount);
    const b = Math.max(0, (num & 0x0000FF) - amount);
    return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, "0")}`;
  };

  const getAccentColor = () => {
    const isDark = darkModeEnabled(prefersDarkMode, themePreference);
    if (accentPref === "custom" && customAccent) {
      return customAccent;
    }
    const preset = accentPresets[accentPref] || accentPresets.earth;
    return isDark ? preset.dark : preset.light;
  };

  const accentColor = getAccentColor();

  const theme = React.useMemo(
    () => {
      const base = darkModeEnabled(prefersDarkMode, themePreference) ? darkTheme : lightTheme;
      return createTheme({
        ...base,
        palette: { ...base.palette, primary: { main: accentColor } },
        direction: languageDir,
      });
    },
    [prefersDarkMode, themePreference, languageDir, accentColor]
  );

  useEffect(() => {
    document.documentElement.setAttribute("lang", getKebabCaseLangStr(i18n.language));
    document.dir = languageDir;
  }, [i18n.language, languageDir]);

  useEffect(() => {
    const isDark = darkModeEnabled(prefersDarkMode, themePreference);
    document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
    document.documentElement.style.setProperty("--coop-accent", accentColor);
    document.documentElement.style.setProperty("--coop-accent-hover", darkenColor(accentColor));
  }, [prefersDarkMode, themePreference, accentColor]);

  useEffect(() => {
    const path = window.location.pathname;
    const isPublicRoute = path === routes.login || path === routes.signup || path.startsWith("/invite/");
    if (!session.exists() && config.require_login && !isPublicRoute) {
      window.location.href = routes.login;
    }
  }, []);

  return (
    <Suspense fallback={<Loader />}>
      <RTLCacheProvider>
        <BrowserRouter>
          <ThemeProvider theme={theme}>
            <AccountContext.Provider value={accountMemo}>
              <CssBaseline />
              <ErrorBoundary>
                <Routes>
                  <Route path={routes.login} element={<Login />} />
                  <Route path={routes.signup} element={<Signup />} />
                  <Route path={routes.invite} element={<InvitePage />} />
                  <Route element={<Layout />}>
                    <Route path={routes.app} element={<AllSubscriptions />} />
                    <Route path={routes.account} element={<Account />} />
                    <Route path={routes.settings} element={<Preferences />} />
                    <Route path={routes.admin} element={<AdminPanel />} />
                    <Route path={routes.docs} element={<DocsPage />} />
                    <Route path={routes.subscription} element={<SingleSubscription />} />
                    <Route path={routes.subscriptionExternal} element={<SingleSubscription />} />
                  </Route>
                </Routes>
              </ErrorBoundary>
            </AccountContext.Provider>
          </ThemeProvider>
        </BrowserRouter>
      </RTLCacheProvider>
    </Suspense>
  );
};

const updateTitle = (newNotificationsCount) => {
  document.title = newNotificationsCount > 0 ? `(${newNotificationsCount}) Coop` : "Coop";
  window.navigator.setAppBadge?.(newNotificationsCount);
  updateFavicon(newNotificationsCount);
};

const Layout = () => {
  const params = useParams();
  const { account, setAccount } = useContext(AccountContext);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const users = useLiveQuery(() => userManager.all());
  const subscriptions = useLiveQuery(() => subscriptionManager.all());
  const webPushTopics = useWebPushTopics();
  const subscriptionsWithoutInternal = subscriptions?.filter((s) => !s.internal);
  const newNotificationsCount = subscriptionsWithoutInternal?.reduce((prev, cur) => prev + cur.new, 0) || 0;
  const [selected] = (subscriptionsWithoutInternal || []).filter(
    (s) =>
      (params.baseUrl && expandUrl(params.baseUrl).includes(s.baseUrl) && params.topic === s.topic) ||
      (config.base_url === s.baseUrl && params.topic === s.topic)
  );

  useConnectionListeners(account, subscriptions, users, webPushTopics);
  useAccountListener(setAccount);
  useBackgroundProcesses();
  useEffect(() => updateTitle(newNotificationsCount), [newNotificationsCount]);

  const replyContextValue = useMemo(() => ({ replyTo, setReplyTo }), [replyTo]);

  return (
    <ReplyContext.Provider value={replyContextValue}>
      <Box sx={{ display: "flex" }}>
        <ActionBar selected={selected} onMobileDrawerToggle={() => setMobileDrawerOpen(!mobileDrawerOpen)} />
        <Navigation
          subscriptions={subscriptionsWithoutInternal}
          selectedSubscription={selected}
          mobileDrawerOpen={mobileDrawerOpen}
          onMobileDrawerToggle={() => setMobileDrawerOpen(!mobileDrawerOpen)}
        />
        <Main>
          <Toolbar />
          <Outlet
            context={{
              subscriptions: subscriptionsWithoutInternal,
              selected,
            }}
          />
        </Main>
        <Messaging selected={selected} />
      </Box>
    </ReplyContext.Provider>
  );
};

const Main = (props) => (
  <Box
    id="main"
    component="main"
    sx={{
      display: "flex",
      flexGrow: 1,
      flexDirection: "column",
      padding: { xs: 0, md: 3 },
      width: { sm: `calc(100% - ${Navigation.width}px)` },
      height: "100dvh",
      overflow: "auto",
      backgroundColor: ({ palette }) => palette.background.default,
    }}
  >
    {props.children}
  </Box>
);

const Loader = () => (
  <Backdrop
    open
    sx={{
      zIndex: 100000,
      backgroundColor: ({ palette }) => palette.background.default,
    }}
  >
    <CircularProgress color="success" disableShrink />
  </Backdrop>
);

export default App;
