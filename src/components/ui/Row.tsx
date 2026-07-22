import { Pressable, Text, View, StyleSheet } from 'react-native';
import { colors } from '@/theme/tokens';
import { fonts } from '@/theme/typography';

type Props = {
  icon?: string;
  iconBg?: string;
  iconSize?: number;
  title: string;
  titleColor?: string;
  titleDecoration?: 'none' | 'line-through';
  sub?: string;
  subColor?: string;
  trailing?: React.ReactNode;
  onPress?: () => void;
  showDivider?: boolean;
};

export function Row({
  icon,
  iconBg = colors.chipBg,
  iconSize = 34,
  title,
  titleColor = colors.ink,
  titleDecoration = 'none',
  sub,
  subColor = colors.muted,
  trailing,
  onPress,
  showDivider = true,
}: Props) {
  const content = (
    <View style={[styles.row, showDivider && styles.divider]}>
      {icon != null && (
        <View
          style={[
            styles.iconBox,
            { width: iconSize, height: iconSize, borderRadius: iconSize * 0.29, backgroundColor: iconBg },
          ]}>
          <Text style={{ fontSize: iconSize * 0.44 }}>{icon}</Text>
        </View>
      )}
      <View style={styles.textCol}>
        <Text
          numberOfLines={1}
          style={[styles.title, { color: titleColor, textDecorationLine: titleDecoration }]}>
          {title}
        </Text>
        {sub != null && (
          <Text numberOfLines={1} style={[styles.sub, { color: subColor }]}>
            {sub}
          </Text>
        )}
      </View>
      {trailing}
    </View>
  );

  if (!onPress) return content;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && { backgroundColor: colors.surface }}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingVertical: 13,
    paddingHorizontal: 16,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  iconBox: {
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  textCol: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontFamily: fonts.bodyBold,
    fontSize: 13.5,
  },
  sub: {
    fontFamily: fonts.bodyRegular,
    fontSize: 11.5,
    marginTop: 1,
  },
});
