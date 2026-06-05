import React, { createContext, useContext, useReducer, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { INITIAL_PROGRESS } from '../data/workoutData';
import { generateWorkoutPlan } from '../utils/workoutGenerator';

const AppContext = createContext(null);
const STORAGE_KEY = '@fitforge_v3';

const defaultState = {
  apiKey: '',
  isOnboarded: false,
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
