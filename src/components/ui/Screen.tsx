import { ScrollView, View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { colors, spacing } from '@/theme/tokens';

type Props = {
  children: React.ReactNode;
  bottomPad?: number;
  scroll?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Screen({ children, bottomPad = spacing.screenBottom, scroll = true, style }: Props) {
  const content = (
    <View
      style={[
        { paddingHorizontal: spacing.screenH, paddingTop: spacing.screenTop, paddingBottom: bottomPad },
        style,
      ]}>
      {children}
    </View>
  );
  if (!scroll) return <View style={styles.fill}>{content}</View>;
  return (
    <ScrollView style={styles.fill} contentContainerStyle={styles.grow} showsVerticalScrollIndicator={false}>
      {content}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // The prototype's outer #e5e2d8 is the design-canvas backdrop around the phone
  // mockup, not part of the app — the real screen background is the phone's
  // own #faf8f2 surface color.
  fill: { flex: 1, backgroundColor: colors.surface },
  grow: { flexGrow: 1 },
});
