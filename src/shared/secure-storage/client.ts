import * as SecureStore from 'expo-secure-store';
import { SECURE_KEYS } from './keys';
import type { TSecureKey } from './keys';

const DEFAULT_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

export const setSecureItem = (key: TSecureKey, value: string): Promise<void> =>
  SecureStore.setItemAsync(key, value, DEFAULT_OPTIONS);

export const getSecureItem = (key: TSecureKey): Promise<string | null> =>
  SecureStore.getItemAsync(key, DEFAULT_OPTIONS);

export const deleteSecureItem = (key: TSecureKey): Promise<void> =>
  SecureStore.deleteItemAsync(key, DEFAULT_OPTIONS);

export const clearAllSecure = (): Promise<void[]> =>
  Promise.all(Object.values(SECURE_KEYS).map((key) => deleteSecureItem(key)));
