// Tiny i18n core: flat key dictionaries, {param} interpolation, English fallback.

export const LANGUAGES = ['en', 'tr'];
export const DEFAULT_LANGUAGE = 'en';
export const LANGUAGE_STORAGE_KEY = 'gokalppoOS_language';

export const isSupported = (lang) => LANGUAGES.includes(lang);

// Saved choice wins; otherwise follow the browser (Turkish browsers get Turkish).
export const detectLanguage = (saved, navigatorLanguage) => {
    if (isSupported(saved)) return saved;
    return String(navigatorLanguage || '').toLowerCase().startsWith('tr') ? 'tr' : DEFAULT_LANGUAGE;
};

export const translate = (dictionaries, lang, key, params) => {
    const raw = dictionaries[lang]?.[key] ?? dictionaries[DEFAULT_LANGUAGE]?.[key] ?? key;
    if (!params) return raw;
    return raw.replace(/\{(\w+)\}/g, (match, name) => (name in params ? String(params[name]) : match));
};

// Pick the right language from a { en, tr } object (plain strings pass through).
export const localized = (value, lang) => {
    if (value && typeof value === 'object') return value[lang] ?? value[DEFAULT_LANGUAGE] ?? '';
    return value ?? '';
};
