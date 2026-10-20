import Storage from 'expo-sqlite/kv-store';

/** Key-value storage on the phone (SQLite in the native app). */
export const store = {
  get: (key: string): string | null => Storage.getItemSync(key),
  set: (key: string, value: string) => Storage.setItemSync(key, value),
  setAsync: (key: string, value: string) => Storage.setItemAsync(key, value),
};
