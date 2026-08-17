import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useAppDispatch, useAppSelector } from '@/app-store';
import { selectBooks } from '@/entities/book';
import {
  selectSettings,
  setAutoResume,
  setDefaultRate,
  setDefaultSleepMinutes,
  setSkipSeconds,
  setTheme,
  type ThemePref,
} from '@/entities/settings';
import { SLEEP_OPTIONS, SPEED_PRESETS } from '@/shared/config/constants';
import { bookDirSize } from '@/shared/lib/bookStorage';
import { formatBytes } from '@/shared/lib/format';
import { Screen, Text, useTheme } from '@/shared/ui';

const PAD = 16;
const SKIP_CHOICES = [10, 15, 30, 45, 60];
const THEME_CHOICES: { key: ThemePref; label: string }[] = [
  { key: 'system', label: 'Система' },
  { key: 'light', label: 'Светлая' },
  { key: 'dark', label: 'Тёмная' },
];

/** Экран настроек «Modernist»: группы-сегменты + строки-переключатели. */
export function SettingsPage() {
  const { colors: c } = useTheme();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const s = useAppSelector(selectSettings);
  const books = useAppSelector(selectBooks);
  const storageSize = useMemo(() => books.reduce((sum, b) => sum + bookDirSize(b.id), 0), [books]);

  const fmtRate = (v: number) => v.toString().replace('.', ',') + '×';

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable hitSlop={12} onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="chevron-left" size={20} color={c.text} />
          <Text variant="cardTitle" color={c.text}>
            Настройки
          </Text>
        </Pressable>
        <Pressable hitSlop={12} onPress={() => router.back()}>
          <Text variant="navLabel" color={c.accent}>
            Готово
          </Text>
        </Pressable>
      </View>
      <View style={[styles.divider, { backgroundColor: c.divider }]} />

      <ScrollView contentContainerStyle={styles.scroll}>
        <Section title="Скорость по умолчанию">
          <Segments
            values={SPEED_PRESETS.map((v) => ({ key: v, label: fmtRate(v) }))}
            active={s.defaultRate}
            onPick={(v) => dispatch(setDefaultRate(v))}
          />
        </Section>

        <Section title="Шаг перемотки">
          <Segments
            values={SKIP_CHOICES.map((v) => ({ key: v, label: `${v} с` }))}
            active={s.skipSeconds}
            onPick={(v) => dispatch(setSkipSeconds(v))}
          />
        </Section>

        <Section title="Таймер сна по умолчанию">
          <Segments
            values={SLEEP_OPTIONS.map((v) => ({ key: v, label: `${v}` }))}
            active={s.defaultSleepMinutes}
            onPick={(v) => dispatch(setDefaultSleepMinutes(v))}
          />
        </Section>

        <Section title="Тема">
          <Segments
            values={THEME_CHOICES.map((th) => ({ key: th.key, label: th.label }))}
            active={s.theme}
            onPick={(v) => dispatch(setTheme(v as ThemePref))}
          />
        </Section>

        <Section title="Хранилище">
          <Pressable
            onPress={() => router.push('/storage')}
            style={[styles.storageRow, { backgroundColor: c.surface }]}
          >
            <View style={{ flex: 1 }}>
              <Text variant="row" color={c.text} weight="600">
                Управление книгами
              </Text>
              <Text variant="meta" color={c.textMuted}>
                {books.length} {books.length === 1 ? 'книга' : 'книг'} · {formatBytes(storageSize)}
              </Text>
            </View>
            <Feather name="chevron-right" size={18} color={c.subtle} />
          </Pressable>
        </Section>

        <View style={[styles.switchRow, { borderTopColor: c.hairline }]}>
          <View style={styles.switchText}>
            <Text variant="row" color={c.text} weight="600">
              Продолжать с последней позиции
            </Text>
            <Text variant="meta" color={c.textMuted}>
              Открывать книгу с того места, где остановились
            </Text>
          </View>
          <Switch
            value={s.autoResume}
            onValueChange={(v) => {
              dispatch(setAutoResume(v));
            }}
            trackColor={{ false: c.surfaceAlt, true: c.accent }}
            thumbColor={c.accentText}
            ios_backgroundColor={c.surfaceAlt}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const { colors: c } = useTheme();
  return (
    <View style={styles.section}>
      <Text variant="kicker" color={c.accent}>
        {title}
      </Text>
      {children}
    </View>
  );
}

/** Сегментированный ряд: 1px «решётка» на подложке divider, активный сегмент — fill accent. */
function Segments<T extends string | number>({
  values,
  active,
  onPick,
}: {
  values: { key: T; label: string }[];
  active: T;
  onPick: (v: T) => void;
}) {
  const { colors: c } = useTheme();
  return (
    <View style={[styles.segments, { backgroundColor: c.divider, borderColor: c.divider }]}>
      {values.map((v) => {
        const on = v.key === active;
        return (
          <Pressable
            key={String(v.key)}
            onPress={() => onPick(v.key)}
            style={[styles.seg, { backgroundColor: on ? c.accent : c.bg }]}
          >
            <Text variant="numeric" color={on ? c.accentText : c.textMuted}>
              {v.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: PAD,
    paddingTop: 8,
    paddingBottom: 12,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  divider: { height: 1, marginHorizontal: PAD },
  scroll: { padding: PAD, gap: 22 },
  section: { gap: 10 },
  segments: { flexDirection: 'row', flexWrap: 'wrap', gap: 1, borderRadius: 8, borderWidth: 1, overflow: 'hidden' },
  seg: { flexGrow: 1, flexBasis: '18%', paddingVertical: 10, alignItems: 'center', justifyContent: 'center' },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 14,
    borderTopWidth: 1,
  },
  switchText: { flex: 1, gap: 2 },
  storageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
});
