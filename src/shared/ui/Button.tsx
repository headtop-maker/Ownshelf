import { ActivityIndicator, Pressable, type PressableProps, StyleSheet, View } from 'react-native';
import { Text } from './Text';
import { useTheme, type ThemeName } from './theme';

type Props = Omit<PressableProps, 'children'> & {
  title: string;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'md' | 'sm';
  /** Выравнивание содержимого: 'left' — флеш-лефт по макету, 'center' — по центру (модалки). */
  align?: 'left' | 'center';
  loading?: boolean;
  themeOverride?: ThemeName;
};

/**
 * Кнопка «Modernist»: primary — заливка accent + тень, заголовок uppercase; secondary/ghost —
 * контур 1px divider; pressed — accentPressed / лёгкий тинт. Радиус 8, без обводок толще 1px.
 */
export function Button({
  title,
  variant = 'primary',
  size = 'md',
  align = 'center',
  loading,
  disabled,
  themeOverride,
  style,
  ...rest
}: Props) {
  const t = useTheme(themeOverride);
  const c = t.colors;
  const isFilled = variant === 'primary' || variant === 'danger';
  const baseBg = variant === 'primary' ? c.accent : variant === 'danger' ? c.danger : 'transparent';
  const pressedBg = variant === 'primary' ? c.accentPressed : variant === 'danger' ? c.accentPressed : c.accentTint;
  const fg = variant === 'primary' || variant === 'danger' ? c.accentText : variant === 'ghost' ? c.accent : c.text;
  const border = variant === 'secondary' ? { borderWidth: 1, borderColor: c.divider } : null;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      style={(state) => [
        styles.base,
        {
          alignItems: align === 'left' ? 'flex-start' : 'center',
          backgroundColor: state.pressed ? pressedBg : baseBg,
          paddingVertical: size === 'sm' ? t.spacing.md : 14,
          paddingHorizontal: size === 'sm' ? t.spacing.md : t.spacing.lg,
          borderRadius: t.radius.sm,
          opacity: disabled ? 0.5 : 1,
        },
        border,
        isFilled ? t.shadow.accentBtn : null,
        typeof style === 'function' ? style(state) : style,
      ]}
      {...rest}
    >
      <View style={styles.row}>
        {loading ? (
          <ActivityIndicator color={fg} />
        ) : (
          <Text color={fg} variant="cardTitle" style={styles.label} themeOverride={themeOverride}>
            {title}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { fontSize: 14 },
});
