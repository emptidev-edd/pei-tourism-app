import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type FontScale = 'small' | 'default' | 'large';

const FONT_SCALE_KEY = '@visitpei/fontScale';

const SCALE_FACTORS: Record<FontScale, number> = {
  small: 0.9,
  default: 1,
  large: 1.18,
};

type FontScaleContextValue = {
  fontScale: FontScale;
  scaleFactor: number;
  setFontScale: (next: FontScale) => Promise<void>;
};

const FontScaleContext = createContext<FontScaleContextValue | null>(null);

export const FontScaleProvider = ({ children }: { children: ReactNode }) => {
  const [fontScale, setFontScaleState] = useState<FontScale>('default');

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(FONT_SCALE_KEY);
        if (!mounted) return;
        if (stored === 'small' || stored === 'default' || stored === 'large') {
          setFontScaleState(stored);
        }
      } catch {
        // keep default
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const setFontScale = useCallback(async (next: FontScale) => {
    setFontScaleState(next);
    try {
      await AsyncStorage.setItem(FONT_SCALE_KEY, next);
    } catch {
      // non-fatal
    }
  }, []);

  const value = useMemo<FontScaleContextValue>(
    () => ({ fontScale, scaleFactor: SCALE_FACTORS[fontScale], setFontScale }),
    [fontScale, setFontScale],
  );

  return <FontScaleContext.Provider value={value}>{children}</FontScaleContext.Provider>;
};

export const useFontScale = () => {
  const ctx = useContext(FontScaleContext);
  if (!ctx) {
    throw new Error('useFontScale must be used inside a FontScaleProvider');
  }
  return ctx;
};