import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { createJSONStorage } from 'zustand/middleware';

/**
 * Encrypted storage for zustand `persist`: the iOS Keychain / Android Keystore through
 * expo-secure-store. Items are readable after the first unlock and never leave this device
 * (not restored from a backup onto another phone). On web there is no secure store, so the
 * value lives in sessionStorage and is gone when the tab closes.
 *
 * The first read moves a value left in plain AsyncStorage by older builds into secure storage
 * and deletes the plain copy.
 */
const OPTIONS: SecureStore.SecureStoreOptions = { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY };

const web = {
  getItem: async (k: string) => {
    try {
      return window.sessionStorage.getItem(k);
    } catch {
      return null;
    }
  },
  setItem: async (k: string, v: string) => {
    try {
      window.sessionStorage.setItem(k, v);
    } catch {
      // storage blocked: the session simply is not remembered
    }
  },
  removeItem: async (k: string) => {
    try {
      window.sessionStorage.removeItem(k);
    } catch {
      // ignore
    }
  },
};

const native = {
  getItem: async (k: string) => {
    try {
      const v = await SecureStore.getItemAsync(k, OPTIONS);
      if (v !== null) return v;
      const legacy = await AsyncStorage.getItem(k);
      if (legacy === null) return null;
      await SecureStore.setItemAsync(k, legacy, OPTIONS);
      await AsyncStorage.removeItem(k);
      return legacy;
    } catch {
      return null;
    }
  },
  setItem: async (k: string, v: string) => {
    try {
      await SecureStore.setItemAsync(k, v, OPTIONS);
    } catch {
      // Keystore unavailable: do not fall back to plain storage; the session is not remembered.
    }
  },
  removeItem: async (k: string) => {
    try {
      await SecureStore.deleteItemAsync(k, OPTIONS);
      await AsyncStorage.removeItem(k);
    } catch {
      // ignore
    }
  },
};

export const secureStorage = createJSONStorage(() => (Platform.OS === 'web' ? web : native));
