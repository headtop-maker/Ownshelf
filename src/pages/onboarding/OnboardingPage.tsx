import { useRouter } from 'expo-router';
import { Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppDispatch } from '@/app-store';
import { setOnboardingSeen } from '@/entities/settings';
import { useImportBook } from '@/features/import-book';
import { Button, Screen, Text, useTheme } from '@/shared/ui';

const STEPS = [
  'Выбери файлы или папку с аудиокнигой — они остаются на телефоне, без облака',
  'Играет в фоне и с экрана блокировки — как в любом плеере',
  'Место в каждом файле запоминается отдельно — ничего не потеряется',
];

/**
 * Первый экран приложения: объясняет офлайн-модель и ведёт к выбору файлов.
 * Показывается один раз, флаг — `settings.onboardingSeen` (см. `src/app/index.tsx`).
 */
export function OnboardingPage() {
  const t = useTheme();
  const c = t.colors;
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { importFiles, importFolder, busy } = useImportBook();

  const finish = () => {
    dispatch(setOnboardingSeen(true));
    router.replace('/');
  };

  // Android: SAF-выбор папки. iOS папку выбрать нельзя (importFolder() там только показывает Alert) —
  // предлагаем реально рабочее действие, мультивыбор файлов.
  const primaryLabel = Platform.OS === 'android' ? 'Выбрать папку' : 'Выбрать файлы';
  const primaryAction = async () => {
    const book = Platform.OS === 'android' ? await importFolder() : await importFiles();
    if (book) finish();
  };

  return (
    <Screen edges={['top', 'left', 'right']}>
      <View style={[styles.hero, { backgroundColor: c.accent }]}>
        <Text variant="kicker" color={c.accentText} style={{ opacity: 0.85 }}>
          Офлайн-плеер · без аккаунтов
        </Text>
        <Text variant="displayLarge" color={c.accentText} style={styles.title}>
          Слушай{'\n'}свои{'\n'}файлы
        </Text>
      </View>

      <View style={styles.steps}>
        {STEPS.map((step, i) => (
          <View key={step} style={[styles.stepRow, { borderBottomColor: c.hairline }]}>
            <Text variant="kicker" color={c.accent} style={styles.stepNum}>
              {String(i + 1).padStart(2, '0')}
            </Text>
            <Text variant="row" color={c.text} style={styles.stepText}>
              {step}
            </Text>
          </View>
        ))}
      </View>

      <View style={[styles.actions, { paddingBottom: insets.bottom + 16 }]}>
        <Button title={primaryLabel} align="left" loading={busy} onPress={() => void primaryAction()} />
        <Button title="Пропустить" variant="secondary" align="left" onPress={finish} style={{ marginTop: 10 }} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { paddingTop: 28, paddingHorizontal: 20, paddingBottom: 24, gap: 10 },
  title: { marginTop: 2 },
  steps: { paddingHorizontal: 20 },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  stepNum: { width: 22 },
  stepText: { flex: 1 },
  actions: { marginTop: 'auto', paddingHorizontal: 20 },
});
