import { isTauri } from "@tauri-apps/api/core";
import { locale as osLocale } from "@tauri-apps/plugin-os";
import en from "./locales/en";
import ja from "./locales/ja";
import ko from "./locales/ko";
import th from "./locales/th";
import zhCN from "./locales/zh-CN";
import type { MessageKey, Messages } from "./types";

export type { MessageKey, Messages };

/** Supported languages. `name` is always written in its own language. */
export const LOCALES = [
  { code: "en", name: "English", messages: en },
  { code: "th", name: "ไทย", messages: th },
  { code: "zh-CN", name: "简体中文", messages: zhCN },
  { code: "ja", name: "日本語", messages: ja },
  { code: "ko", name: "한국어", messages: ko },
] as const satisfies readonly { code: string; name: string; messages: Messages }[];

export type LocaleCode = (typeof LOCALES)[number]["code"];
export type LocalePref = LocaleCode | "system";

const STORAGE_KEY = "irontion.locale";
const FALLBACK: LocaleCode = "en";

/** Map any BCP-47 tag (e.g. `th-TH`, `zh-Hans-CN`, `ja_JP.UTF-8`) to a supported locale. */
export function matchLocale(tag: string | null | undefined): LocaleCode {
  if (!tag) return FALLBACK;
  const lang = tag.replace("_", "-").split(/[-.]/)[0].toLowerCase();
  if (lang === "zh") return "zh-CN";
  return LOCALES.find((l) => l.code === lang)?.code ?? FALLBACK;
}

function readSavedPref(): LocalePref {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "system" || LOCALES.some((l) => l.code === saved)) return saved as LocalePref;
  } catch {
    // Storage unavailable: follow the OS.
  }
  return "system";
}

function lookup(messages: Messages, key: string): string | undefined {
  let node: unknown = messages;
  for (const part of key.split(".")) {
    if (typeof node !== "object" || node === null) return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === "string" ? node : undefined;
}

class I18nState {
  pref = $state<LocalePref>(readSavedPref());
  systemLocale = $state<LocaleCode>(matchLocale(globalThis.navigator?.language));
  locale = $derived<LocaleCode>(this.pref === "system" ? this.systemLocale : this.pref);

  /** Ask the OS for its language (more reliable than the webview inside Tauri). */
  async init() {
    if (!isTauri()) return;
    try {
      this.systemLocale = matchLocale(await osLocale());
    } catch (err) {
      console.warn("[i18n] could not read OS locale", err);
    }
  }

  set(pref: LocalePref) {
    this.pref = pref;
    try {
      localStorage.setItem(STORAGE_KEY, pref);
    } catch {
      // Not persisted; applies for this session.
    }
  }

  /** Translate a key, replacing `{name}` placeholders. Falls back to English, then the key. */
  t = (key: MessageKey, params?: Record<string, string | number>): string => {
    const messages = LOCALES.find((l) => l.code === this.locale)?.messages ?? en;
    const text = lookup(messages, key) ?? lookup(en, key) ?? key;
    if (!params) return text;
    return text.replace(/\{(\w+)\}/g, (match, name: string) =>
      name in params ? String(params[name]) : match,
    );
  };

  nameOf(code: LocaleCode): string {
    return LOCALES.find((l) => l.code === code)?.name ?? code;
  }
}

export const i18n = new I18nState();
export const t = i18n.t;

/** "2 h 30 min", "45 min" or "3 h" in the current language. */
export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return t("units.minutes", { m });
  if (m === 0) return t("units.hours", { n: h });
  return t("units.hoursMinutes", { h, m });
}

/** "3%" for 0.03, in the current language. */
export function formatPercent(ratio: number): string {
  return new Intl.NumberFormat(i18n.locale, { style: "percent", maximumFractionDigits: 0 }).format(ratio);
}
