import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import { I18n } from 'i18n-js';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import en from './en.json';
import fr from './fr.json';

export type Locale = 'en' | 'fr';

const LOCALE_KEY = '@visitpei/locale';
const SUPPORTED: readonly Locale[] = ['en', 'fr'];

const i18nInstance = new I18n({ en, fr });
i18nInstance.enableFallback = true;
i18nInstance.defaultLocale = 'en';
i18nInstance.locale = 'en';

const detectDeviceLocale = (): Locale => {
  try {
    const locales = Localization.getLocales();
    const code = locales[0]?.languageCode?.toLowerCase();
    return code === 'fr' ? 'fr' : 'en';
  } catch {
    return 'en';
  }
};

type LocaleContextValue = {
  locale: Locale;
  setLocale: (next: Locale) => Promise<void>;
  t: (key: string, opts?: Record<string, unknown>) => string;
  ready: boolean;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export const LocaleProvider = ({ children }: { children: ReactNode }) => {
  const [locale, setLocaleState] = useState<Locale>('en');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(LOCALE_KEY);
        const initial: Locale = stored && SUPPORTED.includes(stored as Locale)
          ? (stored as Locale)
          : detectDeviceLocale();
        if (!mounted) return;
        i18nInstance.locale = initial;
        setLocaleState(initial);
      } catch {
        if (!mounted) return;
        i18nInstance.locale = 'en';
      } finally {
        if (mounted) setReady(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const setLocale = useCallback(async (next: Locale) => {
    i18nInstance.locale = next;
    setLocaleState(next);
    try {
      await AsyncStorage.setItem(LOCALE_KEY, next);
    } catch {
      // non-fatal — language still changes for the session
    }
  }, []);

  const t = useCallback(
    (key: string, opts?: Record<string, unknown>) => i18nInstance.t(key, opts),
    // locale included so consumers re-render when language flips
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [locale],
  );

  const value = useMemo<LocaleContextValue>(
    () => ({ locale, setLocale, t, ready }),
    [locale, setLocale, t, ready],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
};

export const useLocale = () => {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error('useLocale must be used inside a LocaleProvider');
  }
  return ctx;
};

export const pickLocalized = (
  en: string | null | undefined,
  fr: string | null | undefined,
  locale: Locale,
): string => {
  if (locale === 'fr' && fr && fr.trim().length > 0) return fr;
  return (en ?? fr ?? '').trim();
};