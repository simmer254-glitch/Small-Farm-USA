import { Text, View, StyleSheet } from 'react-native';
import { Card } from './Card';
import { colors } from '@/theme/tokens';
import { fonts } from '@/theme/typography';

type Props = {
  icon: string;
  title: string;
  helper: string;
  size?: 'md' | 'lg';
};

export function EmptyState({ icon, title, helper, size = 'lg' }: Props) {
  return (
    <Card style={size === 'lg' ? styles.padLg : styles.padMd}>
      <View style={styles.center}>
        <Text style={size === 'lg' ? styles.iconLg : styles.iconMd}>{icon}</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.helper}>{helper}</Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  padLg: { padding: 28 },
  padMd: { padding: 22 },
  center: { alignItems: 'center' },
  iconLg: { fontSize: 32 },
  iconMd: { fontSize: 24 },
  title: {
    fontFamily: fonts.bodyBold,
    fontSize: 13.5,
    color: colors.ink,
    marginTop: 10,
    textAlign: 'center',
  },
  helper: {
    fontFamily: fonts.bodyRegular,
    fontSize: 12.5,
    color: colors.muted,
    marginTop: 4,
    textAlign: 'center',
  },
});
