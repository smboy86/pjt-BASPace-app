import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { SECURE_KEYS } from './keys';
import type { TSecureKey } from './keys';

const DEFAULT_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

const webMemory = new Map<TSecureKey, string>();

export const setSecureItem = async (key: TSecureKey, value: string): Promise<void> => {
  if (Platform.OS === 'web') {
    webMemory.set(key, value);
    return;
  }

  await SecureStore.setItemAsync(key, value, DEFAULT_OPTIONS);
};

export const getSecureItem = async (key: TSecureKey): Promise<string | null> => {
  if (Platform.OS === 'web') {
    return webMemory.get(key) ?? null;
  }

  return SecureStore.getItemAsync(key, DEFAULT_OPTIONS);
};

export const deleteSecureItem = async (key: TSecureKey): Promise<void> => {
  if (Platform.OS === 'web') {
    webMemory.delete(key);
    return;
  }

  await SecureStore.deleteItemAsync(key, DEFAULT_OPTIONS);
};

export const clearAllSecure = (): Promise<void[]> =>
  Promise.all(Object.values(SECURE_KEYS).map((key) => deleteSecureItem(key)));
