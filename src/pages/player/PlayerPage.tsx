import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SleepModal } from '@/features/sleep-timer';
import { usePlayerTheme } from '@/shared/ui';
import { NowPlaying } from '@/widgets/now-playing';

export function PlayerPage() {
  const P = usePlayerTheme();
  const [sleepOpen, setSleepOpen] = useState(false);

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: P.bg }]} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.body}>
        <NowPlaying onOpenSleep={() => setSleepOpen(true)} />
      </View>
      <SleepModal visible={sleepOpen} onClose={() => setSleepOpen(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  body: { flex: 1, paddingBottom: 8 },
});
