import AsyncStorage from '../utils/storage';

const STORAGE_KEY = '@gfit:sessions';
const listeners = new Set();

const notify = () => { listeners.forEach((cb) => cb?.()); };

export function subscribeSessions(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

async function loadSessions() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function saveSessions(list) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  notify();
}

export async function getSessions() {
  return loadSessions();
}

export async function clearSessions() {
  await saveSessions([]);
}

export async function startSession(workout) {
  const sessions = await loadSessions();
  // Close any dangling active session
  const closed = sessions.map((s) =>
    s.status === 'active' ? { ...s, status: 'canceled', endAt: Date.now(), durationSec: 0 } : s
  );
  const session = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    workoutId: workout?.id ?? null,
    name: workout?.name ?? 'Workout',
    startAt: Date.now(),
    endAt: null,
    durationSec: 0,
    status: 'active',
  };
  await saveSessions([...closed, session]);
  return session;
}

export async function finishActiveSession(extra = {}) {
  const sessions = await loadSessions();
  let changed = false;
  const updated = sessions.map((s) => {
    if (s.status === 'active') {
      const endAt = Date.now();
      changed = true;
      return {
        ...s,
        ...extra,
        endAt,
        durationSec: Math.max(0, Math.round((endAt - s.startAt) / 1000)),
        status: 'completed',
      };
    }
    return s;
  });
  if (changed) await saveSessions(updated);
}

export async function cancelActiveSession() {
  const sessions = await loadSessions();
  let changed = false;
  const updated = sessions.map((s) => (s.status === 'active' ? { ...s, status: 'canceled', endAt: Date.now(), durationSec: 0 } : s));
  if (changed) await saveSessions(updated);
}

function ymd(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

export async function getStats() {
  const sessions = (await loadSessions()).filter((s) => s.status === 'completed');
  const totalWorkouts = sessions.length;
  const totalDurationSec = sessions.reduce((a, s) => a + (s.durationSec || 0), 0);

  // last 7 days (rolling)
  const now = Date.now();
  const sevenDaysAgo = now - 6 * 24 * 60 * 60 * 1000;
  const workoutsThisWeek = sessions.filter((s) => (s.endAt || s.startAt) >= sevenDaysAgo).length;

  // streak: consecutive days ending today
  const days = new Set(sessions.map((s) => ymd(s.endAt || s.startAt)));
  let streakDays = 0;
  for (let i = 0; i < 365; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    if (days.has(ymd(d.getTime()))) streakDays += 1;
    else break;
  }

  return { totalWorkouts, totalDurationSec, workoutsThisWeek, streakDays };
}