import { Feather } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';
import { Text, useTheme } from '@/shared/ui';
import { usePcUpload } from './usePcUpload';

type Props = { visible: boolean; onClose: () => void };

/**
 * Экран «Загрузка с ПК»: поднимает сервер, пока открыт (см. usePcUpload — старт/стоп на mount/unmount).
 * Смонтирован только пока visible === true, чтобы сервер не жил дольше, чем нужно.
 */
export function PcUploadSheet({ visible, onClose }: Props) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="fullScreen">
      {visible ? <PcUploadContent onClose={onClose} /> : null}
    </Modal>
  );
}

function PcUploadContent({ onClose }: { onClose: () => void }) {
  const { colors: c } = useTheme();
  const { phase, connection, transferring, errorMessage, received } = usePcUpload();

  const url = connection ? `http://${connection.ip}:${connection.port}/?pin=${connection.pin}` : '';
  const addressLabel = connection ? `${connection.ip}:${connection.port}` : '';

  const copyAddress = () => {
    if (addressLabel) void Clipboard.setStringAsync(`http://${addressLabel}`);
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: c.bg }]} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.header}>
        <Text variant="cardTitle" color={c.text}>
          Загрузка с ПК
        </Text>
        <Pressable hitSlop={10} onPress={onClose}>
          <Feather name="x" size={24} color={c.text} />
        </Pressable>
      </View>
      <View style={[styles.divider, { backgroundColor: c.divider }]} />

      <ScrollView contentContainerStyle={styles.scroll}>
        {phase === 'starting' ? (
          <View style={styles.center}>
            <ActivityIndicator color={c.accent} />
            <Text variant="row" color={c.textMuted} style={styles.centerText}>
              Запускаем сервер…
            </Text>
          </View>
        ) : null}

        {phase === 'no-wifi' ? (
          <View style={styles.center}>
            <Feather name="wifi-off" size={40} color={c.subtle} />
            <Text variant="cardTitle" color={c.text} style={styles.centerText}>
              Подключите Wi-Fi
            </Text>
            <Text variant="row" color={c.textMuted} style={styles.centerText}>
              ПК и телефон должны быть в одной сети — сейчас телефон не подключён к Wi-Fi.
            </Text>
          </View>
        ) : null}

        {phase === 'error' ? (
          <View style={styles.center}>
            <Feather name="alert-triangle" size={40} color={c.danger} />
            <Text variant="cardTitle" color={c.text} style={styles.centerText}>
              Не удалось запустить сервер
            </Text>
            {errorMessage ? (
              <Text variant="row" color={c.textMuted} style={styles.centerText}>
                {errorMessage}
              </Text>
            ) : null}
          </View>
        ) : null}

        {phase === 'running' && connection ? (
          <>
            <View style={[styles.card, { backgroundColor: c.surface }]}>
              <Text variant="kicker" color={c.accent}>
                Адрес в браузере ПК
              </Text>
              <Pressable onPress={copyAddress} style={styles.addressRow}>
                <Text variant="playerTitle" color={c.text} plain>
                  {addressLabel}
                </Text>
                <Feather name="copy" size={18} color={c.accent} />
              </Pressable>

              <View style={styles.qrRow}>
                <View style={[styles.qrBox, { borderColor: c.divider }]}>
                  <QRCode value={url} size={132} backgroundColor="transparent" color={c.text} />
                </View>
                <View style={styles.pinBlock}>
                  <Text variant="kicker" color={c.accent}>
                    PIN
                  </Text>
                  <Text variant="displayLarge" color={c.text} plain style={styles.pinText}>
                    {connection.pin}
                  </Text>
                  <Text variant="meta" color={c.textMuted}>
                    Сканируйте QR — вход не потребуется, или введите PIN вручную на странице.
                  </Text>
                </View>
              </View>
            </View>

            {transferring ? (
              <View style={styles.transferRow}>
                <ActivityIndicator color={c.accent} />
                <Text variant="row" color={c.text}>
                  Идёт передача…
                </Text>
              </View>
            ) : null}

            {errorMessage ? (
              <Text variant="row" color={c.danger} style={{ marginTop: 8 }}>
                {errorMessage}
              </Text>
            ) : null}

            <Text variant="kicker" color={c.accent} style={styles.logKicker}>
              Принято · {received.length}
            </Text>
            {received.length === 0 ? (
              <Text variant="row" color={c.subtle}>
                Пока ничего не пришло. Экран можно оставить открытым — книги можно закидывать одну за другой.
              </Text>
            ) : (
              received.map((r) => (
                <View key={r.id} style={[styles.logItem, { borderBottomColor: c.hairline }]}>
                  <View style={{ flex: 1 }}>
                    <Text variant="row" color={c.text} weight="700" numberOfLines={1}>
                      {r.title}
                    </Text>
                    <Text variant="meta" color={c.textMuted}>
                      {r.chapters} файл(ов)
                    </Text>
                    {r.skipped.length > 0 ? (
                      <Text variant="meta" color={c.danger} style={{ marginTop: 2 }}>
                        Пропущено (формат не поддержан): {r.skipped.join(', ')}
                      </Text>
                    ) : null}
                  </View>
                  <Text variant="meta" color={c.accentOnLightText}>
                    Добавлена
                  </Text>
                </View>
              ))
            )}
          </>
        ) : null}
      </ScrollView>
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
  scroll: { padding: 16, gap: 16 },
  center: { alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 48 },
  centerText: { textAlign: 'center' },
  card: { borderRadius: 12, padding: 16, gap: 12 },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qrRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 4 },
  qrBox: { padding: 10, borderRadius: 10, borderWidth: 1 },
  pinBlock: { flex: 1, gap: 2 },
  pinText: { letterSpacing: 4 },
  transferRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: -4 },
  logKicker: { marginTop: 4 },
  logItem: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, borderBottomWidth: 1 },
});
