/**
 * Web app (added to the iPhone home screen): localStorage keeps the data on the phone.
 * It needs no special server headers, unlike SQLite on the web.
 */
export const store = {
  get: (key: string): string | null => {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set: (key: string, value: string) => {
    window.localStorage.setItem(key, value);
  },
  setAsync: async (key: string, value: string) => {
    window.localStorage.setItem(key, value);
  },
};
