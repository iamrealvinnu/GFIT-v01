import { apiFetch } from './client';

export async function getMemberProfile() {
  return apiFetch('/api/Member/profile', { method: 'GET' });
}

export async function updateMemberProfile(userId, fields = {}, imageFile) {
  const form = new FormData();
  Object.entries(fields).forEach(([k, v]) => {
    if (v !== undefined && v !== null) form.append(k, String(v));
  });
  if (imageFile) {
    // Expecting React Native-style file object: { uri, name, type }
    form.append('file', imageFile);
  }
  return apiFetch(`/api/Member/update-profile/${encodeURIComponent(userId)}`, {
    method: 'PUT',
    body: form,
    // Swagger indicates this endpoint responds with text/plain
    headers: { Accept: 'text/plain' },
  });
}

export async function getMemberAllExercise(memberId) {
  if (!memberId) throw new Error('memberId is required');
  return apiFetch(`/api/Member/member-allExercise/${encodeURIComponent(memberId)}`, {
    method: 'GET',
  });
}
