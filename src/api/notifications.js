import { apiFetch } from './client';

export async function fetchNotifications() {
  // GET /api/Member/memberNotifications
  const data = await apiFetch('/api/Member/memberNotifications', { method: 'GET' });
  return Array.isArray(data) ? data : [];
}

export async function markNotificationRead(id) {
  if (!id) return;
  // PUT /api/Member/notification-markRead/{id}
  await apiFetch(`/api/Member/notification-markRead/${encodeURIComponent(id)}`, { method: 'PUT' });
}

export async function deleteNotification(id) {
  if (!id) return;
  // Swagger shows DELETE /api/Member/delete-notification{id}
  // First try with slash, then fallback to the literal path if needed
  try {
    await apiFetch(`/api/Member/delete-notification/${encodeURIComponent(id)}`, { method: 'DELETE' });
  } catch (err) {
    // Fallback to odd path if backend expects it exactly
    if (err.status === 404) {
      await apiFetch(`/api/Member/delete-notification${encodeURIComponent(id)}`, { method: 'DELETE' });
    } else {
      throw err;
    }
  }
}

export async function markAllNotificationsRead(notifications) {
  const unread = (notifications || []).filter(n => !n.isRead);
  for (const n of unread) {
    try { await markNotificationRead(n.id); } catch (_) {}
  }
}


