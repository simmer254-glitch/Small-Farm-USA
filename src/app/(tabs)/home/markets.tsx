import { Text, View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useStore } from '@/store/store';
import { colors } from '@/theme/tokens';
import { fonts } from '@/theme/typography';
import { Screen, Chip, Card } from '@/components/ui';

export default function MarketsScreen() {
  const auctions = useStore((s) => s.auctions);
  const selectedAuctionKey = useStore((s) => s.selectedAuctionKey);
  const setAuction = useStore((s) => s.setAuction);

  const auction = auctions.find((a) => a.key === selectedAuctionKey) ?? auctions[0];

  return (
    <Screen>
      <Text style={styles.backLink} onPress={() => router.push('/home')}>
        ‹ Home
      </Text>
      <Text style={styles.title}>Markets</Text>
      <Text style={styles.helper}>USDA AMS reports · pick the barns you follow</Text>

      <View style={styles.chipRow}>
        {auctions.map((a) => (
          <Chip
            key={a.key}
            label={a.name.split(',')[0]}
            selected={a.key === selectedAuctionKey}
            onPress={() => setAuction(a.key)}
          />
        ))}
      </View>

      <Text style={styles.metaLine}>
        {auction.name.split(',')[0]} · {auction.meta}
      </Text>

      <Card>
        {auction.quotes.map((q, i) => (
          <View key={q.label} style={[styles.quoteRow, i < auction.quotes.length - 1 && styles.quoteDivider]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.quoteLabel}>{q.label}</Text>
              <Text style={styles.quoteNote}>{q.note}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.quotePrice}>{q.price}</Text>
              <Text style={[styles.quoteDelta, { color: q.up ? colors.up : colors.down }]}>{q.delta}</Text>
            </View>
          </View>
        ))}
      </Card>

      <Text style={styles.footNote}>
        Sample data for design. Real app pulls free USDA AMS auction reports for your selected barns.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  backLink: { fontSize: 13, color: colors.primary, fontWeight: '600', marginBottom: 12 },
  title: { fontFamily: fonts.displayExtraBold, fontSize: 21, color: colors.ink },
  helper: { fontSize: 12.5, color: colors.muted, marginTop: 3 },
  chipRow: { flexDirection: 'row', gap: 8, marginTop: 14, flexWrap: 'wrap' },
  metaLine: { fontSize: 12, color: colors.muted, marginVertical: 12 },
  quoteRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 13, paddingHorizontal: 16 },
  quoteDivider: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  quoteLabel: { fontFamily: fonts.bodySemiBold, fontSize: 13.5, color: colors.ink },
  quoteNote: { fontSize: 11.5, color: colors.muted, marginTop: 1 },
  quotePrice: { fontFamily: fonts.displayExtraBold, fontSize: 15, color: colors.ink },
  quoteDelta: { fontSize: 11, fontWeight: '700', marginTop: 1 },
  footNote: { fontSize: 11, color: colors.faint, marginTop: 10 },
});
