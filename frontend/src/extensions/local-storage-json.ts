declare global {
  interface Storage {
    getItemJson<T = unknown>(key: string): T | null;
    setItemJson<T = unknown>(key: string, value: T): void;
  }
}

Storage.prototype.getItemJson = function (key) {
  const value = localStorage.getItem(key);
  if (value) {
    try {
      return JSON.parse(value);
    } catch (e) {
      console.error(e);
      console.warn(`Invalid key '${key}' removed from storage`);
      localStorage.removeItem(key);
      return null;
    }
  }
  return null;
};

Storage.prototype.setItemJson = function (key, value) {
  this.setItem(key, JSON.stringify(value));
};

export {};
