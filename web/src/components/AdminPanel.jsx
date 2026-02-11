import { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tab,
  Tabs,
  Alert,
  IconButton,
  Snackbar,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Container,
  Card,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import StorageIcon from "@mui/icons-material/Storage";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import AddIcon from "@mui/icons-material/Add";
import PersonIcon from "@mui/icons-material/Person";
import ChatIcon from "@mui/icons-material/Chat";
import LinkIcon from "@mui/icons-material/Link";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import GroupAddIcon from "@mui/icons-material/GroupAdd";
import { useTranslation } from "react-i18next";
import session from "../app/Session";
import { fetchOrThrow } from "../app/errors";
import config from "../app/config";
import routes from "./routes";

// Neobrutalism shared styles - only what global CSS doesn't cover
const neo = {
  input: {
    "& .MuiOutlinedInput-root": {
      borderRadius: 0,
      "& fieldset": {
        borderWidth: "2px",
        borderColor: "var(--coop-black)",
      },
      "&:hover fieldset": {
        borderColor: "var(--coop-black)",
      },
      "&.Mui-focused fieldset": {
        borderColor: "var(--coop-black)",
        borderWidth: "3px",
      },
    },
    "& .MuiInputLabel-root": {
      fontWeight: 700,
    },
  },
  primaryBtn: {
    borderRadius: 0,
    border: "3px solid var(--coop-black)",
    boxShadow: "var(--coop-shadow)",
    backgroundColor: "var(--coop-accent)",
    color: "var(--coop-black)",
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    px: 3,
    py: 1,
    "&:hover": {
      backgroundColor: "var(--coop-accent-hover)",
      boxShadow: "var(--coop-shadow-hover)",
      transform: "translate(-2px, -2px)",
    },
    "&:active": {
      boxShadow: "none",
      transform: "translate(4px, 4px)",
    },
    "&.Mui-disabled": {
      border: "3px solid var(--coop-gray-400)",
      backgroundColor: "var(--coop-gray-200)",
      color: "var(--coop-gray-400)",
      boxShadow: "4px 4px 0px var(--coop-gray-400)",
    },
  },
  dangerBtn: {
    borderRadius: 0,
    border: "3px solid var(--coop-black)",
    boxShadow: "var(--coop-shadow)",
    backgroundColor: "var(--coop-red)",
    color: "var(--coop-white)",
    fontWeight: 800,
    textTransform: "uppercase",
    px: 2,
    py: 0.5,
    "&:hover": {
      backgroundColor: "var(--coop-red-hover)",
      boxShadow: "var(--coop-shadow-hover)",
      transform: "translate(-2px, -2px)",
    },
    "&:active": {
      boxShadow: "none",
      transform: "translate(4px, 4px)",
    },
  },
  tab: {
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
  },
  tabs: {
    "& .MuiTabs-indicator": {
      left: 0,
      width: "6px",
      backgroundColor: "var(--coop-black)",
      transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    },
  },
  sectionHeading: {
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: "0.03em",
    mt: 0,
    mb: 2,
  },
  select: {
    borderRadius: 0,
    "& .MuiOutlinedInput-notchedOutline": {
      borderWidth: "2px",
      borderColor: "var(--coop-black)",
    },
    "&:hover .MuiOutlinedInput-notchedOutline": {
      borderColor: "var(--coop-black)",
    },
    "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
      borderColor: "var(--coop-black)",
      borderWidth: "3px",
    },
  },
};

// Black table header - uses fixed colors so it stays dark in both themes
const blackTableHead = {
  backgroundColor: "#000000 !important",
  "& .MuiTableCell-head": {
    color: "#FFFFFF !important",
    fontWeight: 800,
    textTransform: "uppercase",
    fontSize: "0.8rem",
    letterSpacing: "0.1em",
    borderBottom: "none",
  },
};

const authHeaders = () => ({
  Authorization: `Bearer ${session.token()}`,
});

