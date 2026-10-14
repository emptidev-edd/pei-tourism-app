import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

const STORAGE_KEY = 'visit-pei:liked-events';

const readLikedIds = async (): Promise<string[]> => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const LikedEventsContext = createContext<{
  ids: ReadonlySet<string>;
  toggle: (id: string) => void;
  has: (id: string) => boolean;
  hydrated: boolean;
} | null>(null);

/**
 * Likes are stored on the device only. The API's `POST /api/events/:id/save`
 * needs a JWT and is a non-idempotent toggle, and sign-in is still a stub
 * sheet, so there is nobody to save against yet. Once auth lands this local
 * set becomes the offline cache that reconciles against
 * `GET /api/events/me/saved`.
 */
export function LikedEventsProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<ReadonlySet<string>>(() => new Set());
  const [hydrated, setHydrated] = useState(false);

  // Read once on mount, not on every focus: this provider wraps the whole
  // screen and React state is already the source of truth after hydration.
  useEffect(() => {
    let active = true;

    readLikedIds().then((stored) => {
      if (!active) return;
      // Merge rather than replace: a tap that landed while the read was in
      // flight is already in state, and replacing would silently drop it.
      setIds((current) => new Set([...stored, ...current]));
      setHydrated(true);
    });

    return () => {
      active = false;
    };
  }, []);

  const toggle = useCallback(
    (id: string) => {
      // Writing before hydration completes would persist a set that is missing
      // everything still being read back, clobbering the stored likes.
      if (!hydrated) return;

      setIds((current) => {
        const next = new Set(current);
        if (next.has(id)) next.delete(id);
        else next.add(id);

        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([...next])).catch(() => {});
        return next;
      });
    },
    [hydrated],
  );

  const has = useCallback((id: string) => ids.has(id), [ids]);

  const value = useMemo(
    () => ({ ids, toggle, has, hydrated }),
    [has, hydrated, ids, toggle],
  );

  return (
    <LikedEventsContext value={value}>{children}</LikedEventsContext>
  );
}

export function useLikedEvents() {
  const value = use(LikedEventsContext);
  if (!value) {
    throw new Error('useLikedEvents must be used inside LikedEventsProvider');
  }
  return value;
}
