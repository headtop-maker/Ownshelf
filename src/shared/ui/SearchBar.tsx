import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { familyForWeight, useTheme } from './theme';

type Props = {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
};

/** Строка поиска «Modernist»: surface-поле, 1px divider, иконка search, крестик очистки. */
export function SearchBar({ value, onChangeText, placeholder }: Props) {
  const { colors: c } = useTheme();
  return (
    <View style={[styles.bar, { backgroundColor: c.surface, borderColor: c.divider }]}>
      <Feather name="search" size={14} color={c.textMuted} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={c.textMuted}
        style={[styles.input, { color: c.text, fontFamily: familyForWeight('400') }]}
      />
      {value ? (
        <Pressable hitSlop={8} onPress={() => onChangeText('')}>
          <Feather name="x" size={16} color={c.textMuted} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  input: { flex: 1, fontSize: 13, padding: 0 },
});