const TabPanel = ({ children, value, index }) => (
  <div role="tabpanel" hidden={value !== index} id={`admin-tabpanel-${index}`} aria-labelledby={`admin-tab-${index}`}>
    {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
  </div>
);

// ============================================================================
// Users Tab
// ============================================================================
const UsersTab = () => {
  const { t } = useTranslation();
  const [users, setUsers] = useState([]);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchUsers = useCallback(async () => {
    try {
      const response = await fetchOrThrow(`${config.base_url}/v1/users`, {
        headers: authHeaders(),
      });
      const data = await response.json();
      setUsers(Array.isArray(data) ? data : []);
      setError("");
    } catch (e) {
      console.log("[AdminPanel] Error fetching users", e);
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;
    try {
      await fetchOrThrow(`${config.base_url}/v1/users`, {
        method: "POST",
        headers: {
          ...authHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      setSuccess(t("admin_users_created", "Benutzer \"{{username}}\" erfolgreich erstellt", { username: username.trim() }));
      setUsername("");
      setPassword("");
      setError("");
      await fetchUsers();
    } catch (e) {
      console.log("[AdminPanel] Error creating user", e);
      setError(e.message);
      setSuccess("");
    }
  };

  const handleDeleteUser = async (targetUsername) => {
    try {
      await fetchOrThrow(`${config.base_url}/v1/users`, {
        method: "DELETE",
        headers: {
          ...authHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username: targetUsername }),
      });
      setSuccess(t("admin_users_deleted", "Benutzer \"{{username}}\" geloescht", { username: targetUsername }));
      setError("");
      await fetchUsers();
    } catch (e) {
      console.log("[AdminPanel] Error deleting user", e);
      setError(e.message);
      setSuccess("");
    }
  };

  return (
    <Box>
      {error && (
        <Alert
          severity="error"
          sx={{ mb: 2, borderRadius: 0, fontWeight: 700 }}
          onClose={() => setError("")}
        >
          {error}
        </Alert>
      )}
      {success && (
        <Alert
          severity="success"
          sx={{ mb: 2, borderRadius: 0, fontWeight: 700 }}
          onClose={() => setSuccess("")}
        >
          {success}
        </Alert>
      )}

      {/* Users Table */}
      {users.length > 0 && (
        <Card sx={{ p: 0, mb: 3 }}>
          <TableContainer>
            <Table size="small">
              <TableHead sx={blackTableHead}>
                <TableRow>
                  <TableCell>{t("admin_users_col_username", "Benutzername")}</TableCell>
                  <TableCell>{t("admin_users_col_role", "Rolle")}</TableCell>
                  <TableCell>{t("admin_users_col_tier", "Stufe")}</TableCell>
                  <TableCell align="right">{t("admin_col_actions", "Aktionen")}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.username}>
                    <TableCell>{user.username}</TableCell>
                    <TableCell>{user.role || "-"}</TableCell>
                    <TableCell>{user.tier?.name || user.tier || "-"}</TableCell>
                    <TableCell align="right">
                      <IconButton
                        onClick={() => handleDeleteUser(user.username)}
                        sx={{
                          color: "var(--coop-red)",
                          "&:hover": { backgroundColor: "rgba(239,68,68,0.1)" },
                        }}
                        aria-label={t("admin_users_delete_aria", "Benutzer {{username}} loeschen", { username: user.username })}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}

      {users.length === 0 && (
        <Typography sx={{ fontWeight: 700, color: "var(--coop-gray-500)", mb: 2 }}>{t("admin_users_empty", "Keine Benutzer gefunden.")}</Typography>
      )}

      {/* Create User Form */}
      <Card sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={neo.sectionHeading}>
          <AddIcon sx={{ verticalAlign: "middle", mr: 1 }} />
          {t("admin_users_create_title", "Benutzer erstellen")}
        </Typography>
        <Box
          component="form"
          onSubmit={handleCreateUser}
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr auto" },
            gap: 2,
            alignItems: "end",
          }}
        >
          <TextField
            label={t("admin_users_col_username", "Benutzername")}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            size="small"
            required
            sx={neo.input}
          />
          <TextField
            label={t("signup_form_password", "Passwort")}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            size="small"
            required
            sx={neo.input}
          />
          <Button
            type="submit"
            variant="contained"
            startIcon={<AddIcon />}
            disabled={!username.trim() || !password.trim()}
            sx={{ ...neo.primaryBtn, height: "40px" }}
          >
            {t("admin_btn_create", "Erstellen")}
          </Button>
        </Box>
      </Card>
    </Box>
  );
};

// ============================================================================
// Chats (Topics) Tab
// ============================================================================
const ChatsTab = () => {
  const { t } = useTranslation();
  const [users, setUsers] = useState([]);
  const [topicStats, setTopicStats] = useState([]);
  const [joinRequests, setJoinRequests] = useState([]);
  const [username, setUsername] = useState("");
  const [topic, setTopic] = useState("");
  const [permission, setPermission] = useState("read-write");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchUsers = useCallback(async () => {
    try {
      const response = await fetchOrThrow(`${config.base_url}/v1/users`, {
        headers: authHeaders(),
      });
      const data = await response.json();
      setUsers(Array.isArray(data) ? data : []);
      setError("");
    } catch (e) {
      console.log("[AdminPanel] Error fetching users for chats", e);
      setError(e.message);
    }
  }, []);

  const fetchTopicStats = useCallback(async () => {
    try {
      const response = await fetchOrThrow(`${config.base_url}/v1/admin/topics/stats`, {
        headers: authHeaders(),
      });
      const data = await response.json();
      setTopicStats(Array.isArray(data.topics) ? data.topics : []);
    } catch (e) {
      console.log("[AdminPanel] Error fetching topic stats", e);
      setError(e.message);
    }
  }, []);

  const fetchJoinRequests = useCallback(async () => {
    try {
      const response = await fetchOrThrow(`${config.base_url}/v1/join-requests?status=pending`, {
        headers: authHeaders(),
      });
      const data = await response.json();
      setJoinRequests(Array.isArray(data) ? data : []);
    } catch (e) {
      console.log("[AdminPanel] Error fetching join requests", e);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
    fetchTopicStats();
    fetchJoinRequests();
  }, [fetchUsers, fetchTopicStats, fetchJoinRequests]);

  const handleResolveJoinRequest = async (id, status) => {
    try {
      await fetchOrThrow(`${config.base_url}/v1/join-requests/${id}`, {
        method: "PUT",
        headers: {
          ...authHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });
      setSuccess(status === "approved" ? t("admin_chats_join_approved", "Beitrittsanfrage genehmigt") : t("admin_chats_join_denied", "Beitrittsanfrage abgelehnt"));
      setError("");
      await fetchJoinRequests();
      if (status === "approved") {
        await fetchUsers();
      }
    } catch (e) {
      console.log("[AdminPanel] Error resolving join request", e);
      setError(e.message);
      setSuccess("");
    }
  };

  const handleDeleteTopic = async (topicName) => {
    try {
      await fetchOrThrow(`${config.base_url}/v1/admin/topics/${encodeURIComponent(topicName)}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      setSuccess(t("admin_chats_topic_deleted", "Chat \"{{topic}}\" und alle Nachrichten geloescht", { topic: topicName }));
      setError("");
      await fetchTopicStats();
      await fetchUsers();
    } catch (e) {
      console.log("[AdminPanel] Error deleting topic", e);
      setError(e.message);
      setSuccess("");
    }
  };

  const formatTimestamp = (ts) => {
    if (!ts) return "-";
    const date = new Date(ts * 1000);
    return date.toLocaleString();
  };

  const handleGrantAccess = async (e) => {
    e.preventDefault();
    if (!username.trim() || !topic.trim()) return;
    try {
      await fetchOrThrow(`${config.base_url}/v1/users/access`, {
        method: "POST",
        headers: {
          ...authHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: username.trim(),
          topic: topic.trim(),
          permission,
        }),
      });
      setSuccess(t("admin_chats_access_granted", "Zugriff erteilt: {{username}} -> {{topic}} ({{permission}})", { username: username.trim(), topic: topic.trim(), permission }));
      setUsername("");
      setTopic("");
      setError("");
      await fetchUsers();
    } catch (e) {
      console.log("[AdminPanel] Error granting access", e);
      setError(e.message);
      setSuccess("");
    }
  };

  const handleRevokeAccess = async (targetUsername, targetTopic) => {
    try {
      await fetchOrThrow(`${config.base_url}/v1/users/access`, {
        method: "DELETE",
        headers: {
          ...authHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: targetUsername,
          topic: targetTopic,
        }),
      });
      setSuccess(t("admin_chats_access_revoked", "Zugriff entzogen: {{username}} -> {{topic}}", { username: targetUsername, topic: targetTopic }));
      setError("");
      await fetchUsers();
    } catch (e) {
      console.log("[AdminPanel] Error revoking access", e);
      setError(e.message);
      setSuccess("");
    }
  };

  return (
    <Box>
      {error && (
        <Alert
          severity="error"
          sx={{ mb: 2, borderRadius: 0, fontWeight: 700 }}
          onClose={() => setError("")}
        >
          {error}
        </Alert>
      )}
      {success && (
        <Alert
          severity="success"
          sx={{ mb: 2, borderRadius: 0, fontWeight: 700 }}
          onClose={() => setSuccess("")}
        >
          {success}
        </Alert>
      )}

      {/* Topic Stats - All Chats with message counts */}
      <Typography variant="h6" sx={{ ...neo.sectionHeading, display: "flex", alignItems: "center" }}>
        <StorageIcon sx={{ mr: 1 }} />
        {t("admin_chats_all_title", "Alle Chats")}
      </Typography>
      {topicStats.length > 0 ? (
        <Card sx={{ p: 0, mb: 3 }}>
          <TableContainer>
            <Table size="small">
              <TableHead sx={blackTableHead}>
                <TableRow>
                  <TableCell>{t("admin_chats_col_id", "Chat-ID")}</TableCell>
                  <TableCell>{t("admin_chats_col_messages", "Nachrichten")}</TableCell>
                  <TableCell>{t("admin_chats_col_last_activity", "Letzte Aktivitaet")}</TableCell>
                  <TableCell align="right">{t("admin_col_actions", "Aktionen")}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {topicStats.map((ts) => (
                  <TableRow key={ts.topic}>
                    <TableCell sx={{ fontFamily: "monospace", fontSize: "0.85rem" }}>
                      {ts.topic}
                    </TableCell>
                    <TableCell>{ts.message_count}</TableCell>
                    <TableCell>{formatTimestamp(ts.last_activity)}</TableCell>
                    <TableCell align="right">
                      <IconButton
                        onClick={() => handleDeleteTopic(ts.topic)}
                        sx={{
                          color: "var(--coop-red)",
                          "&:hover": { backgroundColor: "rgba(239,68,68,0.1)" },
                        }}
                        aria-label={t("admin_chats_delete_aria", "Chat {{topic}} loeschen", { topic: ts.topic })}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      ) : (
        <Typography sx={{ fontWeight: 700, color: "var(--coop-gray-500)", mb: 3 }}>
          {t("admin_chats_empty", "Keine Nachrichten in der Datenbank.")}
        </Typography>
      )}

      {/* Join Requests */}
      <Typography variant="h6" sx={{ ...neo.sectionHeading, display: "flex", alignItems: "center" }}>
        <GroupAddIcon sx={{ mr: 1 }} />
        {t("admin_chats_join_requests_title", "Beitrittsanfragen")}
      </Typography>
      {joinRequests.length > 0 ? (
        <Card sx={{ p: 0, mb: 3 }}>
          <TableContainer>
            <Table size="small">
              <TableHead sx={blackTableHead}>
                <TableRow>
                  <TableCell>{t("admin_chats_col_user", "Benutzer")}</TableCell>
                  <TableCell>{t("admin_chats_col_channel", "Chat-Kanal")}</TableCell>
                  <TableCell>{t("admin_chats_col_requested_at", "Angefragt am")}</TableCell>
                  <TableCell align="right">{t("admin_col_actions", "Aktionen")}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {joinRequests.map((jr) => (
                  <TableRow key={jr.id}>
                    <TableCell>{jr.username}</TableCell>
                    <TableCell sx={{ fontFamily: "monospace", fontSize: "0.85rem" }}>
                      {jr.topic}
                    </TableCell>
                    <TableCell>{new Date(jr.created_at * 1000).toLocaleString()}</TableCell>
                    <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                      <IconButton
                        onClick={() => handleResolveJoinRequest(jr.id, "approved")}
                        sx={{
                          color: "var(--coop-green, #22c55e)",
                          "&:hover": { backgroundColor: "rgba(34,197,94,0.1)" },
                        }}
                        aria-label={t("admin_chats_join_approve_aria", "Anfrage von {{username}} genehmigen", { username: jr.username })}
                      >
                        <CheckIcon />
                      </IconButton>
                      <IconButton
                        onClick={() => handleResolveJoinRequest(jr.id, "denied")}
                        sx={{
                          color: "var(--coop-red)",
                          "&:hover": { backgroundColor: "rgba(239,68,68,0.1)" },
                        }}
                        aria-label={t("admin_chats_join_deny_aria", "Anfrage von {{username}} ablehnen", { username: jr.username })}
                      >
                        <CloseIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      ) : (
        <Typography sx={{ fontWeight: 700, color: "var(--coop-gray-500)", mb: 3 }}>
          {t("admin_chats_join_empty", "Keine offenen Beitrittsanfragen.")}
        </Typography>
      )}

      {/* Users with Access */}
      {users.length > 0 && (
        <Card sx={{ p: 0, mb: 3 }}>
          <TableContainer>
            <Table size="small">
              <TableHead sx={blackTableHead}>
                <TableRow>
                  <TableCell>{t("admin_chats_col_user", "Benutzer")}</TableCell>
                  <TableCell>{t("admin_chats_col_channel", "Chat-Kanal")}</TableCell>
                  <TableCell>{t("admin_chats_col_permission", "Berechtigung")}</TableCell>
                  <TableCell align="right">{t("admin_col_actions", "Aktionen")}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users
                  .filter((user) => user.grants && user.grants.length > 0)
                  .flatMap((user) =>
                    user.grants.map((grant) => (
                      <TableRow key={`${user.username}-${grant.topic}`}>
                        <TableCell>{user.username}</TableCell>
                        <TableCell>{grant.topic}</TableCell>
                        <TableCell>{grant.permission || "-"}</TableCell>
                        <TableCell align="right">
                          <IconButton
                            onClick={() => handleRevokeAccess(user.username, grant.topic)}
                            sx={{
                              color: "var(--coop-red)",
                              "&:hover": { backgroundColor: "rgba(239,68,68,0.1)" },
                            }}
                            aria-label={t("admin_chats_revoke_aria", "Zugriff fuer {{username}} auf {{topic}} entziehen", { username: user.username, topic: grant.topic })}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}

      {/* Grant Access Form */}
      <Card sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={neo.sectionHeading}>
          <ChatIcon sx={{ verticalAlign: "middle", mr: 1 }} />
          {t("admin_chats_grant_title", "Chat-Zugriff erteilen")}
        </Typography>
        <Box
          component="form"
          onSubmit={handleGrantAccess}
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "1fr 1fr auto auto" },
            gap: 2,
            alignItems: "end",
          }}
        >
          <TextField
            label={t("admin_users_col_username", "Benutzername")}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            size="small"
            required
            sx={neo.input}
            placeholder={t("admin_chats_username_placeholder", "z.B. max")}
          />
          <TextField
            label={t("admin_chats_col_channel", "Chat-Kanal")}
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            size="small"
            required
            sx={neo.input}
            placeholder={t("admin_chats_channel_placeholder", "z.B. team-chat")}
          />
          <FormControl size="small">
            <InputLabel sx={{ fontWeight: 700 }}>{t("admin_chats_col_permission", "Berechtigung")}</InputLabel>
            <Select
              value={permission}
              label={t("admin_chats_col_permission", "Berechtigung")}
              onChange={(e) => setPermission(e.target.value)}
              sx={{ ...neo.select, minWidth: "180px" }}
            >
              <MenuItem value="read-write">{t("admin_chats_perm_rw", "Lesen + Schreiben")}</MenuItem>
              <MenuItem value="read-only">{t("admin_chats_perm_ro", "Nur Lesen")}</MenuItem>
            </Select>
          </FormControl>
          <Button
            type="submit"
            variant="contained"
            startIcon={<AddIcon />}
            disabled={!username.trim() || !topic.trim()}
            sx={{ ...neo.primaryBtn, height: "40px" }}
          >
            {t("admin_chats_grant_button", "Erteilen")}
          </Button>
        </Box>
      </Card>
    </Box>
  );
};

// ============================================================================
// Invites Tab
// ============================================================================
const InvitesTab = () => {
  const { t } = useTranslation();
  const [invites, setInvites] = useState([]);
  const [topics, setTopics] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [expires, setExpires] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [copySnackOpen, setCopySnackOpen] = useState(false);

  const fetchInvites = useCallback(async () => {
    try {
      const response = await fetchOrThrow(`${config.base_url}/v1/invites`, {
        headers: authHeaders(),
      });
      const data = await response.json();
      setInvites(Array.isArray(data) ? data : []);
      setError("");
    } catch (e) {
      console.log("[AdminPanel] Error fetching invites", e);
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    fetchInvites();
  }, [fetchInvites]);

  const handleCreateInvite = async (e) => {
    e.preventDefault();
    try {
      const topicsClean = topics
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t !== "")
        .join(",");
      const body = {
        topics: topicsClean,
      };
      if (maxUses && parseInt(maxUses, 10) > 0) {
        body.max_uses = parseInt(maxUses, 10);
      }
      if (expires) {
        body.expires = Math.floor(new Date(expires).getTime() / 1000);
      }
      await fetchOrThrow(`${config.base_url}/v1/invites`, {
        method: "POST",
        headers: {
          ...authHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      setSuccess(t("admin_invites_created", "Einladung erfolgreich erstellt"));
      setTopics("");
      setMaxUses("");
      setExpires("");
      setError("");
      await fetchInvites();
    } catch (e) {
      console.log("[AdminPanel] Error creating invite", e);
      setError(e.message);
      setSuccess("");
    }
  };

  const handleDeleteInvite = async (token) => {
    try {
      await fetchOrThrow(`${config.base_url}/v1/invites/${token}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      setSuccess(t("admin_invites_deleted", "Einladung geloescht"));
      setError("");
      await fetchInvites();
    } catch (e) {
      console.log("[AdminPanel] Error deleting invite", e);
      setError(e.message);
      setSuccess("");
    }
  };

  const handleCopyLink = (token) => {
    const inviteUrl = `${window.location.origin}/invite/${token}`;
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(inviteUrl);
    } else {
      const textarea = document.createElement("textarea");
      textarea.value = inviteUrl;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    setCopySnackOpen(true);
  };

  const formatTimestamp = (ts) => {
    if (!ts) return "-";
    const date = new Date(ts * 1000);
    return date.toLocaleString();
  };

  return (
    <Box>
      {error && (
        <Alert
          severity="error"
          sx={{ mb: 2, borderRadius: 0, fontWeight: 700 }}
          onClose={() => setError("")}
        >
          {error}
        </Alert>
      )}
      {success && (
        <Alert
          severity="success"
          sx={{ mb: 2, borderRadius: 0, fontWeight: 700 }}
          onClose={() => setSuccess("")}
        >
          {success}
        </Alert>
      )}

      {/* Invites Table */}
      {invites.length > 0 && (
        <Card sx={{ p: 0, mb: 3 }}>
          <TableContainer>
            <Table size="small">
              <TableHead sx={blackTableHead}>
                <TableRow>
                  <TableCell>{t("admin_invites_col_token", "Token")}</TableCell>
                  <TableCell>{t("admin_invites_col_created_by", "Erstellt von")}</TableCell>
                  <TableCell>{t("admin_invites_col_channels", "Chat-Kanaele")}</TableCell>
                  <TableCell>{t("admin_invites_col_max_uses", "Max. Nutzungen")}</TableCell>
                  <TableCell>{t("admin_invites_col_used", "Genutzt")}</TableCell>
                  <TableCell>{t("admin_invites_col_expires", "Gueltig bis")}</TableCell>
                  <TableCell align="right">{t("admin_col_actions", "Aktionen")}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {invites.map((invite) => (
                  <TableRow key={invite.token}>
                    <TableCell sx={{ fontFamily: "monospace", fontSize: "0.8rem" }}>
                      {invite.token?.slice(0, 12)}...
                    </TableCell>
                    <TableCell>{invite.created_by || "-"}</TableCell>
                    <TableCell>
                      {Array.isArray(invite.topics) ? invite.topics.join(", ") : invite.topics || "-"}
                    </TableCell>
                    <TableCell>{invite.max_uses || t("admin_invites_unlimited", "Unbegrenzt")}</TableCell>
                    <TableCell>{invite.used || 0}</TableCell>
                    <TableCell>{formatTimestamp(invite.expires)}</TableCell>
                    <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                      <IconButton
                        onClick={() => handleCopyLink(invite.token)}
                        sx={{
                          color: "var(--coop-blue)",
                          "&:hover": { backgroundColor: "rgba(59,130,246,0.1)" },
                        }}
                        aria-label={t("admin_invites_copy_aria", "Einladungslink kopieren")}
                      >
                        <ContentCopyIcon />
                      </IconButton>
                      <IconButton
                        onClick={() => handleDeleteInvite(invite.token)}
                        sx={{
                          color: "var(--coop-red)",
                          "&:hover": { backgroundColor: "rgba(239,68,68,0.1)" },
                        }}
                        aria-label={t("admin_invites_delete_aria", "Einladung loeschen")}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}

      {invites.length === 0 && (
        <Typography sx={{ fontWeight: 700, color: "var(--coop-gray-500)", mb: 2 }}>{t("admin_invites_empty", "Keine Einladungen vorhanden.")}</Typography>
      )}

      {/* Create Invite Form */}
      <Card sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={neo.sectionHeading}>
          <LinkIcon sx={{ verticalAlign: "middle", mr: 1 }} />
          {t("admin_invites_create_title", "Einladung erstellen")}
        </Typography>
        <Typography variant="body2" sx={{ color: "var(--coop-gray-500)", mb: 2 }}>
          {t("admin_invites_create_desc", "Generiert einen Einmal-Link fuer neue Nutzer.")}
        </Typography>
        <Box
          component="form"
          onSubmit={handleCreateInvite}
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "2fr 1fr 1fr auto" },
            gap: 2,
            alignItems: "end",
          }}
        >
          <TextField
            label={t("admin_invites_col_channels", "Chat-Kanaele")}
            value={topics}
            onChange={(e) => setTopics(e.target.value)}
            size="small"
            sx={neo.input}
            placeholder={t("admin_invites_channels_placeholder", "z.B. team-chat, announcements")}
          />
          <TextField
            label={t("admin_invites_col_max_uses", "Max. Nutzungen")}
            type="number"
            value={maxUses}
            onChange={(e) => setMaxUses(e.target.value)}
            size="small"
            sx={neo.input}
            inputProps={{ min: 1 }}
          />
          <TextField
            label={t("admin_invites_col_expires", "Gueltig bis")}
            type="datetime-local"
            value={expires}
            onChange={(e) => setExpires(e.target.value)}
            size="small"
            sx={neo.input}
            InputLabelProps={{ shrink: true }}
          />
          <Button
            type="submit"
            variant="contained"
            startIcon={<AddIcon />}
            sx={{ ...neo.primaryBtn, height: "40px" }}
          >
            {t("admin_btn_create", "Erstellen")}
          </Button>
        </Box>
      </Card>

      <Snackbar
        open={copySnackOpen}
        autoHideDuration={3000}
        onClose={() => setCopySnackOpen(false)}
        message={t("admin_invites_copied", "Einladungslink in Zwischenablage kopiert!")}
      />
    </Box>
  );
};

// ============================================================================
// Main AdminPanel Component
// ============================================================================
const AdminPanel = () => {
  const { t } = useTranslation();
  const [tabIndex, setTabIndex] = useState(0);

  if (!session.exists()) {
    window.location.href = routes.login;
    return null;
  }

  return (
    <Container maxWidth="md" sx={{ mt: 3, mb: 3 }}>
      {/* Tabs */}
      <Box sx={{ borderBottom: "3px solid var(--coop-black)" }}>
        <Tabs
          value={tabIndex}
          onChange={(_, newVal) => setTabIndex(newVal)}
          sx={neo.tabs}
        >
          <Tab
            icon={<PersonIcon />}
            iconPosition="start"
            label={t("admin_tab_users", "Benutzer")}
            sx={neo.tab}
            id="admin-tab-0"
            aria-controls="admin-tabpanel-0"
          />
          <Tab
            icon={<ChatIcon />}
            iconPosition="start"
            label={t("admin_tab_chats", "Chats")}
            sx={neo.tab}
            id="admin-tab-1"
            aria-controls="admin-tabpanel-1"
          />
          <Tab
            icon={<LinkIcon />}
            iconPosition="start"
            label={t("admin_tab_invites", "Einladungen")}
            sx={neo.tab}
            id="admin-tab-2"
            aria-controls="admin-tabpanel-2"
          />
        </Tabs>
      </Box>

      {/* Tab Panels */}
      <TabPanel value={tabIndex} index={0}>
        <UsersTab />
      </TabPanel>
      <TabPanel value={tabIndex} index={1}>
        <ChatsTab />
      </TabPanel>
      <TabPanel value={tabIndex} index={2}>
        <InvitesTab />
      </TabPanel>
    </Container>
  );
};

export default AdminPanel;
