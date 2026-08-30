import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { translations, Language } from '../lib/translations';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>('nl');
  const { user } = useAuth();

  useEffect(() => {
    const loadLanguage = async () => {
      const savedLanguage = localStorage.getItem('language') as Language;

      if (user) {
        const { data } = await supabase
          .from('user_profiles')
          .select('language')
          .eq('id', user.id)
          .maybeSingle();

        if (savedLanguage) {
          setLanguageState(savedLanguage);
          if (data?.language !== savedLanguage) {
            await supabase
              .from('user_profiles')
              .update({ language: savedLanguage })
              .eq('id', user.id);
          }
        } else if (data?.language) {
          setLanguageState(data.language as Language);
          localStorage.setItem('language', data.language);
        }
      } else {
        if (savedLanguage) {
          setLanguageState(savedLanguage);
        }
      }
    };

    loadLanguage();
  }, [user]);

  const setLanguage = async (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('language', lang);

    if (user) {
      await supabase
        .from('user_profiles')
        .update({ language: lang })
        .eq('id', user.id);
    }
  };

  const t = (key: string): string => {
    const keys = key.split('.');
    let value: any = translations[language];

    for (const k of keys) {
      value = value?.[k];
    }

    return value || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
