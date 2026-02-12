import config from "./config";
import session from "./Session";
import { maybeWithBearerAuth } from "./utils";

const commands = [
  {
    name: "gurr",
    args: null,
    description: "Angurren (Nudge)",
    serverSide: true,
  },
  {
    name: "status",
    args: "<text>",
    description: "Status setzen",
    serverSide: true,
  },
  {
    name: "flieg",
    args: null,
    description: "Chat verlassen",
    serverSide: true,
  },
  {
    name: "mitglieder",
    args: null,
    description: "Mitgliederliste oeffnen",
    serverSide: false,
  },
];

/**
 * Parse a slash command from text input.
 * Returns { command, args } or null if not a command.
 */
export const parseCommand = (text) => {
  if (!text || !text.startsWith("/")) return null;
  const parts = text.trim().split(/\s+/);
  const name = parts[0].slice(1).toLowerCase();
  const args = parts.slice(1).join(" ");
  const cmd = commands.find((c) => c.name === name);
  if (!cmd) return null;
  return { ...cmd, inputArgs: args };
};

/**
 * Filter commands by partial input (for autocomplete).
 */
export const filterCommands = (input) => {
  if (!input || !input.startsWith("/")) return [];
  const partial = input.slice(1).toLowerCase();
  return commands.filter((c) => c.name.startsWith(partial));
};

/**
 * Execute a server-side command.
 */
export const executeServerCommand = async (commandName, topic, args) => {
  const url = `${config.base_url}/v1/coop/commands`;
  const headers = {
    ...maybeWithBearerAuth({}, session.token()),
    "Content-Type": "application/json",
  };
  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ command: commandName, topic, args }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || "Command failed");
  }
  return response.json();
};

export default commands;
