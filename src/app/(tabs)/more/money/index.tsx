import { useState } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { router, Redirect } from 'expo-router';
import { useStore } from '@/store/store';
import { useProfile } from '@/store/authStore';
import type { Business } from '@/domain/types';
import { colors, radii } from '@/theme/tokens';
import { fonts } from '@/theme/typography';
import { Screen, Chip, Card, Row, EmptyState, PrimaryButton, OutlineButton } from '@/components/ui';

const BIZ_OPTIONS: (Business | 'All')[] = ['All', 'Cattle', 'Poultry', 'Hogs', 'General'];

const fmt = (n: number) => (n < 0 ? '−$' : '$') + Math.abs(Math.round(n)).toLocaleString('en-US');

export default function MoneyScreen() {
  const transactions = useStore((s) => s.transactions);
  const isKid = useProfile().role === 'kid';
  const [biz, setBiz] = useState<Business | 'All'>('All');

  // Kid mode hides money entirely, not just the ability to add entries.
  if (isKid) return <Redirect href="/more" />;

  const bizTxns = biz === 'All' ? transactions : transactions.filter((t) => t.business === biz);
  const year = new Date().getFullYear();
  const ytdTxns = bizTxns.filter((t) => t.date.startsWith(String(year)));
  const income = ytdTxns.filter((t) => t.kind === 'income').reduce((s, t) => s + t.amount, 0);
  const expense = ytdTxns.filter((t) => t.kind === 'expense').reduce((s, t) => s + t.amount, 0);
  const net = income - expense;

  const sorted = [...bizTxns].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <Screen>
      <Text style={styles.backLink} onPress={() => router.push('/more')}>
        ‹ More
      </Text>
      <Text style={styles.title}>Money</Text>
      <Text style={styles.helper}>Every entry maps to a Schedule F line for tax time</Text>

      <View style={styles.chipRow}>
        {BIZ_OPTIONS.map((b) => (
          <Chip key={b} label={b} selected={biz === b} onPress={() => setBiz(b)} />
        ))}
      </View>

      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.summaryLabel}>Income YTD</Text>
            <Text style={styles.summaryValue}>{fmt(income)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.summaryLabel}>Expenses YTD</Text>
            <Text style={styles.summaryValue}>{fmt(expense)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.summaryLabel}>Net</Text>
            <Text style={[styles.summaryValue, { color: net >= 0 ? colors.netGreenOnDark : colors.netRedOnDark }]}>{fmt(net)}</Text>
          </View>
        </View>
        <Text style={styles.summaryFoot}>
          Tax year {year} · {biz} view · full exports in Reports & audit
        </Text>
      </View>

      <View style={styles.actionRow}>
        <PrimaryButton label="+ Expense" onPress={() => router.push('/more/money/add?kind=expense')} size="md" style={{ flex: 1 }} />
        <OutlineButton label="+ Income" onPress={() => router.push('/more/money/add?kind=income')} size="md" style={{ flex: 1 }} />
      </View>

      <Text style={styles.sectionLabel}>Entries</Text>
      {sorted.length > 0 ? (
        <Card>
          {sorted.map((t, i) => (
            <Row
              key={t.id}
              icon={t.kind === 'income' ? '💵' : '🧾'}
              iconSize={34}
              title={t.desc}
              sub={`${t.date.slice(5).replace('-', '/')} · ${t.business} · ${t.scheduleFLine}${t.receiptDocId ? ' · 📎 receipt' : ''}`}
              onPress={() => router.push(`/more/money/add?id=${t.id}`)}
              showDivider={i < sorted.length - 1}
              trailing={
                <Text style={[styles.amount, { color: t.kind === 'income' ? colors.success : colors.ink }]}>
                  {t.kind === 'income' ? '+' : '−'}${t.amount.toLocaleString()}
                </Text>
              }
            />
          ))}
        </Card>
      ) : (
        <EmptyState
          icon="🧾"
          title="No entries yet"
          helper="Add your first expense or income — snap the receipt and it files itself in Docs."
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  backLink: { fontSize: 13, color: colors.primary, fontWeight: '600', marginBottom: 12 },
  title: { fontFamily: fonts.displayExtraBold, fontSize: 21, color: colors.ink },
  helper: { fontSize: 12.5, color: colors.muted, marginTop: 3 },
  chipRow: { flexDirection: 'row', gap: 8, marginTop: 14, flexWrap: 'wrap' },
  summaryCard: { backgroundColor: colors.darkCard, borderRadius: 18, padding: 16, marginTop: 12 },
  summaryRow: { flexDirection: 'row', gap: 14 },
  summaryLabel: { fontSize: 11, color: colors.darkCardMuted, fontWeight: '600' },
  summaryValue: { fontFamily: fonts.displayExtraBold, fontSize: 19, color: '#fff', marginTop: 2 },
  summaryFoot: { fontSize: 11, color: colors.darkCardMuted2, marginTop: 10 },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 14 },
  sectionLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 20,
    marginBottom: 10,
  },
  amount: { fontFamily: fonts.displayExtraBold, fontSize: 14 },
});
