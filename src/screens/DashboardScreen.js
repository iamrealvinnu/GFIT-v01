import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
// Optional: if you prefer AsyncStorage for persistence
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ScrollView,
  Dimensions,
  StatusBar,
  Animated,
  Easing,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather as Icon } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { BRAND_COLORS, UI_COLORS, STATUS_COLORS } from '../constants/Colors';
import RoundPulse from '../components/RoundPulse';
import { getMemberProfile, getMemberAllExercise } from '../api/member';
import * as SecureStore from 'expo-secure-store'; // ADD THIS

const { width } = Dimensions.get('window');

// Lighter purple for backgrounds
const LIGHT_PURPLE = '#6B4E8C';

// Add this helper (used in the header)
const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
};

// Helper to get token (adjust key if your app uses a different one)
async function getAuthToken() {
  const keys = ['authToken', 'token', 'accessToken'];
  for (const k of keys) {
    const v = await SecureStore.getItemAsync(k);
    if (v) return v;
  }
  return null;
}

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://gfit-dev.gdinexus.com:8412';

// Fetch random motivational thought
async function fetchRandomThought() {
  try {
    const token = await getAuthToken();
    const response = await fetch(`${API_BASE}/api/Member/get-randomThought`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (response.ok) {
      const data = await response.json();
      return {
        quoteText: data.quoteText,
        author: data.author
      };
    }
    return null;
  } catch (error) {
    console.log('Error fetching random thought:', error);
    return null;
  }
}

async function createExerciseInstance(memberExerciseId, payload = {}) {
  const token = await getAuthToken();
  const res = await fetch(`${API_BASE}/api/Member/exercise-instances/${memberExerciseId}`, {
    method: 'POST',
    headers: {
      Accept: '*/*',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      completed: false,
      durationInMinutes: 0,
      feedback: '',
      notes: '',
      ...payload,
    }),
  });
  // Try to parse JSON; API may return empty 200
  let data = null;
  try { data = await res.json(); } catch {}
  if (!res.ok) {
    throw new Error(`Create instance failed: ${res.status}`);
  }
  return data || {};
}

