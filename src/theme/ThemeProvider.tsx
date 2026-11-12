import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { useSettings } from '@/state/settings';
import { palettes, type Palette } from './tokens';

type ThemeValue = { c: Palette; isDark: boolean; reduceMotion: boolean };

const ThemeContext = createContext<ThemeValue>({ c: palettes.light, isDark: false, reduceMotion: false });

export function ThemeProvider({ children, force }: { children: ReactNode; force?: 'light' | 'dark' }) {
  const system = useColorScheme();
  const mode = useSettings((s) => s.themeMode);
  const reduceMotion = useReducedMotion();
  const name = force ?? (mode === 'system' ? (system === 'dark' ? 'dark' : 'light') : mode);
  const value = useMemo(() => ({ c: palettes[name], isDark: name === 'dark', reduceMotion }), [name, reduceMotion]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
