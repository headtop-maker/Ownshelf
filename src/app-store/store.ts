import AsyncStorage from '@react-native-async-storage/async-storage';
import { combineReducers, configureStore } from '@reduxjs/toolkit';
import {
  FLUSH,
  PAUSE,
  PERSIST,
  persistReducer,
  persistStore,
  PURGE,
  REGISTER,
  REHYDRATE,
} from 'redux-persist';
import { libraryReducer } from '@/entities/book';
import { playbackReducer } from '@/entities/playback';
import { settingsReducer } from '@/entities/settings';

const rootReducer = combineReducers({
  library: libraryReducer,
  playback: playbackReducer,
  settings: settingsReducer,
});

const persistConfig = {
  key: 'root',
  version: 1,
  storage: AsyncStorage,
  // Персистим всё: библиотеку (с прогрессом), плеер (rate/позиция) и настройки.
  // Транзиентные поля playback (status/sleep) сбрасываются экшеном resetTransient после регидратации.
  whitelist: ['library', 'playback', 'settings'],
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // redux-persist использует несериализуемые экшены — игнорируем их в проверке.
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

export const persistor = persistStore(store);
