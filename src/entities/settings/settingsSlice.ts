import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { DEFAULT_RATE, SKIP_SECONDS } from '@/shared/config/constants';

export type ThemePref = 'system' | 'light' | 'dark';

export type SettingsState = {
  defaultRate: number;
  skipSeconds: number;
  defaultSleepMinutes: number;
  theme: ThemePref;
  /** Продолжать с последней позиции при повторном открытии книги. */
  autoResume: boolean;
};

const initialState: SettingsState = {
  defaultRate: DEFAULT_RATE,
  skipSeconds: SKIP_SECONDS,
  defaultSleepMinutes: 15,
  theme: 'system',
  autoResume: true,
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    setDefaultRate(state, action: PayloadAction<number>) {
      state.defaultRate = action.payload;
    },
    setSkipSeconds(state, action: PayloadAction<number>) {
      state.skipSeconds = action.payload;
    },
    setDefaultSleepMinutes(state, action: PayloadAction<number>) {
      state.defaultSleepMinutes = action.payload;
    },
    setTheme(state, action: PayloadAction<ThemePref>) {
      state.theme = action.payload;
    },
    setAutoResume(state, action: PayloadAction<boolean>) {
      state.autoResume = action.payload;
    },
  },
});

export const {
  setDefaultRate,
  setSkipSeconds,
  setDefaultSleepMinutes,
  setTheme,
  setAutoResume,
} = settingsSlice.actions;

export const settingsReducer = settingsSlice.reducer;
