import { Pressable, View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radii, shadow } from '@/theme/tokens';

type Props = {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  variant?: 'default' | 'pet' | 'dark';
};

export function Card({ children, onPress, style, variant = 'default' }: Props) {
  const bg =
    variant === 'pet' ? colors.petBg : variant === 'dark' ? colors.darkCard : colors.card;
  const border = variant === 'pet' ? { borderWidth: 1, borderColor: colors.petBorder } : null;
  const content = (
    <View style={[styles.base, { backgroundColor: bg }, border, style]}>{children}</View>
  );
  if (!onPress) return content;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [pressed && styles.pressed]}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.card,
    overflow: 'hidden',
    ...shadow.card,
  },
  pressed: {
    opacity: 0.85,
  },
});
