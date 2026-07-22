import { useMemo } from 'react';
import { Text, View, Pressable, ScrollView, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useStore } from '@/store/store';
import { useProfile } from '@/store/authStore';
import { suggestionFor } from '@/domain/businessLogic';
import { daysUntil, relativeDayLabel, todayIso } from '@/domain/dates';
import { TASK_TYPE_ICON, KID_CHORE_OPTIONS } from '@/domain/icons';
import { colors } from '@/theme/tokens';
import { fonts } from '@/theme/typography';
import { Screen, Chip, Card, Row, SectionLabel, EmptyState, SpeedDialFab, type FabAction } from '@/components/ui';

export default function HomeScreen() {
  const currentUser = useProfile();
  if (currentUser.role === 'kid') return <KidHome />;
  return <AdminMemberHome />;
}

function AdminMemberHome() {
  const animals = useStore((s) => s.animals);
  const tasks = useStore((s) => s.tasks);
  const transactions = useStore((s) => s.transactions);
  const auctions = useStore((s) => s.auctions);
  const selectedAuctionKey = useStore((s) => s.selectedAuctionKey);
  const currentUser = useProfile();

  const active = useMemo(() => animals.filter((a) => a.status === 'active' && a.cls !== 'pet'), [animals]);
  const nCattle = active.filter((a) => a.species === 'cattle').length;
  const nPigs = active.filter((a) => a.species === 'pig').length;
  const nChickens = active.filter((a) => a.species === 'chicken').length;
  const totalHead = nCattle + nPigs + nChickens;

  const attention = useMemo(() => {
    const rows: { key: string; icon: string; bg: string; title: string; sub: string; go: () => void }[] = [];
    for (const a of active) {
      const s = suggestionFor(a);
      if (!s) continue;
      const sub = s.body.length > 64 ? s.body.slice(0, 64) + '…' : s.body;
      rows.push({
        key: `a-${a.id}`,
        icon: a.species === 'cattle' ? '🐄' : a.species === 'pig' ? '🐖' : '🐔',
        bg: '#f5e3d7',
        title: `${s.title} — ${a.name || '#' + a.tag}`,
        sub,
        go: () => router.push(`/animals/${a.id}`),
      });
    }
    for (const t of tasks.filter((t) => !t.done)) {
      const days = daysUntil(t.date);
      if (days >= 0 && days <= 14) {
        rows.push({
          key: `t-${t.id}`,
          icon: TASK_TYPE_ICON[t.type],
          bg: colors.primaryTint2,
          title: t.title,
          sub: `${relativeDayLabel(days)} · ${t.type}`,
          go: () => router.push('/calendar'),
        });
      }
    }
    return rows;
  }, [active, tasks]);

  const auction = auctions.find((x) => x.key === selectedAuctionKey) ?? auctions[0];
  const homeQuotes = auction.quotes.slice(0, 3).map((q) => ({
    ...q,
    label: q.label.replace('500–600 lb', '5–6 cwt'),
  }));

  const year = new Date().getFullYear();
  const ytdTxns = transactions.filter((t) => t.date.startsWith(String(year)));
  const ytdIncome = ytdTxns.filter((t) => t.kind === 'income').reduce((s, t) => s + t.amount, 0);
  const ytdExpense = ytdTxns.filter((t) => t.kind === 'expense').reduce((s, t) => s + t.amount, 0);
  const net = ytdIncome - ytdExpense;
  const fmt = (n: number) => (n < 0 ? '−$' : '$') + Math.abs(Math.round(n)).toLocaleString('en-US');

  const roleLabel = currentUser.role === 'admin' ? 'Admin' : 'Member';
  const dateLabel = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  const fabActions: FabAction[] = [
    { icon: '🧾', label: 'Expense + receipt', onPress: () => router.push('/more/money/add?kind=expense') },
    { icon: '💵', label: 'Income', onPress: () => router.push('/more/money/add?kind=income') },
    { icon: '📄', label: 'Upload a doc', onPress: () => router.push('/docs') },
    { icon: '🐄', label: 'New animal', onPress: () => router.push('/animals/add') },
    { icon: '📅', label: 'Schedule a task', onPress: () => router.push('/calendar?openForm=1') },
    { icon: '💬', label: 'Send feedback', onPress: () => router.push('/more') },
  ];

  return (
    <View style={styles.fill}>
      <ScrollView style={styles.fill} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.body}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.greeting}>Good morning, Simmons Family</Text>
              <Text style={styles.metaLine}>
                {dateLabel} · {totalHead} animals · {roleLabel}
              </Text>
            </View>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>SF</Text>
            </View>
          </View>

          <View style={styles.chipRow}>
            <Chip label={`🐄 ${nCattle}`} selected={false} onPress={() => router.push('/animals?filter=cattle')} />
            <Chip label={`🐖 ${nPigs}`} selected={false} onPress={() => router.push('/animals?filter=pig')} />
            <Chip label={`🐔 ${nChickens}`} selected={false} onPress={() => router.push('/animals?filter=chicken')} />
            <Chip label="+ Add" selected={false} onPress={() => router.push('/animals/add')} />
          </View>

          <SectionLabel label="Needs attention" />
          {attention.length > 0 ? (
            <Card>
              {attention.map((row, i) => (
                <Row
                  key={row.key}
                  icon={row.icon}
                  iconBg={row.bg}
                  iconSize={34}
                  title={row.title}
                  sub={row.sub}
                  onPress={row.go}
                  showDivider={i < attention.length - 1}
                  trailing={<Text style={{ color: colors.faint }}>›</Text>}
                />
              ))}
            </Card>
          ) : (
            <EmptyState
              icon="🌤"
              title="All caught up"
              helper="Add animals, equipment, or calendar tasks and suggestions will show up here."
            />
          )}

          <SectionLabel label="Markets" action={{ label: `${auction.name.split(',')[0]} ▾`, onPress: () => router.push('/home/markets') }} />
          <View style={styles.marketsRow}>
            {homeQuotes.map((q) => (
              <Card key={q.label} onPress={() => router.push('/home/markets')} style={styles.marketCard}>
                <Text style={styles.marketLabel} numberOfLines={1}>
                  {q.label}
                </Text>
                <Text style={styles.marketPrice}>{q.price}</Text>
                <Text style={[styles.marketDelta, { color: q.up ? colors.up : colors.down }]}>{q.delta}</Text>
              </Card>
            ))}
          </View>

          <SectionLabel label="This year so far" action={{ label: 'Schedule F ›', onPress: () => router.push('/more/money') }} />
          <Card onPress={() => router.push('/more/money')} style={styles.ytdCard}>
            <View style={styles.ytdCell}>
              <Text style={styles.ytdLabel}>Income</Text>
              <Text style={styles.ytdValue}>{fmt(ytdIncome)}</Text>
            </View>
            <View style={styles.ytdCell}>
              <Text style={styles.ytdLabel}>Expenses</Text>
              <Text style={styles.ytdValue}>{fmt(ytdExpense)}</Text>
            </View>
            <View style={styles.ytdCell}>
              <Text style={styles.ytdLabel}>Net</Text>
              <Text style={[styles.ytdValue, { color: net >= 0 ? colors.success : colors.danger }]}>{fmt(net)}</Text>
            </View>
          </Card>
        </View>
      </ScrollView>
      <SpeedDialFab actions={fabActions} />
    </View>
  );
}

