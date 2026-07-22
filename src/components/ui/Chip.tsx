import { Pressable, Text, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radii } from '@/theme/tokens';
import { fonts } from '@/theme/typography';

type Props = {
  label: string;
  selected: boolean;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
};

export function Chip({ label, selected, onPress, style }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.base,
        { backgroundColor: selected ? colors.primary : colors.chipBg },
        style,
      ]}
      hitSlop={6}>
      <Text style={[styles.label, { color: selected ? '#fff' : colors.chipFg }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.chip,
    paddingVertical: 7,
    paddingHorizontal: 14,
  },
  label: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
  },
});
