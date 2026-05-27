import React, { createContext, useContext, useReducer, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { INITIAL_PROGRESS, USER_PROFILE } from '../data/workoutData';

const AppContext = createContext(null);
const STORAGE_KEY = '@fitforge_v2';

const defaultState = {
  apiKey: '',
  userName: USER_PROFILE.name,
  userProfile: {
    height: USER_PROFILE.height,
    weight: USER_PROFILE.weight,
    waist: USER_PROFILE.waist,
  },
  progress: INITIAL_PROGRESS,
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
    case 'SET_USER_NAME':
      return { ...state, userName: action.payload };
    case 'UPDATE_PROFILE':
      return { ...state, userProfile: { ...state.userProfile, ...action.payload } };
    case 'LOG_WEIGHT':
      return {
        ...state,
        progress: {
          ...state.progress,
          weight: [...state.progress.weight, action.payload],
        },
      };
    case 'LOG_WAIST':
      return {
        ...state,
        progress: {
          ...state.progress,
          waist: [...state.progress.waist, action.payload],
        },
      };
    case 'LOG_WORKOUT':
      return {
        ...state,
        progress: {
          ...state.progress,
          completedWorkouts: [...state.progress.completedWorkouts, action.payload],
        },
      };
    case 'ADD_MESSAGE':
      return { ...state, chatHistory: [...state.chatHistory, action.payload] };
    case 'CLEAR_CHAT':
      return { ...state, chatHistory: [] };
    default:
      return state;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, defaultState);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const saved = JSON.parse(raw);
          dispatch({ type: 'HYDRATE', payload: saved });
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
