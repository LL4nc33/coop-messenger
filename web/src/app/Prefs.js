import db from "./db";

export const THEME = {
  DARK: "dark",
  LIGHT: "light",
};

class Prefs {
  constructor(dbImpl) {
    this.db = dbImpl;
  }

  async setSound(sound) {
    this.db.prefs.put({ key: "sound", value: sound.toString() });
  }

  async sound() {
    const sound = await this.db.prefs.get("sound");
    return sound ? sound.value : "ding";
  }

  async setMinPriority(minPriority) {
    this.db.prefs.put({ key: "minPriority", value: minPriority.toString() });
  }

  async minPriority() {
    const minPriority = await this.db.prefs.get("minPriority");
    return minPriority ? Number(minPriority.value) : 1;
  }

  async setDeleteAfter(deleteAfter) {
    await this.db.prefs.put({ key: "deleteAfter", value: deleteAfter.toString() });
  }

  async deleteAfter() {
    const deleteAfter = await this.db.prefs.get("deleteAfter");
    return deleteAfter ? Number(deleteAfter.value) : 604800; // Default is one week
  }

  async webPushEnabled() {
    const webPushEnabled = await this.db.prefs.get("webPushEnabled");
    return webPushEnabled?.value;
  }

  async setWebPushEnabled(enabled) {
    await this.db.prefs.put({ key: "webPushEnabled", value: enabled });
  }

  async theme() {
    const theme = await this.db.prefs.get("theme");
    return theme?.value ?? THEME.LIGHT;
  }

  async setTheme(mode) {
    await this.db.prefs.put({ key: "theme", value: mode });
  }

  async accentColor() {
    const accent = await this.db.prefs.get("accentColor");
    return accent?.value ?? "earth";
  }

  async setAccentColor(color) {
    await this.db.prefs.put({ key: "accentColor", value: color });
  }

  async customAccentColor() {
    const custom = await this.db.prefs.get("customAccentColor");
    return custom?.value ?? "#C4A265";
  }

  async setCustomAccentColor(hex) {
    await this.db.prefs.put({ key: "customAccentColor", value: hex });
  }
}

const prefs = new Prefs(db());
export default prefs;
