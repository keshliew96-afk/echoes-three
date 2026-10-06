// LANGUAGES (docs/I18N.md) — the player-facing text layer. The game's text is
// written in English at the call site and looked up here at display time:
//
//   t('Choose your class')                       -> the current language's line
//   t('Health {hp}', { hp: 120 })                -> placeholders filled after lookup
//   tn(n, '{n} Ember', '{n} Embers')             -> plural forms (Intl.PluralRules)
//
// The English text IS the key, so a line nobody translated yet falls back to
// English instead of showing a key. Each language is one JSON table under
// ./locales/<code>.json mapping the English line to its translation (a plural
// line maps to { one, few, many, other }); only the active table is loaded.
//
// UI only. Nothing under src/sim or src/core imports this: the simulation and
// its seeded streams never see a translated string, so the golden simtrace
// hashes do not depend on the language.
//
// The language is the `ui.language` setting. This module reads it straight
// from the settings blob when it loads (a top-level await, so every importer
// sees the table), before the settings store exists; with no stored choice it follows the
// browser's language when that is one of the ten, else English. Switching
// language reloads the page (applyLanguage) so every screen is rebuilt in it.

export const LANGUAGES = Object.freeze([
  { code: 'en', name: 'English', english: 'English' },
  { code: 'zh-Hans', name: '简体中文', english: 'Simplified Chinese' },
  { code: 'zh-Hant', name: '繁體中文', english: 'Traditional Chinese' },
  { code: 'ja', name: '日本語', english: 'Japanese' },
  { code: 'ko', name: '한국어', english: 'Korean' },
  { code: 'es', name: 'Español', english: 'Spanish' },
  { code: 'pt-BR', name: 'Português (Brasil)', english: 'Brazilian Portuguese' },
  { code: 'fr', name: 'Français', english: 'French' },
  { code: 'de', name: 'Deutsch', english: 'German' },
  { code: 'ru', name: 'Русский', english: 'Russian' },
]);
export const LANGUAGE_CODES = Object.freeze(LANGUAGES.map((l) => l.code));
export const LANGUAGE_KEY = 'ui.language';
const SETTINGS_BLOB = 'echoes.settings'; // src/app/settings.js SETTINGS_STORAGE_KEY

// CJK fallbacks per language, in the order each script's own fonts should win
// (a Japanese face listed first would draw Chinese with Japanese glyph shapes).
// The UI font stacks end in var(--i18n-font, sans-serif).
const CJK_FONTS = {
  'zh-Hans': "'PingFang SC', 'Microsoft YaHei', 'Noto Sans CJK SC', 'Noto Sans SC', 'Source Han Sans SC', 'WenQuanYi Zen Hei', sans-serif",
  'zh-Hant': "'PingFang TC', 'Microsoft JhengHei', 'Noto Sans CJK TC', 'Noto Sans TC', 'Source Han Sans TC', 'WenQuanYi Zen Hei', sans-serif",
  ja: "'Hiragino Sans', 'Hiragino Kaku Gothic ProN', 'Yu Gothic UI', 'Meiryo', 'Noto Sans CJK JP', 'Noto Sans JP', sans-serif",
  ko: "'Apple SD Gothic Neo', 'Malgun Gothic', 'Noto Sans CJK KR', 'Noto Sans KR', sans-serif",
};

let lang = 'en';
let table = null; // the active language's table (null for English)
let plural = null; // Intl.PluralRules for the active language
const misses = new Set(); // lines asked for in a non-English language with no translation
const seen = new Set(); // every line looked up this session (probe coverage)

export function detectLanguage(list) {
  const prefs = Array.isArray(list) ? list : [];
  for (const raw of prefs) {
    const tag = String(raw || '').toLowerCase();
    if (!tag) continue;
    if (tag.startsWith('zh')) {
      return /hant|-tw|-hk|-mo/.test(tag) ? 'zh-Hant' : 'zh-Hans';
    }
    if (tag.startsWith('pt')) return 'pt-BR';
    const base = tag.split('-')[0];
    const hit = LANGUAGE_CODES.find((c) => c === base);
    if (hit) return hit;
  }
  return 'en';
}

function storedLanguage() {
  try {
    const raw = window.localStorage.getItem(SETTINGS_BLOB);
    const doc = raw ? JSON.parse(raw) : null;
    const v = doc && doc.data ? doc.data[LANGUAGE_KEY] : undefined;
    return LANGUAGE_CODES.includes(v) ? v : null;
  } catch {
    return null;
  }
}

function browserLanguage() {
  try {
    const nav = window.navigator || {};
    return detectLanguage(nav.languages && nav.languages.length ? nav.languages : [nav.language]);
  } catch {
    return 'en';
  }
}

// ?lang=xx overrides for one page load (probes, screenshots); not stored.
function urlLanguage() {
  try {
    const v = new URLSearchParams(window.location.search).get('lang');
    return LANGUAGE_CODES.includes(v) ? v : null;
  } catch {
    return null;
  }
}

