import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet } from 'react-native';
import { useTheme } from './theme';

type Props = {
  checked: boolean;
  onToggle: () => void;
  /** Явный цвет заливки при checked (иначе — accent). */
  color?: string;
};

/** Простой квадратный чекбокс: пустой контур / заливка + галочка. */
export function Checkbox({ checked, onToggle, color }: Props) {
  const t = useTheme();
  const fill = color ?? t.colors.accent;
  return (
    <Pressable
      hitSlop={8}
      onPress={onToggle}
      style={[
        styles.box,
        { borderColor: checked ? fill : t.colors.divider, backgroundColor: checked ? fill : 'transparent' },
      ]}
    >
      {checked ? <Ionicons name="checkmark" size={14} color={t.colors.accentText} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
});
