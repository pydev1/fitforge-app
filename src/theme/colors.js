import { Appearance } from 'react-native';

// ── FitForge "Daylight" theme ────────────────────────────────────────────────
// Clean Material-style surfaces, one confident blue for actions, and two ring
// colours (teal = training, blue = body goal) that recur everywhere data shows.
// Two palettes share the same token names, so every screen themes for free.
//
// `colors` is a single mutable object: applyTheme() swaps its values in place
// and the app remounts (see App.js), so `colors.x` and themed() styles always
// read the active palette.

const light = {
  bg: '#F6F8FC',            // page canvas — barely-blue paper
  surface: '#EEF1F6',       // section fills, inputs, tab bar track
  card: '#FFFFFF',          // cards
  cardHigh: '#F1F4F9',      // nested surfaces inside cards
  ctaCard: '#FFFFFF',

  heroCard: '#FFFFFF',
  heroCardBorder: '#E3E7EE',
  heroCardDeep: '#EEF1F6',
  heroCardDeepAlt: '#E6EAF1',

  heroText: '#1B1D21',
  heroTextSec: '#4A4F57',
  heroTextMuted: '#80868F',

  text: '#1B1D21',
  textSec: '#5C6168',
  textMuted: '#8D929A',

  statCard: '#00897B',
  statCardBorder: '#00796B',

  accent: '#2F6BEA',        // primary action blue
  accentLight: '#2457C5',   // blue used as TEXT on tinted backgrounds
  onAccent: '#FFFFFF',

  border: '#E3E7EE',
  borderSubtle: '#EDF0F5',
  success: '#12945A',
  warning: '#B86E00',
  info: '#00897B',
  white: '#FFFFFF',

  accentDim: '#E5EDFD',
  secondary: '#D23C2E',
  secondaryDim: '#FCE8E6',

  // New tokens
  ring1: '#00A693',         // training ring (teal)
  ring1Soft: '#D7F2EE',
  ring2: '#2F6BEA',         // body-goal ring (blue)
  ring2Soft: '#E1E9FC',
  successDim: '#E3F4EA',
  warningDim: '#FDF0D9',
  infoDim: '#DDF3F0',
  shadow: '#1B2A4A',
  overlay: 'rgba(15,20,30,0.45)',
  isDark: false,
};

const dark = {
  bg: '#0F1114',
  surface: '#191C20',
  card: '#1D2025',
  cardHigh: '#262A30',
  ctaCard: '#1D2025',

  heroCard: '#1D2025',
  heroCardBorder: '#2A2E35',
  heroCardDeep: '#16191D',
  heroCardDeepAlt: '#22262C',

  heroText: '#E9EBEF',
  heroTextSec: '#B4B9C1',
  heroTextMuted: '#80868F',

  text: '#E9EBEF',
  textSec: '#A9AEB6',
  textMuted: '#737981',

  statCard: '#00897B',
  statCardBorder: '#00796B',

  accent: '#4A80F0',
  accentLight: '#A9C4FB',
  onAccent: '#FFFFFF',

  border: '#2A2E35',
  borderSubtle: '#22262C',
  success: '#4CC38A',
  warning: '#F2B43C',
  info: '#3CC7B4',
  white: '#FFFFFF',

  accentDim: '#1D2B47',
  secondary: '#F28B82',
  secondaryDim: '#3A2524',

  ring1: '#2BC4AE',
  ring1Soft: '#163631',
  ring2: '#6E9BF5',
  ring2Soft: '#1F2B43',
  successDim: '#18332A',
  warningDim: '#3A3020',
  infoDim: '#163631',
  shadow: '#000000',
  overlay: 'rgba(0,0,0,0.6)',
  isDark: true,
};

// Every token except `overlay` is a 6-digit hex: screens add transparency by
// appending two hex digits (colors.accent + '40'), which rgba() would break.
export const palettes = { light, dark };

let activeScheme = Appearance.getColorScheme() === 'dark' ? 'dark' : 'light';
let version = 0;

export const colors = { ...palettes[activeScheme] };

export function applyTheme(scheme) {
  const next = scheme === 'dark' ? 'dark' : 'light';
  if (next === activeScheme) return false;
  activeScheme = next;
  Object.assign(colors, palettes[next]);
  version += 1;
  return true;
}

export function getThemeScheme() {
  return activeScheme;
}

export function getThemeVersion() {
  return version;
}
