import { Pressable, Text, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radii } from '@/theme/tokens';
import { fonts } from '@/theme/typography';

type Props = {
  label: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  size?: 'md' | 'lg';
};

export function PrimaryButton({ label, onPress, style, disabled, size = 'lg' }: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        size === 'lg' ? styles.lg : styles.md,
        { backgroundColor: pressed ? colors.primaryHover : colors.primary },
        disabled && styles.disabled,
        style,
      ]}>
      <Text style={[styles.label, { color: '#fff' }, size === 'lg' && styles.labelLg]}>{label}</Text>
    </Pressable>
  );
}

export function OutlineButton({ label, onPress, style, disabled, size = 'lg' }: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        size === 'lg' ? styles.lg : styles.md,
        styles.outline,
        pressed && { backgroundColor: colors.primaryTint },
        disabled && styles.disabled,
        style,
      ]}>
      <Text style={[styles.label, { color: colors.primary }, size === 'lg' && styles.labelLg]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  lg: {
    borderRadius: radii.button,
    padding: 16,
  },
  md: {
    borderRadius: radii.buttonSm,
    paddingVertical: 13,
    paddingHorizontal: 8,
  },
  outline: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
  },
  labelLg: {
    fontFamily: fonts.displayBold,
    fontSize: 15,
  },
});
