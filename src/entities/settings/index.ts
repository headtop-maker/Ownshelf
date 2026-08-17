export * from './settingsSlice';
export const selectSettings = (s: { settings: import('./settingsSlice').SettingsState }) =>
  s.settings;
