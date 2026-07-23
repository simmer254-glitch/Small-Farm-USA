import { Text, StyleSheet } from 'react-native';
import { colors } from '@/theme/tokens';
import { fonts } from '@/theme/typography';

export type BadgeTone = 'ok' | 'action' | 'sold' | 'butchered' | 'dead' | 'pet' | 'new' | 'planned' | 'done';

const TONE_STYLES: Record<BadgeTone, { bg: string; fg: string }> = {
  ok: { bg: colors.primaryTint2, fg: '#4a6b2e' },
  action: { bg: colors.alertTint, fg: colors.alertAccent },
  sold: { bg: colors.soldTint, fg: colors.soldAccent },
  butchered: { bg: colors.butcherTint, fg: colors.butcherBrown },
  dead: { bg: colors.deadTint, fg: colors.deadAccent },
  pet: { bg: colors.petChipBg, fg: colors.petAccent },
  new: { bg: '#e8eef5', fg: '#2a63a8' },
  planned: { bg: '#f7ecd4', fg: '#8a6a1e' },
  done: { bg: colors.primaryTint2, fg: '#4a6b2e' },
};

export function Badge({ label, tone }: { label: string; tone: BadgeTone }) {
  const t = TONE_STYLES[tone];
  return (
    <Text
      style={[
        styles.base,
        { backgroundColor: t.bg, color: t.fg },
      ]}>
      {label}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 10,
    overflow: 'hidden',
  },
});
