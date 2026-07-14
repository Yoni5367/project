import React, { createContext, useContext, useState } from 'react';
import en from '../i18n/en';
import am from '../i18n/am';

const LangContext = createContext();

export function LangProvider({ children }) {
  const [lang, setLang] = useState(localStorage.getItem('debale_lang') || 'en');
  const t = lang === 'am' ? am : en;

  const toggleLang = () => {
    const next = lang === 'en' ? 'am' : 'en';
    setLang(next);
    localStorage.setItem('debale_lang', next);
  };

  return (
    <LangContext.Provider value={{ lang, t, toggleLang }}>
      <div className={lang === 'am' ? 'lang-am' : ''}>{children}</div>
    </LangContext.Provider>
  );
}

export const useLang = () => useContext(LangContext);