// Vite turns the glob into one lazy chunk per language; plain Node (the save
// and sim tools that import UI-adjacent modules) has no glob and gets English.
let LOADERS = {};
try {
  LOADERS = import.meta.glob('./locales/*.json', { import: 'default' });
} catch {
  LOADERS = {};
}

async function loadTable(code) {
  if (code === 'en') return null;
  const load = LOADERS[`./locales/${code}.json`];
  if (!load) return null;
  try {
    return await load();
  } catch {
    return null;
  }
}

function applyDocument(code) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.lang = code;
  const font = CJK_FONTS[code];
  if (font) root.style.setProperty('--i18n-font', font);
  else root.style.removeProperty('--i18n-font');
  // The static boot splash in index.html is painted before any module runs.
  for (const [sel, en] of [
    ['.bs-status', 'Lighting the hearth…'],
    ['.bs-press', 'Press any key or click'],
  ]) {
    const n = document.querySelector(sel);
    if (n && n.textContent.trim() === en) n.textContent = t(en);
  }
}

export async function initI18n(code) {
  const want = LANGUAGE_CODES.includes(code) ? code : urlLanguage() || storedLanguage() || browserLanguage();
  table = await loadTable(want);
  lang = want === 'en' || table ? want : 'en';
  try {
    plural = new Intl.PluralRules(lang);
  } catch {
    plural = null;
  }
  misses.clear();
  applyDocument(lang);
  return lang;
}

export function getLanguage() {
  return lang;
}

export function languageName(code = lang) {
  const l = LANGUAGES.find((x) => x.code === code);
  return l ? l.name : code;
}

function fill(s, vars) {
  if (!vars) return s;
  return s.replace(/\{(\w+)\}/g, (m, k) => (Object.prototype.hasOwnProperty.call(vars, k) && vars[k] !== undefined && vars[k] !== null ? String(vars[k]) : m));
}

// The current language's line for an English one. Non-strings (a missing data
// field) pass through as ''. Unknown lines fall back to English.
export function t(en, vars) {
  if (en === undefined || en === null) return '';
  const key = String(en);
  if (!key) return '';
  seen.add(key);
  if (!table) return fill(key, vars);
  const hit = table[key];
  if (typeof hit === 'string') return fill(hit, vars);
  if (hit && typeof hit === 'object' && typeof hit.other === 'string') return fill(hit.other, vars);
  misses.add(key);
  return fill(key, vars);
}

// Plural line: English picks `one` for n === 1, else `other`; a translation
// keyed by the English `other` form is either one string or
// { zero?, one?, two?, few?, many?, other } chosen by Intl.PluralRules.
// `{n}` is filled with n unless vars name it.
export function tn(n, one, other, vars) {
  const v = { n, ...(vars || {}) };
  const key = String(other);
  seen.add(key);
  if (key !== String(one)) seen.add(String(one));
  if (!table) return fill(n === 1 ? String(one) : key, v);
  const hit = table[key];
  if (typeof hit === 'string') return fill(hit, v);
  if (hit && typeof hit === 'object') {
    let form = 'other';
    try {
      form = plural ? plural.select(n) : 'other';
    } catch {
      form = 'other';
    }
    const s = typeof hit[form] === 'string' ? hit[form] : hit.other;
    if (typeof s === 'string') return fill(s, v);
  }
  misses.add(key);
  return fill(n === 1 ? String(one) : key, v);
}

// Register the setting with the app's settings store (src/app/settings.js).
// The stored value only exists once the player picks a language; until then
// the browser's language rules.
export function registerLanguageSetting(settings) {
  if (!settings || typeof settings.register !== 'function') return;
  settings.register(LANGUAGE_KEY, {
    default: lang,
    validate: (v) => (LANGUAGE_CODES.includes(v) ? v : undefined),
  });
}

// Store the new language and rebuild the page in it.
export function applyLanguage(code, settings) {
  if (!LANGUAGE_CODES.includes(code)) return false;
  try {
    if (settings) {
      settings.set(LANGUAGE_KEY, code, { source: 'ui' });
      if (typeof settings.persist === 'function') settings.persist();
    }
  } catch {
    /* the reload still switches if the store already wrote */
  }
  try {
    const url = new URL(window.location.href);
    url.searchParams.delete('lang');
    window.location.replace(url.toString());
  } catch {
    window.location.reload();
  }
  return true;
}

// Probe surface (window.__echoes.i18n).
export function i18nDebug() {
  return {
    lang,
    loaded: !!table || lang === 'en',
    tableSize: table ? Object.keys(table).length : 0,
    misses: [...misses],
    seen: seen.size,
    seenList: () => [...seen],
    clearMisses: () => misses.clear(),
  };
}

// Load the language before any module that imports this one evaluates: a few
// screens build their text at module load, and every one of them must see the
// chosen language, not English.
await initI18n();
