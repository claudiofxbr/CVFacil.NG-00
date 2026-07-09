'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Language, translations } from '@/lib/i18n';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof typeof translations['pt-BR']) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>('pt-BR');
  const [mounted, setMounted] = useState(false);

  // Carregar idioma do localStorage na montagem
  useEffect(() => {
    const saved = localStorage.getItem('cvfacil_language') as Language | null;
    if (saved && ['pt-BR', 'en', 'es', 'fr'].includes(saved)) {
      setLanguageState(saved);
    } else {
      // Detectar idioma do navegador
      const browserLang = navigator.language;
      if (browserLang.startsWith('es')) setLanguageState('es');
      else if (browserLang.startsWith('en')) setLanguageState('en');
      else if (browserLang.startsWith('fr')) setLanguageState('fr');
    }
    setMounted(true);
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('cvfacil_language', lang);
  };

  const t = (key: keyof typeof translations['pt-BR']): string => {
    return (translations[language] as any)?.[key] ?? (translations['pt-BR'] as any)[key] ?? key;
  };

  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage deve ser usado dentro de LanguageProvider');
  }
  return context;
};

export default LanguageProvider;
