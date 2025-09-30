let AS;
try {
  AS = require('@react-native-async-storage/async-storage').default;
} catch (_) {
  const mem = new Map();
  AS = {
    async getItem(key) { return mem.has(key) ? mem.get(key) : null; },
    async setItem(key, value) { mem.set(key, value); },
    async removeItem(key) { mem.delete(key); },
    async clear() { mem.clear(); },
  };
  if (__DEV__) console.warn('[storage] Using in-memory fallback. Install @react-native-async-storage/async-storage for persistence.');
}
export default AS;