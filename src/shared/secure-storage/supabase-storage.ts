import type { SupportedStorage } from '@supabase/supabase-js';
import { deleteSecureItem, getSecureItem, setSecureItem } from './client';
import { SECURE_KEYS } from './keys';

type TSupabaseStorageMap = Record<string, string>;

let mutationQueue: Promise<void> = Promise.resolve();

const readStorageMap = async (): Promise<TSupabaseStorageMap> => {
  const storedValue = await getSecureItem(SECURE_KEYS.SUPABASE_SESSION);

  if (!storedValue) {
    return {};
  }

  try {
    const parsedValue: unknown = JSON.parse(storedValue);

    if (typeof parsedValue !== 'object' || parsedValue === null || Array.isArray(parsedValue)) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(parsedValue).filter(
        (entry): entry is [string, string] => typeof entry[1] === 'string',
      ),
    );
  } catch {
    return {};
  }
};

const enqueueMutation = (mutation: () => Promise<void>): Promise<void> => {
  const result = mutationQueue.then(mutation, mutation);
  mutationQueue = result.catch(() => undefined);
  return result;
};

/**
 * Supabase may use multiple logical keys for sessions, PKCE and recovery flows.
 * They are kept inside one encrypted SecureStore value so clearAllSecure can
 * remove the complete Supabase credential set.
 */
export const supabaseSecureStorage: SupportedStorage = {
  getItem: async (key: string): Promise<string | null> => {
    await mutationQueue;
    const storageMap = await readStorageMap();
    return storageMap[key] ?? null;
  },
  setItem: (key: string, value: string): Promise<void> =>
    enqueueMutation(async () => {
      const storageMap = await readStorageMap();
      storageMap[key] = value;
      await setSecureItem(SECURE_KEYS.SUPABASE_SESSION, JSON.stringify(storageMap));
    }),
  removeItem: (key: string): Promise<void> =>
    enqueueMutation(async () => {
      const storageMap = await readStorageMap();
      delete storageMap[key];

      if (Object.keys(storageMap).length === 0) {
        await deleteSecureItem(SECURE_KEYS.SUPABASE_SESSION);
        return;
      }

      await setSecureItem(SECURE_KEYS.SUPABASE_SESSION, JSON.stringify(storageMap));
    }),
};
