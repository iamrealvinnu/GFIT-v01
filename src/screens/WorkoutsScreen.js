import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  StatusBar,
  Platform,
  ScrollView,
  Dimensions,
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BRAND_COLORS, UI_COLORS } from '../constants/Colors';
import { LinearGradient } from 'expo-linear-gradient';

// ===== API helpers (no backend changes) =====
const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://gfit-dev.gdinexus.com:8412';

async function getAuthToken() {
  const keys = ['authToken', 'token', 'accessToken'];
  for (const k of keys) {
    const v = await SecureStore.getItemAsync(k);
    if (v) return v;
  }
  return null;
}
async function apiGet(path) {
  const token = await getAuthToken();
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'GET',
    headers: { Accept: '*/*', Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`GET ${path} -> ${res.status}`);
  return res.json();
}
async function apiPost(path, body) {
  const token = await getAuthToken();
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { Accept: '*/*', 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  // API may return 200 with no body
  let data = null; try { data = await res.json(); } catch {}
  if (!res.ok) throw new Error(`POST ${path} -> ${res.status}`);
  return data || {};
}
async function apiPut(path, body) {
  const token = await getAuthToken();
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'PUT',
    headers: { Accept: '*/*', 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  let data = null; try { data = await res.json(); } catch {}
  if (!res.ok) throw new Error(`PUT ${path} -> ${res.status}`);
  return data || {};
}

// Member + Exercises
async function getMemberProfile() {
  return apiGet('/api/Member/profile');
}
async function getMemberAllExercise(memberId) {
  return apiGet(`/api/Member/member-allExercise/${memberId}`);
}
async function createExerciseInstance(memberExerciseId, payload) {
  return apiPost(`/api/Member/exercise-instances/${memberExerciseId}`, payload);
}
async function updateExerciseInstance(instanceId, payload) {
  return apiPut(`/api/Member/update-exerciseInstance/${instanceId}`, payload);
}

// Persist key for this screen (separate from Dashboard)
const ACTIVE_TIMER_KEY_WO = 'GFIT_ACTIVE_EXERCISE_TIMER_WORKOUTS';

const LIGHT_PURPLE = '#6B4E8C'; // match existing theme
const SAFE_TOP = Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0;
const { width } = Dimensions.get('window');

// Days of the week
const DAYS = [
  { id: 'monday', name: 'Monday', short: 'MON', emoji: '💪' },
  { id: 'tuesday', name: 'Tuesday', short: 'TUE', emoji: '🔥' },
  { id: 'wednesday', name: 'Wednesday', short: 'WED', emoji: '⚡' },
  { id: 'thursday', name: 'Thursday', short: 'THU', emoji: '🚀' },
  { id: 'friday', name: 'Friday', short: 'FRI', emoji: '💯' },
  { id: 'saturday', name: 'Saturday', short: 'SAT', emoji: '🏆' },
  { id: 'sunday', name: 'Sunday', short: 'SUN', emoji: '🎯' },
];

// ===== Screen component =====
export default function WorkoutsScreen({ navigation }) {
  // Remove mock; use real data
  const [loading, setLoading] = useState(false);
  const [workouts, setWorkouts] = useState([]);
  const [selectedDay, setSelectedDay] = useState(null); // null = all days

  // Timer + instance state
  const [activeInstance, setActiveInstance] = useState(null);
  // { memberExerciseId, instanceId, exerciseName, startedAt }
  const [elapsedSec, setElapsedSec] = useState(0);
  const tickRef = useRef(null);
  const [isTimerPaused, setIsTimerPaused] = useState(false);

  // Feedback modal
  const [isStopModalVisible, setIsStopModalVisible] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Quick-complete (no timer) state
  const [quickComplete, setQuickComplete] = useState(null);           // { memberExerciseId, exerciseName }
  const [quickDurationMin, setQuickDurationMin] = useState('0');      // duration input for quick-complete

  // Load workouts from API
  const loadWorkouts = useCallback(async () => {
    try {
      setLoading(true);
      const prof = await getMemberProfile();
      const memberId = prof?.memberId || prof?.id;
      if (!memberId) throw new Error('No member id');
      const list = await getMemberAllExercise(memberId);
      const mapped = Array.isArray(list)
        ? list.map((it, i) => ({
            id: it.memberExerciseId || it.exerciseId || `${i}`,
            memberExerciseId: it.memberExerciseId || it.exerciseId || `${i}`,
            name: it.exerciseName || it.name || 'Workout',
            sets: it.numberOfSets ?? null,
            times: it.numberOfTimes ?? null,
            instruction: it.instruction ?? '',               // ADD
            scheduleTypes: it.scheduleTypes || [],
            instances: it.instances || [],
          }))
        : [];
      setWorkouts(mapped);
    } catch (e) {
      console.log('Workouts load failed:', e?.message || e);
      setWorkouts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadWorkouts(); }, [loadWorkouts]);

  // Restore active timer
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(ACTIVE_TIMER_KEY_WO);
        if (!raw) return;
        const saved = JSON.parse(raw);
        if (saved?.memberExerciseId && saved?.startedAt) {
          setActiveInstance(saved);
        }
      } catch {}
    })();
  }, []);

  // Drive elapsed time
  useEffect(() => {
    if (!activeInstance?.startedAt || isTimerPaused) {
      if (tickRef.current) {
        clearInterval(tickRef.current);
        tickRef.current = null;
      }
      return;
    }
    const compute = () => {
      const started = new Date(activeInstance.startedAt).getTime();
      const now = Date.now();
      setElapsedSec(Math.max(0, Math.floor((now - started) / 1000)));
    };
    compute();
    tickRef.current = setInterval(compute, 1000);
    return () => {
      if (tickRef.current) {
        clearInterval(tickRef.current);
        tickRef.current = null;
      }
    };
  }, [activeInstance?.startedAt, isTimerPaused]);

  // Persist active
  useEffect(() => {
    (async () => {
      try {
        if (activeInstance) {
          await AsyncStorage.setItem(ACTIVE_TIMER_KEY_WO, JSON.stringify(activeInstance));
        } else {
          await AsyncStorage.removeItem(ACTIVE_TIMER_KEY_WO);
        }
      } catch {}
    })();
  }, [activeInstance]);

  const formatMMSS = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Start from 00:00; create instance with completed=false
  const startWorkout = (ex) => {
    if (activeInstance) return; // only one at a time
    setActiveInstance({
      memberExerciseId: ex.memberExerciseId,
      exerciseName: ex.name,
      startedAt: new Date().toISOString(),
    });
    setIsTimerPaused(false);
    setFeedback('');
    setNotes('');
  };

  // Stop freezes timer and opens feedback
  const stopWorkout = () => {
    if (!activeInstance?.startedAt) return;
    const delta = Math.max(0, Math.floor((Date.now() - new Date(activeInstance.startedAt).getTime()) / 1000));
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
    setElapsedSec(delta);
    setIsTimerPaused(true);
    setIsStopModalVisible(true);
  };

  // Save completed with durationInMinutes, feedback, notes
  const confirmStopAndSave = async () => {
    try {
      setSaving(true);
      const minutes = quickComplete
        ? Math.max(0, parseInt(quickDurationMin || '0', 10))
        : Math.floor(elapsedSec / 60);

      const payload = {
        completed: true,
        durationInMinutes: minutes,
        feedback: feedback?.trim() || '',
        notes: notes?.trim() || '',
      };

      // Only POST when marking as completed
      const memberExerciseId = quickComplete?.memberExerciseId || activeInstance?.memberExerciseId;
      if (memberExerciseId) {
        await createExerciseInstance(memberExerciseId, payload);
      }

      // reset state
      setActiveInstance(null);
      setElapsedSec(0);
      setIsStopModalVisible(false);
      setIsTimerPaused(false);
      setQuickComplete(null);
      setQuickDurationMin('0');
      setFeedback('');
      setNotes('');
      await loadWorkouts();
    } catch (e) {
      console.log('Save failed:', e?.message || e);
    } finally {
      setSaving(false);
    }
  };

  // Cancel feedback resumes timer only if we paused one; otherwise just close
  const cancelFeedback = () => {
    setIsStopModalVisible(false);
    if (activeInstance?.startedAt) setIsTimerPaused(false);
    setQuickComplete(null);
    setQuickDurationMin('0');
  };

  // Quick-complete without timer: open the same feedback modal
  const markAsCompleted = (ex) => {
    if (activeInstance) return; // avoid conflicts with a running timer
    setQuickComplete({ memberExerciseId: ex.memberExerciseId, exerciseName: ex.name });
    setFeedback('');
    setNotes('');
    setQuickDurationMin('0');
    setIsStopModalVisible(true);
  };

  function isExerciseCompleted(item) {
    return Array.isArray(item.instances) && item.instances.some(inst => inst.completed);
  }

  // Filter workouts by selected day using the same logic as DashboardScreen
  const getFilteredWorkouts = () => {
    if (!selectedDay) return workouts;
    
    return workouts.filter(workout => {
      const names = Array.isArray(workout?.scheduleTypes)
        ? workout.scheduleTypes.map((s) => String(s?.name || '').trim().toLowerCase())
        : [];

      // If no schedule info, show it for all days
      if (!names.length) return true;

      // Check for everyday aliases
      const everydayAliases = ['all day', 'allday', 'everyday', 'every day', 'daily', 'any', 'all'];
      if (names.some((n) => everydayAliases.includes(n))) return true;

      // Check for specific day match
      const dayName = selectedDay.toLowerCase();
      return names.includes(dayName);
    });
  };

  // Day selector component
  const renderDaySelector = () => {
    return (
      <View style={styles.daySelectorContainer}>
        <Text style={styles.daySelectorTitle}>Select Day</Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dayScrollContainer}
        >
          {/* All Days Option */}
          <TouchableOpacity
            style={[
              styles.dayButton,
              selectedDay === null && styles.dayButtonActive
            ]}
            onPress={() => setSelectedDay(null)}
          >
            <Text style={styles.dayEmoji}>📅</Text>
            <Text style={[
              styles.dayName,
              selectedDay === null && styles.dayNameActive
            ]}>All Days</Text>
          </TouchableOpacity>
          
          {/* Individual Days */}
          {DAYS.map((day) => (
            <TouchableOpacity
              key={day.id}
              style={[
                styles.dayButton,
                selectedDay === day.id && styles.dayButtonActive
              ]}
              onPress={() => setSelectedDay(day.id)}
            >
              <Text style={styles.dayEmoji}>{day.emoji}</Text>
              <Text style={[
                styles.dayName,
                selectedDay === day.id && styles.dayNameActive
              ]}>{day.short}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  // ===== UI (replace mock mapping with workouts state) =====
  const renderItem = ({ item }) => {
    const completed = isExerciseCompleted(item);
    const isActive = activeInstance?.memberExerciseId === item.memberExerciseId;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.name}>{item.name}</Text>
          {item.sets != null && (
            <Text style={styles.meta}>
              {item.times != null ? `${item.times} × ` : ''}{item.sets} sets
            </Text>
          )}
        </View>

        {!!item.instruction && (
          <Text style={styles.instruction} numberOfLines={3}>
            {item.instruction}
          </Text>
        )}

        {isActive ? (
          <View style={styles.timerRow}>
            <Text style={styles.timerText}>{formatMMSS(elapsedSec)}</Text>
            <TouchableOpacity style={[styles.btn, styles.stopBtn]} onPress={stopWorkout}>
              <Text style={styles.btnTextDark}>Stop</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[
                styles.btn,
                styles.startBtn,
                (completed || !!activeInstance) && styles.disabledBtn
              ]}
              onPress={() => !completed && !activeInstance && startWorkout(item)}
              disabled={completed || !!activeInstance}
            >
              <Text style={styles.btnTextDark}>Start</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.btn,
                completed ? styles.completedBtn : styles.completeBtn,
                (completed || !!activeInstance) && styles.disabledBtn
              ]}
              onPress={() => !completed && !activeInstance && markAsCompleted(item)}
              disabled={completed || !!activeInstance}
            >
              <Text style={completed ? styles.btnText : styles.btnTextDark}>
                {completed ? 'Completed' : 'Mark as Completed'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const filteredWorkouts = getFilteredWorkouts();

  return (
    <LinearGradient colors={[BRAND_COLORS.PURPLE, LIGHT_PURPLE]} style={styles.gradient}>
      <View style={styles.screen}>
        <Text style={styles.title}>Workouts</Text>
        
        {/* Day Selector */}
        {renderDaySelector()}

        {loading ? (
          <View style={styles.center}><ActivityIndicator color={BRAND_COLORS.YELLOW} /></View>
        ) : filteredWorkouts.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.empty}>
              {selectedDay ? `No workouts scheduled for ${DAYS.find(d => d.id === selectedDay)?.name || selectedDay}` : 'No workouts yet'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredWorkouts}
            keyExtractor={(it) => it.id}
            renderItem={renderItem}
            contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
          />
        )}

        {/* Feedback & Notes modal */}
        <Modal
          visible={isStopModalVisible}
          animationType="slide"
          transparent
          onRequestClose={cancelFeedback}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>Finish Exercise</Text>
              <Text style={styles.modalSub}>
                {(activeInstance?.exerciseName || quickComplete?.exerciseName || 'Workout')}
                {activeInstance ? ` • ${formatMMSS(elapsedSec)}` : ''}
              </Text>

              {quickComplete && (
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Duration (minutes)</Text>
                  <TextInput
                    style={styles.durationInput}
                    value={quickDurationMin}
                    onChangeText={(t) => setQuickDurationMin((t || '').replace(/[^0-9]/g, ''))}
                    placeholder="0"
                    placeholderTextColor="rgba(255,255,255,0.6)"
                    keyboardType="numeric"
                    maxLength={4}
                    accessible={true}
                    accessibilityLabel="Duration in minutes"
                  />
                </View>
              )}

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Feedback</Text>
                <TextInput
                  style={styles.textArea}
                  value={feedback}
                  onChangeText={setFeedback}
                  placeholder="How did it feel?"
                  placeholderTextColor="rgba(255,255,255,0.6)"
                  multiline
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Notes</Text>
                <TextInput
                  style={styles.textArea}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Any notes for trainer"
                  placeholderTextColor="rgba(255,255,255,0.6)"
                  multiline
                />
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity style={[styles.btn, styles.cancelBtn]} onPress={cancelFeedback} disabled={saving}>
                  <Text style={styles.btnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btn, styles.saveBtn, saving && { opacity: 0.7 }]}
                  onPress={confirmStopAndSave}
                  disabled={saving}
                >
                  {saving ? <ActivityIndicator color={BRAND_COLORS.PURPLE} /> : <Text style={styles.btnTextDark}>Save</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </LinearGradient>
  );
}

// ===== minimal styles to avoid breakage =====
const styles = StyleSheet.create({
  gradient: { flex: 1 },
  screen: { flex: 1, backgroundColor: 'transparent', paddingTop: SAFE_TOP + 8 },
  title: { color: '#fff', fontSize: 22, fontWeight: '800', paddingHorizontal: 16, paddingBottom: 8, paddingTop: 4 }, // slightly larger
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { color: 'rgba(255,255,255,0.7)' },

  // More spacious card
  card: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginHorizontal: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: UI_COLORS.BORDER_LIGHT,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { color: '#fff', fontWeight: '800', fontSize: 17 },
  meta: { color: BRAND_COLORS.YELLOW, fontWeight: '600' },

  instruction: {
    color: 'rgba(255,255,255,0.85)',
    marginTop: 10,
    lineHeight: 20,
  },

  timerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 },
  timerText: { color: BRAND_COLORS.YELLOW, fontSize: 18, fontVariant: ['tabular-nums'] },

  actionsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, gap: 10 },
  btn: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10, alignSelf: 'flex-start' },
  startBtn: { backgroundColor: BRAND_COLORS.YELLOW },
  stopBtn: { backgroundColor: BRAND_COLORS.YELLOW },
  completeBtn: { backgroundColor: BRAND_COLORS.YELLOW },
  disabledBtn: { opacity: 0.6 },
  cancelBtn: { backgroundColor: 'rgba(255,255,255,0.1)' },
  saveBtn: { backgroundColor: BRAND_COLORS.YELLOW },
  btnText: { color: '#fff', fontWeight: '700' },
  btnTextDark: { color: BRAND_COLORS.PURPLE, fontWeight: '800' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  modalBox: { width: '88%', borderRadius: 16, backgroundColor: '#2a1553', padding: 16 },
  modalTitle: { color: BRAND_COLORS.YELLOW, fontWeight: '800', fontSize: 18 },
  modalSub: { color: '#fff', opacity: 0.85, marginTop: 4, marginBottom: 10 },
  fieldGroup: { marginBottom: 10 },
  fieldLabel: { color: '#fff', opacity: 0.8, marginBottom: 6 },
  textArea: { minHeight: 72, borderRadius: 10, padding: 12, color: '#fff', backgroundColor: 'rgba(255,255,255,0.08)', textAlignVertical: 'top' },
  durationInput: {                         // ADD
    height: 44,
    borderRadius: 10,
    paddingHorizontal: 12,
    color: '#fff',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 6 },
  
  // Day Selector Styles
  daySelectorContainer: {
    marginHorizontal: 16,
    marginBottom: 20,
  },
  daySelectorTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  dayScrollContainer: {
    paddingHorizontal: 8,
  },
  dayButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 70,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  dayButtonActive: {
    backgroundColor: BRAND_COLORS.YELLOW,
    borderColor: BRAND_COLORS.YELLOW,
    transform: [{ scale: 1.05 }],
  },
  dayButtonToday: {
    borderColor: '#FFFFFF',
    borderWidth: 2,
  },
  dayEmoji: {
    fontSize: 20,
    marginBottom: 4,
  },
  dayName: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  dayNameActive: {
    color: BRAND_COLORS.PURPLE,
    fontWeight: '800',
  },
});