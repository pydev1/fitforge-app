export const colors = {
  // ── IRON & PATINA — graphite + oxidised copper ───────────────────────────
  // Background depth tiers (warm graphite, not blue-black)
  bg: '#15171B',           // page canvas
  surface: '#1E2126',      // subtle surface / section fills
  card: '#262A30',         // elevated cards
  cardHigh: '#2E333A',     // highest surface
  ctaCard: '#1B1E23',      // CTA card — kept dark so accent pops

  // Hero card — elevated graphite feature panel
  heroCard: '#1E2126',
  heroCardBorder: 'rgba(217,143,92,0.18)',
  heroCardDeep: '#15171B',
  heroCardDeepAlt: '#15171B',

  // Text on the hero card
  heroText: '#ECE9E2',
  heroTextSec: '#C8C5BD',
  heroTextMuted: '#9B9E9F',

  // Text on dark surfaces (warm chalk-white family)
  text: '#ECE9E2',
  textSec: '#9B9E9F',
  textMuted: '#6B6E71',

  // Stat highlight tile
  statCard: '#2E8E7D',
  statCardBorder: '#256F62',

  // Action colour — COPPER. Buttons / active / pips / rings ONLY, never bg.
  accent: '#D98F5C',
  accentLight: '#E3A876',
  onAccent: '#1A1410',     // text + icons that sit ON the copper accent

  // Supporting
  border: 'rgba(236,233,226,0.10)',
  borderSubtle: 'rgba(236,233,226,0.06)',
  success: '#4FB8A6',      // patina — positive / "easy" signal
  warning: '#D9A441',
  info: '#4FB8A6',
  white: '#FFFFFF',

  // Keep legacy aliases so untouched screens don't break
  accentDim: 'rgba(217,143,92,0.12)',
  secondary: '#B24A3D',    // rust — negative / "tough" signal
  secondaryDim: 'rgba(178,74,61,0.18)',
};
