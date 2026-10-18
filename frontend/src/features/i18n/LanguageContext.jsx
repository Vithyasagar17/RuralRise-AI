// Language selection (English + Tamil draft).
// Member 1 owns the app-wide language selector design; this provider is
// designed so Member 1 can either use <LanguageSelect/> or call setLanguage()
// from their own control. The chosen language is remembered on the device.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { LANGUAGES, translations } from './translations.js';

export const LANGUAGE_STORAGE_KEY = 'ruralrise.language';
const LanguageContext = createContext(null);

function readStoredLanguage() {
  try {
    return window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  } catch {
    return null; // Private mode / storage blocked: fall back to English.
  }
}

/** Looks up a key, falling back to English, then to the key itself. Replaces {name} placeholders. */
export function translate(language, key, vars) {
  const template = translations[language]?.[key] ?? translations.en[key] ?? key;
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name) => (vars[name] !== undefined ? String(vars[name]) : match));
}

const LOCALES = { en: 'en-IN', ta: 'ta-IN' };

export function formatDate(iso, language = 'en') {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(LOCALES[language] || 'en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}

function buildValue(language, setLanguage) {
  const meta = LANGUAGES.find((l) => l.code === language) || LANGUAGES[0];
  return {
    language,
    setLanguage,
    languages: LANGUAGES,
    isReviewed: meta.reviewed,
    t: (key, vars) => translate(language, key, vars),
    formatDate: (iso) => formatDate(iso, language),
  };
}

export function LanguageProvider({ children, initialLanguage }) {
  const [language, setLanguageState] = useState(() => {
    const candidate = initialLanguage || readStoredLanguage();
    return translations[candidate] ? candidate : 'en';
  });

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = useCallback((code) => {
    if (!translations[code]) return;
    setLanguageState(code);
    try {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, code);
    } catch {
      // Not fatal: the choice simply is not remembered.
    }
  }, []);

  const value = useMemo(() => buildValue(language, setLanguage), [language, setLanguage]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

const ENGLISH_FALLBACK = buildValue('en', () => {});

/** Works even without a provider (English), so components never crash if not wrapped. */
export function useTranslation() {
  return useContext(LanguageContext) || ENGLISH_FALLBACK;
}
