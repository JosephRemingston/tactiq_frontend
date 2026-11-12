import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { Depth } from '@/api/types';
import { persistStorage } from './storage';

export type ThemeMode = 'system' | 'light' | 'dark';

type SettingsState = {
  themeMode: ThemeMode;
  /** Local copy of the depth default; the server value (user.depthPreference) wins once loaded. */
  depth: Depth;
  /** Matches whose analysis this user has already confirmed opening this month: `${periodKey}:${matchId}`. */
  meteredOpened: string[];
  setThemeMode: (m: ThemeMode) => void;
  setDepth: (d: Depth) => void;
  markMetered: (key: string) => void;
};

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      themeMode: 'system',
      depth: 'quick',
      meteredOpened: [],
      setThemeMode: (themeMode) => set({ themeMode }),
      setDepth: (depth) => set({ depth }),
      markMetered: (key) => set((s) => ({ meteredOpened: s.meteredOpened.includes(key) ? s.meteredOpened : [...s.meteredOpened.slice(-200), key] })),
    }),
    { name: 'tactiq.settings', storage: persistStorage },
  ),
);
