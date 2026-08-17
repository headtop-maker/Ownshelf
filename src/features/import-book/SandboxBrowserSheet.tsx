import { Feather, Ionicons } from '@expo/vector-icons';
import type { Directory, File } from 'expo-file-system';
import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { isImageFile } from '@/shared/lib/files';
import { Button, Checkbox, Text, useTheme } from '@/shared/ui';
import { useSandboxBrowser } from './useSandboxBrowser';

type Props = { visible: boolean; onClose: () => void };

type Row = { kind: 'folder'; dir: Directory } | { kind: 'file'; file: File };

/**
 * Браузер файлов песочницы приложения: навигация по папкам, множественный выбор аудио/картинок
 * (можно набрать файлы из разных подпапок в один набор), сборка книги по кнопке снизу.
 */
export function SandboxBrowserSheet({ visible, onClose }: Props) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="fullScreen">
      {visible ? <SandboxBrowserContent onClose={onClose} /> : null}
    </Modal>
  );
}

function SandboxBrowserContent({ onClose }: { onClose: () => void }) {
  const { colors: c } = useTheme();
  const browser = useSandboxBrowser();
  const { breadcrumb, canGoBack, folders, files, selected, enter, back, toggle, reset, submit, busy } = browser;

  const rows: Row[] = [...folders.map((dir) => ({ kind: 'folder' as const, dir })), ...files.map((file) => ({ kind: 'file' as const, file }))];

  const close = () => {
    reset();
    onClose();
  };

  const add = async () => {
    const book = await submit();
    if (book) close();
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: c.bg }]} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.header}>
        <Text variant="cardTitle" color={c.text}>
          Файлы в песочнице
        </Text>
        <Pressable hitSlop={10} onPress={close}>
          <Feather name="x" size={24} color={c.text} />
        </Pressable>
      </View>
      <View style={[styles.divider, { backgroundColor: c.divider }]} />

      <View style={styles.breadcrumbRow}>
        {canGoBack ? (
          <Pressable hitSlop={8} onPress={back} style={styles.backBtn}>
            <Feather name="chevron-left" size={18} color={c.accent} />
          </Pressable>
        ) : null}
        <Text variant="meta" color={c.textMuted} numberOfLines={1} style={{ flex: 1 }}>
          {breadcrumb.join(' / ')}
        </Text>
      </View>

      {rows.length === 0 ? (
        <View style={styles.empty}>
          <Feather name="folder" size={40} color={c.subtle} />
          <Text variant="row" color={c.subtle} style={{ textAlign: 'center' }}>
            Здесь нет файлов, которые ещё не стали книгой.
          </Text>
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(row) => (row.kind === 'folder' ? `d:${row.dir.uri}` : `f:${row.file.uri}`)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) =>
            item.kind === 'folder' ? (
              <Pressable onPress={() => enter(item.dir)} style={[styles.row, { borderBottomColor: c.hairline }]}>
                <Ionicons name="folder-outline" size={20} color={c.subtle} style={styles.rowIcon} />
                <Text variant="row" color={c.text} weight="600" numberOfLines={1} style={{ flex: 1 }}>
                  {item.dir.name}
                </Text>
                <Feather name="chevron-right" size={18} color={c.subtle} />
              </Pressable>
            ) : (
              <Pressable
                onPress={() => toggle(item.file.uri, item.file.name)}
                style={[styles.row, { borderBottomColor: c.hairline }]}
              >
                <Ionicons
                  name={isImageFile(item.file.name) ? 'image-outline' : 'musical-notes-outline'}
                  size={20}
                  color={c.subtle}
                  style={styles.rowIcon}
                />
                <Text variant="row" color={c.text} numberOfLines={1} style={{ flex: 1 }}>
                  {item.file.name}
                </Text>
                <Checkbox checked={selected.has(item.file.uri)} onToggle={() => toggle(item.file.uri, item.file.name)} />
              </Pressable>
            )
          }
        />
      )}

      <View style={[styles.footer, { borderTopColor: c.divider }]}>
        {busy ? (
          <ActivityIndicator color={c.accent} />
        ) : (
          <Button
            title={`Добавить как книгу (${selected.size})`}
            onPress={() => void add()}
            disabled={selected.size === 0}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  divider: { height: 1, marginHorizontal: 16 },
  breadcrumbRow: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 12, paddingVertical: 10 },
  backBtn: { padding: 4 },
  list: { paddingHorizontal: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: 1 },
  rowIcon: { width: 20 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 32 },
  footer: { padding: 16, borderTopWidth: 1 },
});
