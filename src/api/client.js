import * as SecureStore from 'expo-secure-store';

const BASE_URL = 'https://gfit-dev.gdinexus.com:8412';

export async function getAuthToken() {
  try {
    return await SecureStore.getItemAsync('authToken');
  } catch {
    return null;
  }
}

export async function apiFetch(path, options = {}) {
  const token = await getAuthToken();
  const isFormData = typeof FormData !== 'undefined' && options?.body instanceof FormData;
  const headers = {
    'Accept': 'application/json',
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers || {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const text = await res.text();
  let json;
  try { json = text ? JSON.parse(text) : null; } catch { json = null; }

  if (!res.ok) {
    const message = (json && (json.message || json.error)) || `HTTP ${res.status}`;
    const err = new Error(message);
    err.status = res.status;
    err.body = json ?? text;
    throw err;
  }
  return json;
}
