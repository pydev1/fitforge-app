import React, { createContext, useContext, useReducer, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { INITIAL_PROGRESS } from '../data/workoutData';
import { generateWorkoutPlan } from '../utils/workoutGenerator';
import { addDays, DELOAD_LENGTH_DAYS } from '../utils/recovery';

const AppContext = createContext(null);
const STORAGE_KEY = '@fitforge_v3';

const defaultState = {
  apiKey: '',
  isOnboarded: false,
  // 'system' follows the phone's light/dark setting; or force 'light' / 'dark'.
  appearance: 'system',
  reminderEnabled: false,
  reminderHour: 19,
  userProfile: {
    name: '',
    gender: '',
    age: null,
    height: null,
    weight: null,
    waist: null,
    bodyType: '',
    fitnessLevel: 'beginner',
    goals: [],
    equipment: [],
    workoutDaysPerWeek: 4,
    restDays: ['Monday', 'Wednesday', 'Friday'],
    jobType: 'desk',
  },
  generatedPlan: null,
  progress: { ...INITIAL_PROGRESS, setLogs: [] },
  chatHistory: [],
  // Detraining restart: { date, weeksOff, factor, mode } or null. History and
  // measurements are never modified — this only eases suggested loads.
  restart: null,
  // Per-exercise substitutions, keyed by the original exercise id → new id.
  swaps: {},
  // Local date key we last dismissed the "welcome back" prompt on.
  restartSnoozedOn: null,
  // 'adaptive' = deload only when your logged sets say you need one (default);
  // 'scheduled' = the classic fixed deload every 4th week.
  deloadMode: 'adaptive',
  // Recovery weeks taken: [{ start, end?, reason }]. end is set if ended early.
  deloads: [],
  deloadSnoozedOn: null,
  // Travel mode: [{ start, end, kit, daysPerWeek }]. Days inside a trip pause
  // the programme week and swap in a short travel workout.
  trips: [],
  isLoaded: false,
};

function reducer(state, action) {
  switch (action.type) {
    case 'HYDRATE':
      return { ...state, ...action.payload, isLoaded: true };
    case 'SET_LOADED':
      return { ...state, isLoaded: true };
    case 'SET_API_KEY':
      return { ...state, apiKey: action.payload };
    case 'UPDATE_PROFILE':
      return { ...state, userProfile: { ...state.userProfile, ...action.payload } };
    case 'UPDATE_PROFILE_AND_PLAN': {
      const userProfile = { ...state.userProfile, ...action.payload };
      return {
        ...state,
        userProfile,
        generatedPlan: generateWorkoutPlan(userProfile),
      };
    }
    case 'COMPLETE_ONBOARDING':
      return {
        ...state,
        userProfile: action.payload.userProfile,
        generatedPlan: action.payload.generatedPlan,
        isOnboarded: true,
      };
    case 'REGENERATE_PLAN': {
      const userProfile = action.payload || state.userProfile;
      const plan = generateWorkoutPlan(userProfile);
      return { ...state, userProfile, generatedPlan: plan };
    }
    case 'LOG_WEIGHT':
      return {
        ...state,
        progress: {
          ...state.progress,
          weight: upsertByKey(state.progress.weight, action.payload, item => item.date),
        },
      };
    case 'LOG_WAIST':
      return {
        ...state,
        progress: {
          ...state.progress,
          waist: upsertByKey(state.progress.waist, action.payload, item => item.date),
        },
      };
    case 'REMOVE_WEIGHT':
      return {
        ...state,
        progress: {
          ...state.progress,
          weight: state.progress.weight.filter(w => w.date !== action.payload),
        },
      };
    case 'REMOVE_WAIST':
      return {
        ...state,
        progress: {
          ...state.progress,
          waist: state.progress.waist.filter(w => w.date !== action.payload),
        },
      };
    case 'LOG_WORKOUT':
      return {
        ...state,
        progress: {
          ...state.progress,
          completedWorkouts: upsertByKey(
            state.progress.completedWorkouts,
            action.payload,
            item => item.date,
          ),
        },
      };
    case 'LOG_SET':
      return {
        ...state,
        progress: {
          ...state.progress,
          setLogs: upsertByKey(
            state.progress.setLogs || [],
            action.payload,
            item => `${item.date}:${item.exerciseId}:${item.setNumber}`,
          ),
        },
      };
    case 'REMOVE_LOG_SET':
      return {
        ...state,
        progress: {
          ...state.progress,
          setLogs: (state.progress.setLogs || []).filter(
            item => `${item.date}:${item.exerciseId}:${item.setNumber}` !== action.payload,
          ),
        },
      };
    case 'RESTART_PROGRAM':
      // payload: { date, weeksOff, factor, mode }. Purely additive — no logs,
      // measurements, or completed workouts are removed.
      return { ...state, restart: action.payload, restartSnoozedOn: null };
    case 'CLEAR_RESTART':
      return { ...state, restart: null };
    case 'SNOOZE_RESTART':
      return { ...state, restartSnoozedOn: action.payload };
    case 'SET_APPEARANCE':
      return { ...state, appearance: action.payload };
    case 'SET_DELOAD_MODE':
      return { ...state, deloadMode: action.payload };
    case 'START_DELOAD':
      // payload: { start, reason }
      return {
        ...state,
        deloads: [...(state.deloads || []), action.payload],
        deloadSnoozedOn: null,
      };
    case 'END_DELOAD': {
      // payload: date key — ends the deload that is active on that date.
      const day = action.payload;
      return {
        ...state,
        deloads: (state.deloads || [])
          // A deload started today and ended today never happened — drop it.
          .filter(d => !(d.start === day && !d.end))
          .map(d => (d.start < day && !d.end && day < addDays(d.start, DELOAD_LENGTH_DAYS) ? { ...d, end: day } : d)),
      };
    }
    case 'SNOOZE_DELOAD':
      return { ...state, deloadSnoozedOn: action.payload };
    case 'SET_TRIP': {
      // payload: { trip, today }. Replaces any trip that is in progress or
      // still to come; finished trips stay so their days remain paused.
      const { trip, today } = action.payload;
      const kept = (state.trips || []).filter(t => t.end < today);
      return { ...state, trips: [...kept, trip].sort((a, b) => a.start.localeCompare(b.start)) };
    }
    case 'CANCEL_TRIP': {
      // payload: today. An upcoming trip is removed; one in progress ends
      // yesterday ("I'm back early") so the days already away stay paused.
      const today = action.payload;
      const yesterday = addDays(today, -1);
      const trips = (state.trips || [])
        .filter(t => !(t.start >= today))
        .map(t => (t.end >= today ? { ...t, end: yesterday } : t));
      return { ...state, trips };
    }
    case 'SET_SWAP': {
      // payload: { from, to }. to === null removes the swap.
      const swaps = { ...(state.swaps || {}) };
      if (action.payload.to == null) delete swaps[action.payload.from];
      else swaps[action.payload.from] = action.payload.to;
      return { ...state, swaps };
    }
    case 'SET_REMINDER':
      return { ...state, reminderEnabled: action.payload.enabled, reminderHour: action.payload.hour ?? state.reminderHour };
    case 'ADD_MESSAGE':
      return { ...state, chatHistory: [...state.chatHistory, action.payload] };
    case 'CLEAR_CHAT':
      return { ...state, chatHistory: [] };
    default:
      return state;
  }
}

function upsertByKey(items = [], nextItem, getKey) {
  const nextKey = getKey(nextItem);
  const existingIndex = items.findIndex(item => getKey(item) === nextKey);
  const nextItems = existingIndex >= 0
    ? items.map((item, index) => (index === existingIndex ? nextItem : item))
    : [...items, nextItem];
  return nextItems.sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')));
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, defaultState);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          dispatch({ type: 'HYDRATE', payload: JSON.parse(raw) });
        } else {
          dispatch({ type: 'SET_LOADED' });
        }
      } catch {
        dispatch({ type: 'SET_LOADED' });
      }
    })();
  }, []);

  useEffect(() => {
    if (!state.isLoaded) return;
    const { isLoaded, ...toSave } = state;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(toSave)).catch(() => {});
  }, [state]);

  return <AppContext.Provider value={{ state, dispatch }}>{children}</AppContext.Provider>;
}

export const useApp = () => useContext(AppContext);
