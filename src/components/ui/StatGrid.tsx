import { Text, View, StyleSheet } from 'react-native';
import { colors } from '@/theme/tokens';
import { fonts } from '@/theme/typography';

export type Stat = { label: string; value: string; color?: string };

export function StatGrid({ stats, variant = 'light' }: { stats: Stat[]; variant?: 'light' | 'dark' }) {
  return (
    <View style={styles.grid}>
      {stats.map((s) => (
        <View key={s.label} style={variant === 'light' ? styles.cellLight : styles.cellDark}>
          <Text style={[styles.label, variant === 'dark' && styles.labelDark]}>{s.label}</Text>
          <Text style={[styles.value, { color: s.color ?? (variant === 'dark' ? '#fff' : colors.ink) }]}>
            {s.value}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  cellLight: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 10,
  },
  cellDark: {
    flex: 1,
  },
  label: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 10.5,
    color: colors.muted,
  },
  labelDark: {
    fontSize: 11,
    color: colors.darkCardMuted,
  },
  value: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 15,
    marginTop: 4,
  },
});
