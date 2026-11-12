import { StyleSheet } from 'react-native';
import { getThemeVersion } from './colors';

// Wraps a style (or any colour-dependent object) factory so it is rebuilt
// whenever the theme changes. Reads look exactly like a normal StyleSheet —
// `s.card`, `{ ...CHART_CONFIG }`, `Object.keys(X)` — so screens don't need a
// hook in every sub-component.
function lazyThemed(factory, wrap) {
  let builtFor = -1;
  let cache = null;
  const current = () => {
    const v = getThemeVersion();
    if (v !== builtFor) {
      cache = wrap(factory());
      builtFor = v;
    }
    return cache;
  };
  return new Proxy({}, {
    get: (_, prop) => current()[prop],
    has: (_, prop) => prop in current(),
    ownKeys: () => Reflect.ownKeys(current()),
    getOwnPropertyDescriptor: (_, prop) => {
      const desc = Reflect.getOwnPropertyDescriptor(current(), prop);
      return desc ? { ...desc, configurable: true } : undefined;
    },
  });
}

// Android ignores fontWeight for custom fonts, so `fontWeight: '700'` would
// render as regular Roboto. Map weight (+ italic) onto the matching Roboto file
// and drop fontWeight. Styles that already name a font keep it.
const WEIGHT_FILE = {
  normal: '400Regular', 100: '400Regular', 200: '400Regular', 300: '400Regular', 400: '400Regular',
  500: '500Medium', 600: '600SemiBold', bold: '700Bold', 700: '700Bold', 800: '800ExtraBold', 900: '800ExtraBold',
};
const ITALIC_FILES = new Set(['400Regular', '700Bold']);

export function normalizeFont(style) {
  if (!style || typeof style !== 'object') return style;
  const { fontWeight, fontStyle, fontFamily } = style;
  if (fontFamily && !String(fontFamily).startsWith('Roboto_')) return style;
  if (fontWeight == null && fontStyle !== 'italic') return style;
  const file = WEIGHT_FILE[String(fontWeight ?? (fontFamily ? fontFamily.replace(/^Roboto_(\d+).*$/, '$1') : 400))] || '400Regular';
  const italic = fontStyle === 'italic' && ITALIC_FILES.has(file);
  const next = { ...style, fontFamily: `Roboto_${file}${italic ? '_Italic' : ''}` };
  delete next.fontWeight;
  if (italic) delete next.fontStyle;
  return next;
}

export function themedStyles(factory) {
  return lazyThemed(factory, obj => {
    const out = {};
    Object.keys(obj).forEach(k => { out[k] = normalizeFont(obj[k]); });
    return StyleSheet.create(out);
  });
}

export function themed(factory) {
  return lazyThemed(factory, obj => obj);
}