function KidHome() {
  const chores = useStore((s) => s.chores);
  const tasks = useStore((s) => s.tasks);
  const logChore = useStore((s) => s.logChore);
  const toggleTask = useStore((s) => s.toggleTask);

  const today = todayIso();
  const choresToday = chores.filter((c) => c.date === today).length;

  const kidTasks = tasks.filter((t) => t.assigneeUserId === 'kids' || t.assigneeUserId === 'everyone');

  return (
    <Screen bottomPad={30}>
      <Text style={styles.kidGreeting}>Hi, helper! 👋</Text>
      <Text style={styles.kidSub}>Tap a button when you finish a chore</Text>

      <View style={styles.kidGrid}>
        {KID_CHORE_OPTIONS.map((c) => (
          <Card key={c.label} onPress={() => logChore(c.icon, c.label)} style={styles.kidChoreCard}>
            <Text style={styles.kidChoreIcon}>{c.icon}</Text>
            <Text style={styles.kidChoreLabel}>{c.label}</Text>
          </Card>
        ))}
      </View>

      {choresToday > 0 && (
        <View style={styles.kidBanner}>
          <Text style={styles.kidBannerText}>⭐ {choresToday} done today — great work!</Text>
        </View>
      )}

      <SectionLabel label="My tasks" />
      {kidTasks.length > 0 ? (
        <Card>
          {kidTasks.map((t, i) => (
            <Row
              key={t.id}
              icon={TASK_TYPE_ICON[t.type]}
              iconSize={32}
              title={t.title}
              titleColor={t.done ? colors.faint : colors.ink}
              titleDecoration={t.done ? 'line-through' : 'none'}
              sub={t.date}
              showDivider={i < kidTasks.length - 1}
              trailing={
                <Pressable
                  onPress={() => toggleTask(t.id)}
                  style={[
                    styles.kidCheckbox,
                    { backgroundColor: t.done ? colors.primary : '#fff', borderColor: t.done ? colors.primary : '#ccc7b2' },
                  ]}>
                  <Text style={{ color: '#fff', fontSize: 15 }}>{t.done ? '✓' : ''}</Text>
                </Pressable>
              }
            />
          ))}
        </Card>
      ) : (
        <View style={styles.kidNoTasks}>
          <Text style={styles.kidNoTasksText}>No tasks for you today 🎉</Text>
        </View>
      )}

      <Text style={styles.kidFooter}>Kid mode — switch back in More › Your role</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.surface },
  scrollContent: { flexGrow: 1 },
  // Home needs extra bottom padding (90px) to clear the FAB, unlike the shared
  // Screen component's default — hence the bespoke scroll body here.
  body: { paddingHorizontal: 22, paddingTop: 44, paddingBottom: 90 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  greeting: { fontFamily: fonts.displayExtraBold, fontSize: 21, color: colors.ink, letterSpacing: -0.3 },
  metaLine: { fontSize: 12.5, color: colors.muted, marginTop: 3 },
  avatar: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontWeight: '700', fontSize: 14, color: '#fff' },
  chipRow: { flexDirection: 'row', gap: 8, marginTop: 18, flexWrap: 'wrap' },
  marketsRow: { flexDirection: 'row', gap: 8 },
  marketCard: { flex: 1, padding: 12 },
  marketLabel: { fontSize: 10.5, color: colors.muted, fontFamily: fonts.bodySemiBold },
  marketPrice: { fontFamily: fonts.displayExtraBold, fontSize: 17, color: colors.ink, marginTop: 4 },
  marketDelta: { fontSize: 11, fontWeight: '700', marginTop: 2 },
  ytdCard: { flexDirection: 'row', gap: 14, padding: 16 },
  ytdCell: { flex: 1 },
  ytdLabel: { fontSize: 11, color: colors.muted, fontFamily: fonts.bodySemiBold },
  ytdValue: { fontFamily: fonts.displayExtraBold, fontSize: 17, color: colors.ink, marginTop: 2 },

  kidGreeting: { fontFamily: fonts.displayExtraBold, fontSize: 24, color: colors.ink },
  kidSub: { fontSize: 13, color: colors.muted, marginTop: 3 },
  kidGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 18 },
  kidChoreCard: { width: '47%', paddingVertical: 22, alignItems: 'center' },
  kidChoreIcon: { fontSize: 34 },
  kidChoreLabel: { fontFamily: fonts.displayExtraBold, fontSize: 14, color: colors.ink, marginTop: 8, textAlign: 'center' },
  kidBanner: { backgroundColor: colors.primaryTint2, borderRadius: 16, padding: 14, marginTop: 16 },
  kidBannerText: { fontFamily: fonts.displayExtraBold, fontSize: 14, color: colors.primaryDeep, textAlign: 'center' },
  kidCheckbox: { width: 28, height: 28, borderRadius: 9, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  kidNoTasks: { backgroundColor: '#fff', borderRadius: 16, padding: 24, alignItems: 'center' },
  kidNoTasksText: { fontSize: 13, color: colors.muted },
  kidFooter: { fontSize: 11, color: colors.faint, marginTop: 14, textAlign: 'center' },
});
