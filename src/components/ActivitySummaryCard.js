import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BRAND_COLORS } from '../constants/Colors';

const LIGHT_PURPLE = '#6B4E8C';

/**
 * sessions: [
 *   {
 *     startAt: number (ms),
 *     endAt: number (ms),
 *     durationSec: number,
 *     status: 'completed' | 'canceled' | 'active',
 *     calories?: number (optional, for future API data)
 *   }
 * ]
 * scheduled: (optional for future) [{ when: number }]
 */
export function computeActivityStats(sessions = []) {
  const completed = sessions.filter(s => s.status === 'completed');
  const totalSessions = completed.length;
  const totalDurationSec = completed.reduce((a, s) => a + (s.durationSec || 0), 0);
  const totalCalories = completed.reduce((a, s) => a + (s.calories || 0), 0);

  // 7-day rolling window
  const now = Date.now();
  const start7 = now - 6 * 24 * 60 * 60 * 1000;
  const recent = completed.filter(s => (s.endAt || s.startAt) >= start7);

  // Streak (count back from today)
  const dayKey = ts => {
    const d = new Date(ts);
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  };
  const daySet = new Set(completed.map(s => dayKey(s.endAt || s.startAt)));
  let streakDays = 0;
  for (let i = 0; i < 400; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    if (daySet.has(dayKey(d.getTime()))) streakDays += 1;
    else break;
  }

  const avgDurationMin = totalSessions
    ? Math.round((totalDurationSec / 60) / totalSessions)
    : 0;

  return {
    streakDays,
    sessions7d: recent.length,
    totalSessions,
    avgDurationMin,
    totalDurationMin: Math.round(totalDurationSec / 60),
    totalCalories: Math.round(totalCalories),
  };
}

export default function ActivitySummaryCard({
  sessions = [],
  scheduled = [],
  style,
  showTitle = false,
  title = 'Activity Summary',
  footer = true,
}) {
  const stats = useMemo(() => computeActivityStats(sessions), [sessions]);

  const items = [
    { key: 'streak', label: 'Streak', value: stats.streakDays ? `${stats.streakDays}d ${stats.streakDays > 2 ? '🔥' : ''}` : '0d' },
    { key: 'week', label: 'Weekly Sessions', value: stats.sessions7d },
    { key: 'total', label: 'Total Sessions', value: stats.totalSessions },
    { key: 'avg', label: 'Avg Session Time', value: stats.avgDurationMin ? `${stats.avgDurationMin}m` : '—' },
    //{ key: 'calories', label: 'Calories Burned', value: stats.totalCalories ? `${stats.totalCalories} cal` : '—' },
  ];

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: 'rgba(255,255,255,0.07)', borderColor: 'rgba(255,255,255,0.14)' },
        style,
      ]}
    >
      {showTitle && !!title && (
        <Text style={[styles.title, { color: '#FFFFFF' }]}>{title}</Text>
      )}

      <View style={styles.grid}>
        {items.map(it => (
          <View key={it.key} style={styles.item}>
            <Text style={[styles.value, { color: BRAND_COLORS.YELLOW }]}>
              {it.value}
            </Text>
            <Text style={[styles.label, { color: 'rgba(255,255,255,0.65)' }]}>
              {it.label}
            </Text>
          </View>
        ))}
      </View>

      {footer && (
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: 'rgba(255,255,255,0.55)' }]}>
            Total Weekly Time: {stats.totalDurationMin}m
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 10,
    letterSpacing: 0.3,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  item: {
    width: '50%',
    paddingHorizontal: 6,
    paddingVertical: 14,
  },
  value: {
    fontSize: 20,
    fontWeight: '800',
  },
  label: {
    fontSize: 11,
    marginTop: 4,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  footer: {
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'transparent',
    paddingTop: 6,
  },
  footerText: {
    fontSize: 11,
    textAlign: 'center',
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});