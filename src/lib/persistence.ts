import { get, set, del, keys } from "idb-keyval";
import type { GameRecord, SetupConfig } from "./types";

const GAME_PREFIX = "game:";
const SETTINGS_KEY = "settings:v1";
const THEME_KEY = "theme:prefs";

export async function saveGame(record: GameRecord): Promise<void> {
  await set(`${GAME_PREFIX}${record.id}`, record);
}

export async function getGame(id: string): Promise<GameRecord | undefined> {
  return get(`${GAME_PREFIX}${id}`);
}

export async function listGames(): Promise<GameRecord[]> {
  const allKeys = await keys();
  const gameKeys = allKeys.filter(
    (k) => typeof k === "string" && k.startsWith(GAME_PREFIX)
  ) as string[];
  const games = await Promise.all(gameKeys.map((k) => get<GameRecord>(k)));
  return games
    .filter((g): g is GameRecord => !!g)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function deleteGame(id: string): Promise<void> {
  await del(`${GAME_PREFIX}${id}`);
}

export async function saveSettings(settings: Partial<SetupConfig>): Promise<void> {
  const prev = (await get<Partial<SetupConfig>>(SETTINGS_KEY)) ?? {};
  await set(SETTINGS_KEY, { ...prev, ...settings });
}

export async function loadSettings(): Promise<Partial<SetupConfig>> {
  return (await get<Partial<SetupConfig>>(SETTINGS_KEY)) ?? {};
}

export interface ThemePrefs {
  boardTheme: "swiss" | "classic";
  showCoordinates: boolean;
  sound: boolean;
}

export async function saveThemePrefs(prefs: ThemePrefs): Promise<void> {
  if (typeof window !== "undefined") {
    localStorage.setItem(THEME_KEY, JSON.stringify(prefs));
  }
  await set(THEME_KEY, prefs);
}

export function loadThemePrefsSync(): ThemePrefs {
  const defaults: ThemePrefs = {
    boardTheme: "swiss",
    showCoordinates: true,
    sound: true,
  };
  if (typeof window === "undefined") return defaults;
  try {
    const raw = localStorage.getItem(THEME_KEY);
    if (!raw) return defaults;
    return { ...defaults, ...JSON.parse(raw) };
  } catch {
    return defaults;
  }
}

export function newGameId(): string {
  return `g_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