async function updateExerciseInstance(instanceId, payload) {
  const token = await getAuthToken();
  const res = await fetch(`${API_BASE}/api/Member/update-exerciseInstance/${instanceId}`, {
    method: 'PUT',
    headers: {
      Accept: '*/*',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  let data = null;
  try { data = await res.json(); } catch {}
  if (!res.ok) {
    throw new Error(`Update instance failed: ${res.status}`);
  }
  return data || {};
}

// Persistent storage keys
const ACTIVE_TIMER_KEY = 'GFIT_ACTIVE_EXERCISE_TIMER';

// Add helper to fetch weekly stats from API
async function getWeeklyExerciseStats(memberId) {
  const token = await getAuthToken();
  const res = await fetch(`${API_BASE}/api/Member/weekly-memberExerciseTracker/${memberId}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) throw new Error('Failed to fetch weekly stats');
  return await res.json();
}

// --- Notification API helpers (NEW) ---
async function getMemberNotifications() {
  const token = await getAuthToken();
  const res = await fetch(`${API_BASE}/api/Member/memberNotifications`, {
    method: 'GET',
    headers: {
      Accept: '*/*',
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) throw new Error('Failed to fetch notifications');
  return await res.json();
}

async function markNotificationRead(id) {
  const token = await getAuthToken();
  const res = await fetch(`${API_BASE}/api/Member/notification-markRead/${id}`, {
    method: 'PUT',
    headers: {
      Accept: '*/*',
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) throw new Error('Failed to mark notification as read');
  return await res.json();
}

async function deleteNotification(id) {
  const token = await getAuthToken();
  const res = await fetch(`${API_BASE}/api/Member/delete-notification${id}`, {
    method: 'DELETE',
    headers: {
      Accept: '*/*',
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) throw new Error('Failed to delete notification');
  return await res.json();
}

export default function DashboardScreen(props) {
  const { user, logout, updateUserProfile } = useAuth();
  const [profile, setProfile] = useState(null);
  const { workoutToStart } = props.route.params || {};
  const [countdownVisible, setCountdownVisible] = useState(false);
  const [activeWorkout, setActiveWorkout] = useState(null);
  const [remainingSec, setRemainingSec] = useState(0);
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [scheduleVisible, setScheduleVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date(2025, 8, 5)); // Sep 5, 2025
  const [workoutModalVisible, setWorkoutModalVisible] = useState(false);
  const [rehabModalVisible, setRehabModalVisible] = useState(false);
  const [quizModalVisible, setQuizModalVisible] = useState(false);
  const [challengeModalVisible, setChallengeModalVisible] = useState(false);
  const [selectedWorkoutType, setSelectedWorkoutType] = useState(null);
  const [rehabProgress, setRehabProgress] = useState(0);
  const pulse = useRef(new Animated.Value(0)).current;

  const [rawExercises, setRawExercises] = useState([]);
  const [todayWorkouts, setTodayWorkouts] = useState([]);
  const [schedules, setSchedules] = useState({});
  const [loadingWorkouts, setLoadingWorkouts] = useState(true);

  const [quickStats, setQuickStats] = useState({
    streakDays: 0,
    totalWorkouts: 0,
    workoutsThisWeek: 0,
    totalDurationSec: 0,
  });

  const [weeklyStats, setWeeklyStats] = useState({
    weekStart: null,
    weekEnd: null,
    assignedCount: 0,
    completedCount: 0,
  });

  const [notifications, setNotifications] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  
  // Motivational quote state
  const [motivationalQuote, setMotivationalQuote] = useState({
    quoteText: "Fitness is not a destination, but a way of life.",
    author: "Dr. V.Ben Saverin"
  });
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [quoteFadeAnim] = useState(new Animated.Value(1));

  // Recompute simple stats from today's list (no persistence)
  useEffect(() => {
    const completed = todayWorkouts.filter(w => w.completed).length;
    setQuickStats({
      streakDays: 0,
      totalWorkouts: completed,
      workoutsThisWeek: completed,
      totalDurationSec: 0,
    });
  }, [todayWorkouts]);

  // Auto-refresh all data on component mount and set intervals
  useEffect(() => {
    // Initial load
    loadRandomThought();
    refreshNotificationsCount();
    
    // Set up auto-refresh intervals
    const quoteInterval = setInterval(() => {
      loadRandomThought();
    }, 30000); // 30 seconds - motivational quotes
    
    const notificationInterval = setInterval(() => {
      refreshNotificationsCount();
    }, 30000); // 30 seconds - notifications
    
    const workoutInterval = setInterval(() => {
      // Refresh workouts data
      loadWorkoutsData();
    }, 60000); // 60 seconds - workouts
    
    const profileInterval = setInterval(() => {
      // Refresh profile data
      loadProfileData();
    }, 120000); // 2 minutes - profile
    
    const statsInterval = setInterval(() => {
      // Refresh weekly stats
      loadWeeklyStats();
    }, 120000); // 2 minutes - weekly stats
    
    return () => {
      clearInterval(quoteInterval);
      clearInterval(notificationInterval);
      clearInterval(workoutInterval);
      clearInterval(profileInterval);
      clearInterval(statsInterval);
    };
  }, []);

  // Load random motivational thought with smooth transition
  const loadRandomThought = async () => {
    setLoadingQuote(true);
    
    // Fade out current quote
    Animated.timing(quoteFadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
    
    try {
      const quote = await fetchRandomThought();
      if (quote) {
        setMotivationalQuote(quote);
      }
    } catch (error) {
      console.log('Error loading random thought:', error);
    } finally {
      setLoadingQuote(false);
      
      // Fade in new quote
      Animated.timing(quoteFadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  };

  // Load workouts data
  const loadWorkoutsData = async () => {
    try {
      const prof = await getMemberProfile();
      const memberId = prof?.memberId || prof?.id || prof?.userId;
      if (!memberId) return;

      const list = await getMemberAllExercise(memberId);
      const mapped = Array.isArray(list)
        ? list.map((it, idx) => ({
            id: it.memberExerciseId || it.id || it.exerciseId || `${idx}`,
            memberExerciseId: it.memberExerciseId || it.id || it.exerciseId || `${idx}`,
            name: it.exerciseName || it.name || it.title || 'Workout',
            numberOfTimes: it.numberOfTimes ?? null,
            numberOfSets: it.numberOfSets ?? null,
            instruction: it.instruction ?? '',
            duration: it.duration || it.estimatedDuration || (it.numberOfSets ? `${it.numberOfSets} sets` : ''),
            completed: it.completed || false,
            durationSec: it.durationSec || 0,
          }))
        : [];
      
      setRawExercises(mapped);
      
      // Filter for today using the same logic as the original
      const today = new Date();
      let todays = mapped.filter((ex) => isExerciseOnDate(ex, today));
      if (!todays.length) todays = mapped;
      setTodayWorkouts(todays);
    } catch (error) {
      console.log('Error loading workouts:', error);
    }
  };

  // Load profile data
  const loadProfileData = async () => {
    try {
      const data = await getMemberProfile();
      const displayName = data?.name || data?.fullName || data?.firstName || data?.userName || null;
      setProfile({ ...data, displayName });
      if (displayName && displayName !== user?.name) {
        updateUserProfile?.({ name: displayName });
      }
    } catch (error) {
      console.log('Error loading profile:', error);
    }
  };

  // Load weekly stats
  const loadWeeklyStats = async () => {
    try {
      const prof = await getMemberProfile();
      const memberId = prof?.memberId || prof?.id || prof?.userId;
      if (memberId) {
        const stats = await getWeeklyExerciseStats(memberId);
        setWeeklyStats(stats);
      }
    } catch (error) {
      console.log('Error loading weekly stats:', error);
    }
  };

  // Refresh function for pull-to-refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      // Refresh all data simultaneously
      await Promise.all([
        refreshNotificationsCount(),
        loadRandomThought(),
        loadWorkoutsData(),
        loadProfileData(),
        loadWeeklyStats(),
      ]);
    } catch (error) {
      console.log('Error refreshing data:', error);
    } finally {
      setRefreshing(false);
    }
  }, [refreshNotificationsCount]);

  // Move 'today' up so it's available everywhere and stable per render
  const today = useMemo(() => new Date(), []); // freeze for this render

  // Fetch today's workouts from backend
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoadingWorkouts(true);
        const prof = await getMemberProfile();
        const memberId = prof?.memberId || prof?.id || prof?.userId;
        if (!memberId) throw new Error('Unable to resolve member id');

        const list = await getMemberAllExercise(memberId);

        const mapped = Array.isArray(list)
  ? list.map((it, idx) => ({
      id: it.memberExerciseId || it.id || it.exerciseId || `${idx}`,
      memberExerciseId: it.memberExerciseId || it.id || it.exerciseId || `${idx}`,
      name: it.exerciseName || it.name || it.title || 'Workout',
      numberOfTimes: it.numberOfTimes ?? null,         // <-- ADD
      numberOfSets: it.numberOfSets ?? null,           // <-- ADD
      instruction: it.instruction ?? '',               // <-- ADD
      duration: it.duration || it.estimatedDuration || (it.numberOfSets ? `${it.numberOfSets} sets` : ''),
      completed: Boolean(it.completed || it.isCompleted),
      scheduleTypes: it.scheduleTypes || [],
    }))
  : [];

        // Filter for today; if nothing matches, fall back to showing all
        let todays = mapped.filter((ex) => isExerciseOnDate(ex, today));
        if (!todays.length) todays = mapped;

        if (!cancelled) {
          setRawExercises(mapped);
          setTodayWorkouts(todays);
          const cal = buildMonthSchedules(mapped, currentDate.getFullYear(), currentDate.getMonth());
          setSchedules(cal);
        }
      } catch (e) {
        console.log('Fetch workouts failed:', e?.message || e);
        if (!cancelled) {
          setRawExercises([]);
          setTodayWorkouts([]);
        }
      } finally {
        if (!cancelled) setLoadingWorkouts(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // --- Unread notifications count: load on mount, on focus, and poll periodically ---
  const refreshNotificationsCount = useCallback(async () => {
    try {
      const list = await getMemberNotifications();
      const count = Array.isArray(list) ? list.filter(n => !n.isRead).length : 0;
      setUnreadCount(count);
      setNotifications(list);
    } catch (e) {
      // Non-fatal
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    // initial load
    refreshNotificationsCount();
    // poll every 30s
    const id = setInterval(() => {
      if (isMounted) refreshNotificationsCount();
    }, 30000);
    // refresh on focus
    const unsubscribe = props.navigation?.addListener?.('focus', refreshNotificationsCount);
    return () => {
      isMounted = false;
      clearInterval(id);
      if (unsubscribe) unsubscribe();
    };
  }, [refreshNotificationsCount, props.navigation]);

  // Rebuild schedules when month or exercises change
  useEffect(() => {
    const cal = buildMonthSchedules(rawExercises, currentDate.getFullYear(), currentDate.getMonth());
    setSchedules(cal);
  }, [currentDate, rawExercises]);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.log('Logout error:', error);
    }
  };

  // When countdown finishes, mark session completed once
  const completionFired = useRef(false);
  useEffect(() => {
    if (countdownVisible && remainingSec === 0 && !completionFired.current) {
      completionFired.current = true;
      setTimeout(() => { completionFired.current = false; }, 1500);
    }
  }, [countdownVisible, remainingSec, activeWorkout]);

  // Close countdown and reset state
  const closeCountdown = useCallback(() => {
    setCountdownVisible(false);
    setActiveWorkout(null);
    setRemainingSec(0);
  }, []);

  const parseDurationToSeconds = (str = '') => {
    const s = String(str).toLowerCase();
    const hrMatch = s.match(/(\d+)\s*(h|hr|hrs|hour|hours)/);
    const minMatch = s.match(/(\d+)\s*(m|min|mins|minute|minutes)/);
    const hours = hrMatch ? parseInt(hrMatch[1], 10) : 0;
    const minutes = minMatch ? parseInt(minMatch[1], 10) : (hrMatch ? 0 : (parseInt(s, 10) || 0));
    const total = hours * 3600 + minutes * 60;
    return Number.isFinite(total) && total > 0 ? total : 20 * 60;
  };

  const formatHMS = (sec) => {
    const s = Math.max(0, Math.floor(sec));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const ss = s % 60;
    const hPart = h > 0 ? String(h).padStart(2, '0') + ':' : '';
    return `${hPart}${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
  };

  const formatWords = (sec) => {
    const s = Math.max(0, Math.floor(sec));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const ss = s % 60;
    const parts = [];
    if (h) parts.push(`${h} ${h === 1 ? 'hour' : 'hours'}`);
    if (m) parts.push(`${m} ${m === 1 ? 'minute' : 'minutes'}`);
    if (ss || (!h && !m)) parts.push(`${ss} ${ss === 1 ? 'second' : 'seconds'}`);
    return `${parts.join(' ')} remaining`;
  };

  const startPulse = () => {
    pulse.setValue(0);
    Animated.loop(
      Animated.sequence([

        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 900,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ])


    ).start();
  };

  useEffect(() => {
    if (!countdownVisible || !activeWorkout) return;

    startPulse();
    const id = setInterval(() => {
      setRemainingSec((prev) => {
        if (prev <= 1) {
          clearInterval(id);
          setTodayWorkouts((prevWorkouts) =>
            prevWorkouts.map((workout) =>
              workout.id === activeWorkout.id ? { ...workout, completed: true } : workout
            )
          );
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(id);
      pulse.stopAnimation();
    };
  }, [countdownVisible, activeWorkout]);

  useEffect(() => {
    if (workoutToStart) {
      openCountdown(workoutToStart);
      // Clear the workoutToStart param to prevent re-triggering
      props.navigation.setParams({ workoutToStart: null });
    }
  }, [workoutToStart, props.navigation]);

  const openCountdown = (workout) => {
    const secs = parseDurationToSeconds(workout.duration);
    setActiveWorkout(workout);
    setRemainingSec(secs);
    setCountdownVisible(true);
  };

  const resetWorkout = (workoutId) => {
    setTodayWorkouts((prev) =>
      prev.map((workout) =>
        workout.id === workoutId ? { ...workout, completed: false } : workout
      )
    );
  };

  const handleWorkoutSelect = (type) => {
    setSelectedWorkoutType(type);
    setWorkoutModalVisible(true);
  };

  const handleRehabUpdate = () => {
    setRehabProgress((prev) => Math.min(prev + 10, 100));
    setRehabModalVisible(true);
  };

  const handleQuizComplete = () => {
    setQuizModalVisible(true);
  };

  const handleChallengeStart = () => {
    setChallengeModalVisible(true);
  };

  // Calendar logic
  const getMonthDays = (year, month) => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return { firstDay, daysInMonth };
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const openSchedule = (date) => {
    setSelectedDate(date);
    setScheduleVisible(true);
  };

  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const fullDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const { firstDay, daysInMonth } = getMonthDays(currentDate.getFullYear(), currentDate.getMonth());
  const calendarDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const now = new Date();

  const formatDateKey = (d) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const isExerciseOnDate = (ex, d) => {
    const names = Array.isArray(ex?.scheduleTypes)
      ? ex.scheduleTypes.map((s) => String(s?.name || '').trim().toLowerCase())
      : [];

    // If API didn’t send schedule info, show it in Today by default
    if (!names.length) return true;

    const everydayAliases = ['all day', 'allday', 'everyday', 'every day', 'daily', 'any', 'all'];
    if (names.some((n) => everydayAliases.includes(n))) return true;

    const fullDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dowName = fullDays[d.getDay()].toLowerCase();
    return names.includes(dowName);
  };

  const buildMonthSchedules = (exercises, year, month) => {
    const map = {};
    if (!Array.isArray(exercises) || exercises.length === 0) return map;
    const dim = new Date(year, month + 1, 0).getDate();
    for (let day = 1; day <= dim; day++) {
      const d = new Date(year, month, day);
      exercises.forEach((ex) => {
        if (isExerciseOnDate(ex, d)) {
          const key = formatDateKey(d);
          if (!map[key]) map[key] = [];
          map[key].push({ id: ex.id || ex.exerciseId || ex.memberExerciseId || `${key}-${map[key].length}` , time: '', name: ex.name || ex.exerciseName || 'Workout' });
        }
      });
    }
    return map;
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getMemberProfile();
        if (!cancelled) {
          const displayName = data?.name || data?.fullName || data?.firstName || data?.userName || null;
          setProfile({ ...data, displayName });
          if (displayName && displayName !== user?.name) {
            updateUserProfile?.({ name: displayName });
          }
        }
      } catch (e) {
        // Non-fatal; keep using existing user fallback
        console.log('Profile fetch failed:', e?.message || e);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Timer + instance state
  const [activeInstance, setActiveInstance] = useState(null);
  const [elapsedSec, setElapsedSec] = useState(0);
  const tickRef = useRef(null);
  const [isTimerPaused, setIsTimerPaused] = useState(false); // ADD

  // Stop dialog
  const [isStopModalVisible, setIsStopModalVisible] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Restore active timer on mount
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(ACTIVE_TIMER_KEY);
        if (!raw) return;
        const saved = JSON.parse(raw);
        if (saved?.memberExerciseId && saved?.startedAt) {
          setActiveInstance(saved);
        }
      } catch (e) {}
    })();
  }, []);

  // Drive elapsed time and tick
  useEffect(() => {
    if (!activeInstance?.startedAt || isTimerPaused) { // PAUSE support
      if (tickRef.current) {
        clearInterval(tickRef.current);
        tickRef.current = null;
      }
      return;
    }
    const compute = () => {
      const started = new Date(activeInstance.startedAt).getTime();
      const now = Date.now();
      const delta = Math.max(0, Math.floor((now - started) / 1000));
      setElapsedSec(delta);
    };
    compute();
    tickRef.current = setInterval(compute, 1000);
    return () => {
      if (tickRef.current) {
        clearInterval(tickRef.current);
        tickRef.current = null;
      }
    };
  }, [activeInstance?.startedAt, isTimerPaused]); // UPDATED deps

  // Persist active instance whenever it changes
  useEffect(() => {
    (async () => {
      try {
        if (activeInstance) {
          await AsyncStorage.setItem(ACTIVE_TIMER_KEY, JSON.stringify(activeInstance));
        } else {
          await AsyncStorage.removeItem(ACTIVE_TIMER_KEY);
        }
      } catch {}
    })();
  }, [activeInstance]);

  const formatMMSS = (totalSec) => {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const startWorkout = async (ex) => {
    if (activeInstance) return; // one at a time
    try {
      // Create instance with completed=false
      const created = await createExerciseInstance(ex.memberExerciseId || ex.id || ex.exerciseId, {
        completed: false,
        durationInMinutes: 0,
      });
      const instanceId =
        created?.instanceId || created?.id || created?.exerciseInstanceId || created?.memberExerciseInstanceId || null;

      const started = {
        memberExerciseId: ex.memberExerciseId || ex.id || ex.exerciseId,
        instanceId,
        exerciseName: ex.name || ex.exerciseName || 'Workout',
        startedAt: new Date().toISOString(),
      };
      setActiveInstance(started);
      setIsTimerPaused(false);         // ensure running
      setCountdownVisible(true);       // OPEN pulse popup
      setFeedback('');
      setNotes('');
    } catch (err) {
      console.log('Start workout failed:', err?.message || err);
    }
  };

  const stopWorkout = () => {
    if (!activeInstance?.startedAt) return;
    // Freeze time immediately and open feedback
    const delta = Math.max(0, Math.floor((Date.now() - new Date(activeInstance.startedAt).getTime()) / 1000));
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
    setElapsedSec(delta);
    setIsTimerPaused(true);            // PAUSE
    setCountdownVisible(false);        // CLOSE pulse popup
    setIsStopModalVisible(true);       // OPEN feedback
  };

  const confirmStopAndSave = async () => {
    try {
      setSaving(true);
      const minutes = Math.floor(elapsedSec / 60); // allow 0
      const payload = {
        completed: true,
        durationInMinutes: minutes,
        feedback: feedback?.trim() || '',
        notes: notes?.trim() || '',
      };
      if (activeInstance?.instanceId) {
        await updateExerciseInstance(activeInstance.instanceId, payload);
      } else {
        await createExerciseInstance(activeInstance.memberExerciseId, payload);
      }
      // --- Send notification after workout completion ---
      if (user?.id) {
        await sendBulkNotifications({
          userIds: [user.id],
          title: 'Workout Completed!',
          message: `Congrats, you finished "${activeInstance?.exerciseName || 'your workout'}".`,
          type: 'workout',
          severity: 'info',
        });
      }
      // --- End notification ---
      setActiveInstance(null);
      setElapsedSec(0);
      setIsStopModalVisible(false);
      setIsTimerPaused(false);
      setCountdownVisible(false);
      // Optionally: refresh workouts here
    } catch (err) {
      console.log('Finish workout failed:', err?.message || err);
    } finally {
      setSaving(false);
    }
  };

  // Rendering Today's Workouts list
  const renderTodayWorkoutItem = (item) => {
    const isActive = activeInstance?.memberExerciseId === (item.memberExerciseId || item.id || item.exerciseId);
    return (
      <View style={styles.todayWorkoutItem}>
        <Text style={styles.todayWorkoutTitle}>{item.name || item.exerciseName}</Text>
        {isActive ? (
          <View style={styles.timerRow}>
            <Text style={styles.timerText}>{formatMMSS(elapsedSec)}</Text>
            <TouchableOpacity style={[styles.stopBtn, styles.timerBtn]} onPress={stopWorkout}>
              <Text style={styles.timerBtnText}>Stop</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.startBtn, styles.timerBtn]}
            onPress={() => startWorkout(item)}
            accessible={true}
            accessibilityLabel="Start workout"
            accessibilityHint="Starts the timer for this workout"
          >
            <Text style={styles.timerBtnText}>Start</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const prof = await getMemberProfile();
        const memberId = prof?.memberId || prof?.id || prof?.userId;
        if (memberId) {
          const stats = await getWeeklyExerciseStats(memberId);
          if (!cancelled) setWeeklyStats(stats);
        }
      } catch (e) {
        if (!cancelled) setWeeklyStats({
          weekStart: null,
          weekEnd: null,
          assignedCount: 0,
          completedCount: 0,
        });
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <>
      <View style={styles.container}>
        <LinearGradient
          colors={[BRAND_COLORS.PURPLE, LIGHT_PURPLE]}
          style={styles.gradient}
        >
          <View style={styles.header}>
            <View style={styles.headerRow}>
              <View style={styles.headerLeft}>
                <Text style={styles.greeting}>{getGreeting()},</Text>
                <Text style={styles.userName}>{profile?.displayName || 'Guest'}</Text>
              </View>
              <View style={styles.headerRight}>
                {/* Notifications Button */}
                <TouchableOpacity
                  style={styles.headerIconBtn}
                  onPress={() => props.navigation.navigate('Notifications')}
                  accessibilityRole="button"
                  accessibilityLabel="Notifications"
                >
                  <Icon name="bell" size={24} color={BRAND_COLORS.YELLOW} />
                  {unreadCount > 0 && (
                    <View style={styles.notificationBadge}>
                      <Text style={styles.notificationBadgeText}>
                        {unreadCount > 99 ? '99+' : String(unreadCount)}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
                {/* Logout Button */}
                <TouchableOpacity
                  style={[styles.headerIconBtn, styles.headerIconBtnRight]}
                  onPress={handleLogout}
                  accessibilityRole="button"
                  accessibilityLabel="Logout"
                >
                  <Icon name="log-out" size={24} color={BRAND_COLORS.YELLOW} />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={BRAND_COLORS.YELLOW}
                colors={[BRAND_COLORS.YELLOW]}
              />
            }
          >
            {/* Quick Stats */}
            <View style={styles.statsContainer}>
              <View style={styles.statsHeader}>
                <Text style={styles.statsTitle}>Weekly Progress</Text>
                <View style={styles.statsBadge}>
                  <Text style={styles.statsBadgeText}>
                    {weeklyStats.weekStart
                      ? `Week of ${new Date(weeklyStats.weekStart).toLocaleDateString()}`
                      : 'This Week'}
                  </Text>
                </View>
              </View>

              <View style={styles.statsMainCard}>
                <LinearGradient
                  colors={[BRAND_COLORS.PURPLE, LIGHT_PURPLE]}
                  style={styles.statsMainGradient}
                >
                  <View style={styles.statsMainContent}>
                    <View style={styles.statsMainLeft}>
                      <Text style={styles.statsMainNumber}>{weeklyStats.completedCount}</Text>
                      <Text style={styles.statsMainLabel}>Workouts Completed</Text>
                      <View style={styles.statsProgressBar}>
                        <View
                          style={[
                            styles.statsProgressFill,
                            {
                              width: `${
                                weeklyStats.assignedCount
                                  ? (weeklyStats.completedCount / weeklyStats.assignedCount) * 100
                                  : 0
                              }%`,
                            },
                          ]}
                        />
                      </View>
                      <Text style={styles.statsProgressText}>
                        {weeklyStats.completedCount} of {weeklyStats.assignedCount} assigned this week
                      </Text>
                    </View>
                    <View style={styles.statsMainRight}>
                      <Icon name="check-circle" size={28} color={BRAND_COLORS.YELLOW} />
                      <Text style={styles.statsMainSubtitle}>
                        {weeklyStats.completedCount >= weeklyStats.assignedCount && weeklyStats.assignedCount > 0
                          ? 'Target Met'
                          : 'Keep Going'}
                      </Text>
                    </View>
                  </View>
                </LinearGradient>
              </View>

              <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                  <View style={styles.statCardHeader}>
                    <Icon name="trending-up" size={20} color={BRAND_COLORS.YELLOW} />
                    <View style={styles.statCardTrend}>
                      <Text style={styles.statCardTrendText}>+2</Text>
                    </View>
                  </View>
                  <Text style={styles.statNumber}>{quickStats.streakDays}</Text>
                  <Text style={styles.statLabel}>Consecutive Days</Text>
                  <View style={styles.statCardProgress}>
                    <View style={[styles.statCardProgressFill, { width: `${(quickStats.streakDays / 7) * 100}%` }]} />
                  </View>
                </View>

                <View style={styles.statCard}>
                  <View style={styles.statCardHeader}>
                    <Icon name="award" size={20} color={BRAND_COLORS.YELLOW} />
                    <View style={styles.statCardTrend}>
                      <Text style={styles.statCardTrendText}>+4</Text>
                    </View>
                  </View>
                  <Text style={styles.statNumber}>{quickStats.totalWorkouts}</Text>
                  <Text style={styles.statLabel}>Total Sessions</Text>
                  <View style={styles.statCardProgress}>
                    <View style={[styles.statCardProgressFill, { width: `${(quickStats.totalWorkouts / 50) * 100}%` }]} />
                  </View>
                </View>
              </View>
            </View>

            {/* Today's Workouts */}
            <View style={styles.section}>
  <View style={styles.sectionHeader}>
    <Text style={styles.sectionTitle}>Today's Workouts</Text>
    {todayWorkouts.length > 0 && (
      <TouchableOpacity 
        onPress={() => props.navigation.navigate('Workouts', { 
          todayWorkouts: todayWorkouts,
          fromDashboard: true 
        })}
        style={styles.viewAllButton}
      >
        <Text style={styles.seeAllText}>View All</Text>
        <Icon name="arrow-right" size={16} color={BRAND_COLORS.YELLOW} />
      </TouchableOpacity>
    )}
  </View>
  {(todayWorkouts && todayWorkouts.length > 0) ? (
    todayWorkouts.slice(0, 3).map((item) => {
      const isCompleted =
        Array.isArray(item.instances) && item.instances.some(inst => inst.completed);

      return (
        <TouchableOpacity
          key={item.memberExerciseId || item.id}
          style={[
            styles.workoutCard,
            isCompleted && styles.completedWorkout
          ]}
          onPress={() => props.navigation.navigate('Workouts', { 
            todayWorkouts: todayWorkouts,
            fromDashboard: true,
            selectedWorkout: item
          })}
          activeOpacity={0.85}
        >
          <Text style={styles.workoutName}>{item.exerciseName || item.name}</Text>
          <Text style={styles.workoutMeta}>
            {(item.numberOfTimes != null ? `${item.numberOfTimes} × ` : '')}
            {(item.numberOfSets != null ? `${item.numberOfSets} sets` : '')}
          </Text>
          {!!item.instruction && (
            <Text style={styles.workoutInstruction} numberOfLines={3}>
              {item.instruction}
            </Text>
          )}
          {isCompleted && (
            <View style={styles.completedContainer}>
              <Text style={styles.completedText}>Completed</Text>
            </View>
          )}
        </TouchableOpacity>
      );
    })
  ) : (
    <Text style={styles.emptyText}>No workouts assigned for today.</Text>
  )}
</View>

            {/* Quick Actions */}
            <View style={styles.quickActionsContainer}>
              <Text style={styles.sectionTitle}>Quick Actions</Text>
              <View style={styles.quickActionsGrid}>
                {/* Personalized Workout Builder */}
                <TouchableOpacity
                  style={styles.quickActionCard}
                  onPress={() => setWorkoutModalVisible(true)}
                  activeOpacity={0.9}
                  accessibilityRole="button"
                  accessibilityLabel="Personalized Workout Builder"
                >
                  <Icon name="edit" size={18} color={BRAND_COLORS.YELLOW} />
                  <Text style={styles.quickActionText}>Workout Builder</Text>
                  <Text style={styles.quickActionSubText}>Create a custom plan for your goals</Text>
                </TouchableOpacity>

                {/* Rehab Progress Tracker */}
                <TouchableOpacity
                  style={styles.quickActionCard}
                  onPress={() => setRehabModalVisible(true)}
                  activeOpacity={0.9}
                  accessibilityRole="button"
                  accessibilityLabel="Rehab Progress Tracker"
                >
                  <Icon name="activity" size={18} color={BRAND_COLORS.YELLOW} />
                  <Text style={styles.quickActionText}>Rehab Tracker</Text>
                  <Text style={styles.quickActionSubText}>Track your recovery progress</Text>
                </TouchableOpacity>

                {/* Chronic Disease Prevention Quiz */}
                <TouchableOpacity
                  style={styles.quickActionCard}
                  onPress={() => setQuizModalVisible(true)}
                  activeOpacity={0.9}
                  accessibilityRole="button"
                  accessibilityLabel="Prevention Quiz"
                >
                  <Icon name="heart" size={18} color={BRAND_COLORS.YELLOW} />
                  <Text style={styles.quickActionText}>Prevention Quiz</Text>
                  <Text style={styles.quickActionSubText}>Assess your health risks</Text>
                </TouchableOpacity>

                {/* Community Challenge Starter */}
                <TouchableOpacity
                  style={styles.quickActionCard}
                  onPress={() => setChallengeModalVisible(true)}
                  activeOpacity={0.9}
                  accessibilityRole="button"
                  accessibilityLabel="Community Challenge"
                >
                  <Icon name="users" size={18} color={BRAND_COLORS.YELLOW} />
                  <Text style={styles.quickActionText}>Community Challenge</Text>
                  <Text style={styles.quickActionSubText}>Join or start a group challenge</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Motivation Quote */}
            <View style={styles.motivationContainer}>
              {loadingQuote ? (
                <View style={styles.motivationLoading}>
                  <ActivityIndicator size="small" color={BRAND_COLORS.YELLOW} />
                  <Text style={styles.motivationLoadingText}>Loading inspiration...</Text>
                </View>
              ) : (
                <Animated.View style={{ opacity: quoteFadeAnim }}>
                  <Text style={styles.motivationText}>
                    "{motivationalQuote.quoteText}"
                  </Text>
                  <Text style={styles.motivationAuthor}>- {motivationalQuote.author}</Text>
                </Animated.View>
              )}
            </View>
          </ScrollView>

          {/* Floating Calendar Button */}
          <TouchableOpacity
            style={styles.floatingCalendarBtn}
            onPress={() => setCalendarVisible(true)}
            accessibilityRole="button"
            accessibilityLabel="Open Calendar"
          >
            <Icon name="calendar" size={24} color={BRAND_COLORS.YELLOW} />
          </TouchableOpacity>

          {/* Full-screen Countdown */}
          <Modal
            visible={countdownVisible}
            animationType="fade"
            presentationStyle="fullScreen"
            onRequestClose={() => setCountdownVisible(false)}
          >
            <View style={styles.countdownRoot}>
              <StatusBar backgroundColor={BRAND_COLORS.PURPLE} barStyle="light-content" />
              <Text style={styles.countdownTitle}>{activeInstance?.exerciseName || 'Workout'}</Text>

              <View style={styles.countdownCenter}>
                <View style={styles.pulseWrap}>
                  <RoundPulse size={260} color="rgba(207,219,39,0.25)" playing={!isTimerPaused} />
                  <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={styles.timeText}>{formatMMSS(elapsedSec)}</Text>
                  </View>
                </View>
                <Text style={styles.timeSubText}>
                  Tap Stop when done.
                </Text>
              </View>

              <View style={[styles.countdownFooter, { flexDirection: 'row', justifyContent: 'center' }]}>
                <TouchableOpacity
                  style={styles.countdownBackBtn}
                  onPress={() => setCountdownVisible(false)}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel="Hide Timer"
                >
                  <Text style={styles.countdownBackTxt}>Hide</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.countdownBackBtn, { backgroundColor: BRAND_COLORS.YELLOW, marginLeft: 12 }]}
                  onPress={stopWorkout}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel="Stop and Save"
                >
                  <Text style={[styles.countdownBackTxt, { color: BRAND_COLORS.PURPLE }]}>Stop</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          {/* Calendar Modal */}
          <Modal
            visible={calendarVisible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={() => setCalendarVisible(false)}
          >
            <View style={styles.calendarModal}>
              <StatusBar backgroundColor={BRAND_COLORS.PURPLE} barStyle="light-content" />
              <View style={styles.calendarHeader}>
                <TouchableOpacity
                  style={styles.calendarNavBtn}
                  onPress={handlePrevMonth}
                  accessibilityRole="button"
                  accessibilityLabel="Previous Month"
                >
                  <Icon name="chevron-left" size={24} color={BRAND_COLORS.YELLOW} />
                </TouchableOpacity>
                <Text style={styles.calendarTitle}>
                  {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                </Text>
                <TouchableOpacity
                  style={styles.calendarNavBtn}
                  onPress={handleNextMonth}
                  accessibilityRole="button"
                  accessibilityLabel="Next Month"
                >
                  <Icon name="chevron-right" size={24} color={BRAND_COLORS.YELLOW} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.calendarCloseBtn}
                  onPress={() => setCalendarVisible(false)}
                  accessibilityRole="button"
                  accessibilityLabel="Close Calendar"
                >
                  <Icon name="x" size={24} color={BRAND_COLORS.YELLOW} />
                </TouchableOpacity>
              </View>
              <View style={styles.calendarGrid}>
                {daysOfWeek.map((day, index) => (
                  <Text key={index} style={styles.calendarDayName}>
                    {day}
                  </Text>
                ))}
                {Array(firstDay)
                  .fill(null)
                  .map((_, index) => (
                    <View key={`empty-${index}`} style={styles.calendarDay} />
                  ))}
                {calendarDays.map((day) => {
                  const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(
                    2,
                    '0'
                  )}-${String(day).padStart(2, '0')}`;
                  const isToday =
                    day === now.getDate() &&
                    currentDate.getMonth() === now.getMonth() &&
                    currentDate.getFullYear() === now.getFullYear();
                  const hasSchedule = !!(schedules[dateStr]?.length);
                  return (
                    <TouchableOpacity
                      key={day}
                      style={[

                        styles.calendarDay,
                        isToday && styles.calendarDayToday,
                        hasSchedule && styles.calendarDayScheduled,
                      ]}
                      onPress={() => openSchedule(dateStr)}
                    >
                      <Text
                        style={[

                          styles.calendarDayText,
                          isToday && styles.calendarDayTextToday,
                          hasSchedule && styles.calendarDayTextScheduled,
                        ]}
                      >
                        {day}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </Modal>

          {/* Schedule Modal */}
          <Modal
            visible={scheduleVisible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={() => setScheduleVisible(false)}
          >
            <View style={styles.scheduleModal}>
              <StatusBar backgroundColor={BRAND_COLORS.PURPLE} barStyle="light-content" />
              <View style={styles.scheduleHeader}>
                <View style={styles.scheduleTitleContainer}>
                  <Text style={styles.scheduleTitle}>
                    {selectedDate ? new Date(selectedDate).toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    }) : 'Selected Date'}
                  </Text>
                  <Text style={styles.scheduleSubtitle}>
                    {schedules[selectedDate]?.length || 0} workout{schedules[selectedDate]?.length !== 1 ? 's' : ''} scheduled
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.scheduleCloseBtn}
                  onPress={() => setScheduleVisible(false)}
                  accessibilityRole="button"
                  accessibilityLabel="Close Schedule"
                >
                  <Icon name="x" size={24} color={BRAND_COLORS.YELLOW} />
                </TouchableOpacity>
              </View>
              
              <ScrollView style={styles.scheduleContent} showsVerticalScrollIndicator={false}>
                {schedules[selectedDate] ? (
                  schedules[selectedDate].map((schedule, index) => (
                    <View key={schedule.id || index} style={styles.scheduleItem}>
                      <View style={styles.scheduleItemHeader}>
                        <View style={styles.scheduleTimeContainer}>
                          <Icon name="clock" size={16} color={BRAND_COLORS.YELLOW} />
                          <Text style={styles.scheduleItemTime}>{schedule.time}</Text>
                        </View>
                      </View>
                      
                      <Text style={styles.scheduleItemName}>{schedule.name}</Text>
                      
                      {schedule.description && (
                        <Text style={styles.scheduleItemDescription}>{schedule.description}</Text>
                      )}
                      
                      <View style={styles.scheduleItemDetails}>
                        {schedule.duration && (
                          <View style={styles.scheduleDetailItem}>
                            <Icon name="clock" size={14} color="rgba(255, 255, 255, 0.7)" />
                            <Text style={styles.scheduleDetailText}>{schedule.duration}</Text>
                          </View>
                        )}
                        
                        {schedule.sets && (
                          <View style={styles.scheduleDetailItem}>
                            <Icon name="repeat" size={14} color="rgba(255, 255, 255, 0.7)" />
                            <Text style={styles.scheduleDetailText}>{schedule.sets} sets</Text>
                          </View>
                        )}
                        
                        {schedule.reps && (
                          <View style={styles.scheduleDetailItem}>
                            <Icon name="hash" size={14} color="rgba(255, 255, 255, 0.7)" />
                            <Text style={styles.scheduleDetailText}>{schedule.reps} reps</Text>
                          </View>
                        )}
                        
                        {schedule.difficulty && (
                          <View style={styles.scheduleDetailItem}>
                            <Icon name="trending-up" size={14} color="rgba(255, 255, 255, 0.7)" />
                            <Text style={styles.scheduleDetailText}>{schedule.difficulty}</Text>
                          </View>
                        )}
                      </View>
                      
                      {schedule.notes && (
                        <View style={styles.scheduleNotesContainer}>
                          <Text style={styles.scheduleNotesLabel}>Notes:</Text>
                          <Text style={styles.scheduleNotesText}>{schedule.notes}</Text>
                        </View>
                      )}
                    </View>
                  ))
                ) : (
                  <View style={styles.scheduleEmptyContainer}>
                    <Icon name="calendar" size={48} color="rgba(255, 255, 255, 0.3)" />
                    <Text style={styles.scheduleEmptyText}>No workouts scheduled</Text>
                    <Text style={styles.scheduleEmptySubtext}>
                      This date is free for rest or spontaneous activities
                    </Text>
                  </View>
                )}
              </ScrollView>
            </View>
          </Modal>

          {/* Personalized Workout Builder Modal */}
          <Modal
            visible={workoutModalVisible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={() => setWorkoutModalVisible(false)}
          >
            <View style={styles.modalContainer}>
              <StatusBar backgroundColor={BRAND_COLORS.PURPLE} barStyle="light-content" />
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Personalized Workout Builder</Text>
                <TouchableOpacity
                  style={styles.modalCloseBtn}
                  onPress={() => setWorkoutModalVisible(false)}
                  accessibilityRole="button"
                  accessibilityLabel="Close Workout Modal"
                >
                  <Icon name="x" size={24} color={BRAND_COLORS.YELLOW} />
                </TouchableOpacity>
              </View>
              <View style={styles.modalContent}>
                <Text style={styles.modalText}>Choose Your Workout Type</Text>
                {['Strength', 'Rehab', 'Prenatal', 'Geriatric'].map((type, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[styles.optionButton, selectedWorkoutType === type && styles.optionButtonSelected]}
                    onPress={() => handleWorkoutSelect(type)}
                    accessibilityRole="button"
                    accessibilityLabel={`Select ${type} workout`}
                  >
                    <Text style={styles.optionButtonText}>{type}</Text>
                  </TouchableOpacity>
                ))}
                <Text style={styles.modalSubText}>
                  {selectedWorkoutType ? `Selected: ${selectedWorkoutType} Plan` : 'Build a plan tailored to your needs!'}
                </Text>
              </View>
            </View>
          </Modal>

          {/* Rehab Progress Tracker Modal */}
          <Modal
            visible={rehabModalVisible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={() => setRehabModalVisible(false)}
          >
            <View style={styles.modalContainer}>
              <StatusBar backgroundColor={BRAND_COLORS.PURPLE} barStyle="light-content" />
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Rehab Progress Tracker</Text>
                <TouchableOpacity
                  style={styles.modalCloseBtn}
                  onPress={() => setRehabModalVisible(false)}
                  accessibilityRole="button"
                  accessibilityLabel="Close Rehab Modal"
                >
                  <Icon name="x" size={24} color={BRAND_COLORS.YELLOW} />
                </TouchableOpacity>
              </View>
              <View style={styles.modalContent}>
                <Text style={styles.modalText}>Your Recovery Progress</Text>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${rehabProgress}%` }]} />
                </View>
                <Text style={styles.modalSubText}>Progress: {rehabProgress}%</Text>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={handleRehabUpdate}
                  accessibilityRole="button"
                  accessibilityLabel="Update Progress"
                >
                  <Text style={styles.actionButtonText}>Log Progress</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          {/* Chronic Disease Prevention Quiz Modal */}
          <Modal
            visible={quizModalVisible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={() => setQuizModalVisible(false)}
          >
            <View style={styles.modalContainer}>
              <StatusBar backgroundColor={BRAND_COLORS.PURPLE} barStyle="light-content" />
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Prevention Quiz</Text>
                <TouchableOpacity
                  style={styles.modalCloseBtn}
                  onPress={() => setQuizModalVisible(false)}
                  accessibilityRole="button"
                  accessibilityLabel="Close Quiz Modal"
                >
                  <Icon name="x" size={24} color={BRAND_COLORS.YELLOW} />
                </TouchableOpacity>
              </View>
              <View style={styles.modalContent}>
                <Text style={styles.modalText}>Assess Your Health Risks</Text>
                <Text style={styles.modalSubText}>
                  Take a quick quiz to get a personalized prevention plan.
                </Text>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={handleQuizComplete}
                  accessibilityRole="button"
                  accessibilityLabel="Complete Quiz"
                >
                  <Text style={styles.actionButtonText}>Start Quiz</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          {/* Community Challenge Starter Modal */}
          <Modal
            visible={challengeModalVisible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={() => setChallengeModalVisible(false)}
          >
            <View style={styles.modalContainer}>
              <StatusBar backgroundColor={BRAND_COLORS.PURPLE} barStyle="light-content" />
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Community Challenge</Text>
                <TouchableOpacity
                  style={styles.modalCloseBtn}
                  onPress={() => setChallengeModalVisible(false)}
                  accessibilityRole="button"
                  accessibilityLabel="Close Challenge Modal"
                >
                  <Icon name="x" size={24} color={BRAND_COLORS.YELLOW} />
                </TouchableOpacity>
              </View>
              <View style={styles.modalContent}>
                <Text style={styles.modalText}>Join or Start a Challenge</Text>
                <Text style={styles.modalSubText}>
                  Connect with others and stay motivated with group challenges!
                </Text>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={handleChallengeStart}
                  accessibilityRole="button"
                  accessibilityLabel="Start Challenge"
                >
                  <Text style={styles.actionButtonText}>Get Started</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          {/* Stop & Feedback Modal */}
          <Modal
            visible={isStopModalVisible}
            animationType="slide"
            transparent={true}
            onRequestClose={() => {
              if (!saving) {
                setIsStopModalVisible(false);
                setIsTimerPaused(false);      // resume
                setCountdownVisible(true);    // show timer popup again
              }
            }}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.feedbackModalContainer}>
                <Text style={styles.modalTitle}>Finish Exercise</Text>
                <Text style={styles.modalSubText}>
                  {activeInstance?.exerciseName || 'Workout'} • {formatMMSS(elapsedSec)}
                </Text>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Feedback</Text>
                  <TextInput
                    style={styles.multilineInput}
                    value={feedback}
                    onChangeText={setFeedback}
                    placeholder="How did it feel? Any difficulty?"
                    placeholderTextColor="rgba(255,255,255,0.6)"
                    multiline
                    numberOfLines={3}
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Notes</Text>
                  <TextInput
                    style={styles.multilineInput}
                    value={notes}
                    onChangeText={setNotes}
                    placeholder="Add any notes for your trainer"
                    placeholderTextColor="rgba(255,255,255,0.6)"
                    multiline
                    numberOfLines={3}
                  />
                </View>

                <View style={styles.modalButtonContainer}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => {
                      if (!saving) {
                        setIsStopModalVisible(false);
                        setIsTimerPaused(false);   // RESUME on cancel
                        setCountdownVisible(true); // show popup again
                      }
                    }}
                    disabled={saving}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.actionButton, saving && { opacity: 0.7 }]}
                    onPress={confirmStopAndSave}
                    disabled={saving}
                  >
                    {saving ? <ActivityIndicator color="#3c1361" /> : <Text style={styles.actionButtonText}>Save</Text>}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        </LinearGradient>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: LIGHT_PURPLE,
  },
  gradient: {
    flex: 1,
  },
  header: {
    paddingTop: 56,
    paddingHorizontal: 28, // Increased for more breathing room
    paddingBottom: 0,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 18,
    paddingBottom: 18,
  },
  headerLeft: {
    flex: 1,
    justifyContent: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconBtn: {
    marginLeft: 12,
    padding: 10,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  headerIconBtnRight: {
    marginLeft: 8,
  },
  greeting: {
    color: '#FFD54F',
    fontSize: 24, // Larger greeting
    fontWeight: '700',
    marginBottom: 2,
    letterSpacing: 0.2,
  },
  userName: {
    color: '#fff',
    fontSize: 16, // Smaller user name
    fontWeight: '500',
    letterSpacing: 0.2,
    marginBottom: 2,
  },
  content: {
    paddingHorizontal: 20, // Consistent horizontal padding
    paddingTop: 8,
    paddingBottom: 32,
  },
  statsContainer: {
    marginBottom: 32,
    marginTop: 8,
  },
  statsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  statsTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  statsBadge: {
    backgroundColor: UI_COLORS.OVERLAY_LIGHT,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: UI_COLORS.BORDER_LIGHT,
  },
  statsBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
    letterSpacing: 0.5,
  },
  statsMainCard: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 6,
    marginBottom: 18,
  },
  statsMainGradient: {
    paddingVertical: 28,
    paddingHorizontal: 28,
  },
  statsMainContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statsMainLeft: {
    flex: 1,
    paddingRight: 24,
  },
  statsMainNumber: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 10,
    letterSpacing: -0.05,
  },
  statsMainLabel: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 14,
    fontWeight: '500',
  },
  statsProgressBar: {
    height: 8,
    backgroundColor: UI_COLORS.OVERLAY_LIGHT,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 14,
  },
  statsProgressFill: {
    height: '100%',
    backgroundColor: BRAND_COLORS.YELLOW,
    borderRadius: 4,
  },
  statsProgressText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '400',
    marginBottom: 0,
  },
  statsMainRight: {
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    marginLeft: 20,
  },
  statsMainSubtitle: {
    fontSize: 12,
    color: BRAND_COLORS.YELLOW,
    fontWeight: '700',
    letterSpacing: 0.3,
    textAlign: 'right',
    marginTop: 10,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    marginTop: 10,
    gap: 10,
  },
  statCard: {
    backgroundColor: UI_COLORS.OVERLAY_LIGHT,
    borderRadius: 14,
    padding: 18,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: UI_COLORS.BORDER_LIGHT,
    width: (width - 56) / 2,
    minHeight: 120,
    alignItems: 'center',
  },
  statCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    width: '100%',
  },
  statCardTrend: {
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    borderRadius: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.2)',
  },
  statCardTrendText: {
    fontSize: 11,
    color: STATUS_COLORS.SUCCESS,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    fontWeight: '500',
    marginBottom: 10,
  },
  statCardProgress: {
    height: 4,
    backgroundColor: UI_COLORS.BORDER_LIGHT,
    borderRadius: 2,
    overflow: 'hidden',
    width: '100%',
  },
  statCardProgressFill: {
    height: '100%',
    backgroundColor: BRAND_COLORS.YELLOW,
    borderRadius: 2,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  seeAllText: {
    color: BRAND_COLORS.YELLOW,
    fontSize: 15,
    fontWeight: '600',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  emptyText: {
    color: 'rgba(255,255,255,0.6)',
    fontStyle: 'italic',
    marginTop: 10,
    textAlign: 'center',
  },
  workoutCard: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 14,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#6B4E8C',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  completedWorkout: {
    backgroundColor: UI_COLORS.OVERLAY_LIGHT,
    borderWidth: 2,
    borderColor: STATUS_COLORS.SUCCESS,
  },
  workoutName: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 17,
    marginBottom: 2,
    textAlignVertical: 'center',
  },
  workoutMeta: {
    color: '#FFD600',
    fontWeight: '600',
    marginTop: 2,
    fontSize: 13,
  },
  workoutInstruction: {
    color: 'rgba(255,255,255,0.85)',
    marginTop: 8,
    lineHeight: 18,
    fontSize: 13,
  },
  completedContainer: {
    marginTop: 10,
    alignSelf: 'flex-end',
    backgroundColor: STATUS_COLORS.SUCCESS,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  completedText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
  quickActionsContainer: {
    marginBottom: 32,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 10,
    gap: 10,
  },
  quickActionCard: {
    backgroundColor: UI_COLORS.OVERLAY_LIGHT,
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    width: (width - 56) / 2,
    minHeight: 120,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: UI_COLORS.BORDER_LIGHT,
  },
  quickActionText: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 10,
  },
  quickActionSubText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 4,
    textAlign: 'center',
  },
  motivationContainer: {
    backgroundColor: UI_COLORS.OVERLAY_LIGHT,
    borderRadius: 14,
    padding: 24,
    marginBottom: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: UI_COLORS.BORDER_LIGHT,
  },
  motivationText: {
    fontSize: 17,
    color: '#FFFFFF',
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 10,
    lineHeight: 22,
  },
  motivationAuthor: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '400',
    textAlign: 'center',
    textAlignVertical: 'center',
  },
  motivationLoading: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  motivationLoadingText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 8,
  },
  countdownRoot: {
    flex: 1,
    backgroundColor: LIGHT_PURPLE,
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  countdownTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 30,
  },
  countdownCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseWrap: {
    width: 260,
    height: 260,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  timeText: {
    fontSize: 54,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  timeSubText: {
    marginTop: 10,
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '600',
  },
  countdownFooter: {
    paddingTop: 10,
  },
  countdownBackBtn: {
    alignSelf: 'center',
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 10,
    backgroundColor: BRAND_COLORS.PURPLE,
  },
  countdownBackTxt: {
    color: BRAND_COLORS.YELLOW,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  floatingCalendarBtn: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: BRAND_COLORS.PURPLE,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  calendarModal: {
    flex: 1,
    backgroundColor: LIGHT_PURPLE,
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  calendarTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
  },
  calendarNavBtn: {
    padding: 8,
  },
  calendarCloseBtn: {
    padding: 8,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  calendarDayName: {
    width: width / 7 - 10,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 10,
    marginHorizontal: 1,
  },
  calendarDay: {
    width: width / 7 - 10,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    marginHorizontal: 1,
    borderRadius: 4,
  },
  calendarDayToday: {
    borderWidth: 2,
    borderColor: BRAND_COLORS.YELLOW,
  },
  calendarDayScheduled: {
    backgroundColor: BRAND_COLORS.YELLOW,
  },
  calendarDayText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  calendarDayTextToday: {
    color: BRAND_COLORS.YELLOW,
    fontWeight: '700',
  },
  calendarDayTextScheduled: {
    color: BRAND_COLORS.PURPLE,
    fontWeight: '700',
  },
  scheduleModal: {
    flex: 1,
    backgroundColor: LIGHT_PURPLE,
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  scheduleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  scheduleTitleContainer: {
    flex: 1,
    marginRight: 16,
  },
  scheduleTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  scheduleSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '500',
  },
  scheduleCloseBtn: {
    padding: 8,
  },
  scheduleContent: {
    flex: 1,
  },
  scheduleItem: {
    backgroundColor: UI_COLORS.OVERLAY_LIGHT,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: UI_COLORS.BORDER_LIGHT,
  },
  scheduleItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  scheduleTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scheduleItemTime: {
    fontSize: 14,
    fontWeight: '600',
    color: BRAND_COLORS.YELLOW,
    marginLeft: 6,
  },
  scheduleItemName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlignVertical: 'center',
  },
  scheduleItemDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 12,
    lineHeight: 20,
  },
  scheduleItemDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  scheduleDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginBottom: 8,
  },
  scheduleDetailText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
    marginLeft: 6,
    fontWeight: '500',
  },
  scheduleNotesContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: BRAND_COLORS.YELLOW,
  },
  scheduleNotesLabel: {
    fontSize: 12,
    color: BRAND_COLORS.YELLOW,
    fontWeight: '600',
    marginBottom: 4,
  },
  scheduleNotesText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 18,
  },
  scheduleEmptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  scheduleEmptyText: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  scheduleEmptySubtext: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
    lineHeight: 20,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: LIGHT_PURPLE,
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalCloseBtn: {
    padding: 8,
  },
  modalContent: {
    flex: 1,
    alignItems: 'center',
  },
  modalText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 20,
  },
  modalSubText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginTop: 10,
  },
  optionButton: {
    backgroundColor: UI_COLORS.OVERLAY_LIGHT,
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    width: '100%',
    alignItems: 'center',
  },
  optionButtonSelected: {
    backgroundColor: BRAND_COLORS.YELLOW,
  },
  optionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  progressBar: {
    height: 10,
    backgroundColor: UI_COLORS.BORDER_LIGHT,
    borderRadius: 5,
    width: '100%',
    marginBottom: 20,
  },
  progressFill: {
    height: '100%',
    backgroundColor: BRAND_COLORS.YELLOW,
    borderRadius: 5,
  },
  actionButton: {
    backgroundColor: BRAND_COLORS.YELLOW,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginTop: 20,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: BRAND_COLORS.PURPLE,
  },
  todayWorkoutItem: { marginBottom: 12, padding: 12, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)' },
  todayWorkoutTitle: { color: '#fff', fontSize: 16, fontWeight: '600', marginBottom: 8, textAlignVertical: 'center' },
  timerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  timerText: { color: '#FFD54F', fontSize: 18, fontVariant: ['tabular-nums'] },
  timerBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, backgroundColor: '#FFD54F' },
  startBtn: { alignSelf: 'flex-start' },
  stopBtn: {},
  timerBtnText: { color: '#3c1361', fontWeight: '700' },

  feedbackModalContainer: { margin: 24, borderRadius: 16, padding: 16, backgroundColor: '#2a1553' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  modalTitle: { color: '#FFD54F', fontSize: 18, fontWeight: '700', marginBottom: 6 },
  modalSubText: { color: '#fff', opacity: 0.85, marginBottom: 12 },
  fieldGroup: { marginBottom: 12 },
  fieldLabel: { color: '#fff', opacity: 0.8, marginBottom: 6 },
  multilineInput: {
    minHeight: 72,
    borderRadius: 10,
    padding: 12,
    color: '#fff',
    backgroundColor: 'rgba(255,255,255,0.08)',
    textAlignVertical: 'top',
  },
  modalButtonContainer: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 6 },
  modalButton: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, marginLeft: 10 },
  cancelButton: { backgroundColor: 'rgba(255,255,255,0.08)' },
  cancelButtonText: { color: '#fff' },
  actionButton: { backgroundColor: '#FFD54F' },
  actionButtonText: { color: '#3c1361', fontWeight: '700' },
  notificationBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FF5252',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    paddingHorizontal: 3,
  },
  notificationBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
});