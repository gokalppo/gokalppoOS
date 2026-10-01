import { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { translations } from '../i18n/translations';
import { translate, detectLanguage, LANGUAGE_STORAGE_KEY } from '../i18n/translate';

const LanguageContext = createContext({
    lang: 'en',
    setLang: () => { },
    toggleLang: () => { },
    t: (key) => key
});

export const useLanguage = () => useContext(LanguageContext);

const readSaved = () => {
    try {
        return localStorage.getItem(LANGUAGE_STORAGE_KEY);
    } catch {
        return null;
    }
};

export const LanguageProvider = ({ children }) => {
    const [lang, setLangState] = useState(() => detectLanguage(readSaved(), navigator.language));

    const setLang = useCallback((next) => {
        setLangState(next);
        try {
            localStorage.setItem(LANGUAGE_STORAGE_KEY, next);
        } catch {
            // Storage unavailable — the choice just won't persist.
        }
    }, []);

    const toggleLang = useCallback(() => setLang(lang === 'en' ? 'tr' : 'en'), [lang, setLang]);

    useEffect(() => { document.documentElement.lang = lang; }, [lang]);

    const value = useMemo(() => ({
        lang,
        setLang,
        toggleLang,
        t: (key, params) => translate(translations, lang, key, params)
    }), [lang, setLang, toggleLang]);

    return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};
