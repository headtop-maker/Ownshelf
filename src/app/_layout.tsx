import {
  GolosText_400Regular,
  GolosText_600SemiBold,
  GolosText_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/golos-text';
import { Stack, usePathname, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { ActivityIndicator, AppState, type AppStateStatus, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { persistor, store, useAppSelector, useAppStore } from '@/app-store';
import { PlayerProvider } from '@/features/player-controls';
import { ThemeModeProvider, useTheme } from '@/shared/ui';

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    GolosText_400Regular,
    GolosText_600SemiBold,
    GolosText_800ExtraBold,
  });

  if (!fontsLoaded) return <BootSplash />;

  return (
    <Provider store={store}>
      <PersistGate loading={<BootSplash />} persistor={persistor}>
        <SafeAreaProvider>
          <AppShell />
        </SafeAreaProvider>
      </PersistGate>
    </Provider>
  );
}

function AppShell() {
  const themePref = useAppSelector((s) => s.settings.theme);

  return (
    <ThemeModeProvider pref={themePref}>
      <PlayerProvider>
        <ThemedChrome />
        <OpenPlayerOnResume />
      </PlayerProvider>
    </ThemeModeProvider>
  );
}

/**
 * Открывает экран плеера при возврате приложения на передний план, если играет книга.
 * Так тап по системному медиа-уведомлению (expo-audio не даёт события тапа) ведёт в плеер.
 */
function OpenPlayerOnResume() {
  const router = useRouter();
  const pathname = usePathname();
  const appStore = useAppStore();
  const appState = useRef<AppStateStatus>(AppState.currentState);
  const pathnameRef = useRef(pathname);
  const didColdOpen = useRef(false);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  // Холодный старт: если восстановлена активная книга — один раз открыть плеер.
  useEffect(() => {
    if (didColdOpen.current) return;
    didColdOpen.current = true;
    const pb = appStore.getState().playback;
    const book = pb.bookId ? appStore.getState().library.books[pb.bookId] : undefined;
    if (book) {
      const id = setTimeout(() => router.navigate('/player'), 0);
      return () => clearTimeout(id);
    }
  }, [appStore, router]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      const prev = appState.current;
      appState.current = next;
      if (next !== 'active' || !/inactive|background/.test(prev)) return;
      const pb = appStore.getState().playback;
      if (pb.bookId && pb.status !== 'idle' && pathnameRef.current !== '/player') {
        router.navigate('/player');
      }
    });
    return () => sub.remove();
  }, [appStore, router]);

  return null;
}

function ThemedChrome() {
  const t = useTheme();
  return (
    <>
      <StatusBar style={t.name === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: t.colors.bg },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="book/[id]" />
        <Stack.Screen name="player" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="settings" />
        <Stack.Screen name="storage" />
      </Stack>
    </>
  );
}

function BootSplash() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FBFAF9' }}>
      <ActivityIndicator color="#EC3013" />
    </View>
  );
}
