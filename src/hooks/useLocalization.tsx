import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';
import { preferencesAPI } from '../api/api.exports';
import { getTranslations } from '../services/localizationApi';
import { listCountries } from '../services/regionalConfigurationApi';

interface Translations {
  [key: string]: string | Translations;
}

interface LocalizationContextType {
  locale: string;
  setLocale: (locale: string) => Promise<void>;
  translations: Translations;
  t: (key: string, params?: Record<string, string | number>) => string;
  loading: boolean;
  availableLocales: { code: string; name: string }[];
}

const LocalizationContext = createContext<LocalizationContextType | undefined>(undefined);

const FALLBACK_LOCALES = [{ code: 'en', name: 'English' }];

export const useLocalization = () => {
  const context = useContext(LocalizationContext);
  if (!context) {
    throw new Error('useLocalization must be used within a LocalizationProvider');
  }
  return context;
};

interface LocalizationProviderProps {
  children: ReactNode;
  defaultLocale?: string;
}

export const LocalizationProvider: React.FC<LocalizationProviderProps> = ({
  children,
  defaultLocale = 'en',
}) => {
  const [locale, setLocaleState] = useState(defaultLocale);
  const [translations, setTranslations] = useState<Translations>({});
  const [loading, setLoading] = useState(true);
  const [availableLocales, setAvailableLocales] = useState<{ code: string; name: string }[]>(FALLBACK_LOCALES);

  // Load translations
  const loadTranslations = useCallback(async (lang: string) => {
    setLoading(true);
    try {
      const data = await getTranslations(lang);
      setTranslations(data.translations || data || {});
    } catch (error) {
      console.error('Failed to load translations:', error);
      // Fallback to empty object
      setTranslations({});
    } finally {
      setLoading(false);
    }
  }, []);

  // Initialize
  useEffect(() => {
    const init = async () => {
      try {
        // Try to get user's language preference
        const [prefs, countries] = await Promise.all([
          preferencesAPI.get(),
          listCountries(true),
        ]);
        const localeMap = new Map<string, string>();
        for (const country of countries) {
          for (const language of country.configuration?.supportedLanguages || []) {
            if (!localeMap.has(language)) localeMap.set(language, language === 'sw' ? 'Kiswahili' : language === 'fr' ? 'Français' : language === 'rw' ? 'Kinyarwanda' : language === 'rn' ? 'Kirundi' : 'English');
          }
        }
        if (localeMap.size) setAvailableLocales([...localeMap.entries()].map(([code, name]) => ({ code, name })).sort((a, b) => a.code.localeCompare(b.code)));
        const userLocale = prefs?.language || defaultLocale;
        setLocaleState(userLocale);
        await loadTranslations(userLocale);
      } catch {
        await loadTranslations(defaultLocale);
      }
    };
    init();
  }, [defaultLocale, loadTranslations]);

  // Set locale
  const setLocale = useCallback(async (newLocale: string) => {
    setLocaleState(newLocale);
    await loadTranslations(newLocale);

    // Persist to server
    try {
      await preferencesAPI.setLanguage(newLocale);
    } catch (error) {
      console.error('Failed to save language preference:', error);
    }

    // Update document language
    if (typeof document !== 'undefined') {
      document.documentElement.lang = newLocale;
    }
  }, [loadTranslations]);

  // Translation function
  const t = useCallback((key: string, params?: Record<string, string | number>): string => {
    const keys = key.split('.');
    let value: any = translations;

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        // Return key if not found
        return key;
      }
    }

    if (typeof value !== 'string') {
      return key;
    }

    // Replace parameters
    if (params) {
      return value.replace(/\{\{(\w+)\}\}/g, (_, param) => {
        return String(params[param] ?? `{{${param}}}`);
      });
    }

    return value;
  }, [translations]);

  return (
    <LocalizationContext.Provider
      value={{
        locale,
        setLocale,
        translations,
        t,
        loading,
        availableLocales,
      }}
    >
      {children}
    </LocalizationContext.Provider>
  );
};

export default LocalizationProvider;
