import { Text as RNText, type TextProps as RNTextProps } from 'react-native';
import { familyForWeight, useTheme, type ThemeName, type TypeVariant } from './theme';

type Weight = '400' | '500' | '600' | '700' | '800';

type Props = RNTextProps & {
  variant?: TypeVariant;
  muted?: boolean;
  color?: string;
  weight?: Weight;
  /** Отключить uppercase/трекинг, заложенные в вариант. */
  plain?: boolean;
  themeOverride?: ThemeName;
};

/** Тематический Text: размеры/начертание из токенов «Modernist», семейство Golos Text по весу. */
export function Text({
  variant = 'body',
  muted,
  color,
  weight,
  plain,
  themeOverride,
  style,
  ...rest
}: Props) {
  const t = useTheme(themeOverride);
  const [size, lineHeight, variantWeight] = t.type[variant];
  const finalWeight = (weight ?? variantWeight) as Weight;
  const caseStyle = plain ? undefined : t.typeCase[variant];

  return (
    <RNText
      style={[
        {
          color: color ?? (muted ? t.colors.textMuted : t.colors.text),
          fontSize: size,
          lineHeight,
          fontFamily: familyForWeight(finalWeight),
          fontWeight: finalWeight,
        },
        caseStyle,
        style,
      ]}
      {...rest}
    />
  );
}
