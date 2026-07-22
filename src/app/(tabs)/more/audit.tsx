import { useMemo, useState } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { router, Redirect } from 'expo-router';
import { useStore } from '@/store/store';
import { useProfile } from '@/store/authStore';
import { filterAuditLog, type AuditRange } from '@/domain/auditLedger';
import { auditLogToCsv } from '@/domain/csv';
import { saveAndShareText, printHtmlAsPdf } from '@/utils/exportFiles';
import type { Business } from '@/domain/types';
import { colors } from '@/theme/tokens';
import { fonts } from '@/theme/typography';
import { Screen, Chip, Card, Row, EmptyState, PrimaryButton, OutlineButton } from '@/components/ui';

const RANGES: AuditRange[] = ['30 days', 'YTD', 'All'];
const BIZ_OPTIONS: (Business | 'All')[] = ['All', 'Cattle', 'Poultry', 'Hogs', 'General'];

export default function AuditScreen() {
  const auditLog = useStore((s) => s.auditLog);
  const isKid = useProfile().role === 'kid';
  const [range, setRange] = useState<AuditRange>('YTD');
  const [biz, setBiz] = useState<Business | 'All'>('All');

  if (isKid) return <Redirect href="/more" />;
  const [exportedMsg, setExportedMsg] = useState('');

  const trail = useMemo(() => filterAuditLog(auditLog, { range, business: biz }), [auditLog, range, biz]);

  const exportCsv = async () => {
    await saveAndShareText(`small-farm-usa-audit-${Date.now()}.csv`, auditLogToCsv(trail), 'text/csv');
    setExportedMsg('CSV exported');
  };

  const exportPdf = async () => {
    const rows = trail
      .map(
        (e) =>
          `<tr><td>${e.dateOccurred}</td><td>${e.business}</td><td>${e.kind}</td><td>${escapeHtml(e.summary)}</td><td>${escapeHtml(e.actor)}</td></tr>`
      )
      .join('');
    const html = `
      <html><head><meta charset="utf-8"><style>
        body{font-family:-apple-system,Helvetica,sans-serif;color:#2c3320;padding:24px}
        h1{font-size:18px}
        table{width:100%;border-collapse:collapse;margin-top:16px}
        th,td{text-align:left;padding:8px;border-bottom:1px solid #f0eee4;font-size:12px}
        th{color:#8a8672;text-transform:uppercase;font-size:10px}
      </style></head><body>
        <h1>Small Farm USA — Reports &amp; audit</h1>
        <div>${range} · ${biz} · ${trail.length} records</div>
        <table><thead><tr><th>Date</th><th>Business</th><th>Kind</th><th>Summary</th><th>Actor</th></tr></thead>
        <tbody>${rows}</tbody></table>
      </body></html>`;
    await printHtmlAsPdf(html);
    setExportedMsg('Report exported');
  };

  return (
    <Screen>
      <Text style={styles.backLink} onPress={() => router.push('/more')}>
        ‹ More
      </Text>
      <Text style={styles.title}>Reports & audit</Text>
      <Text style={styles.helper}>Complete paper trail — filter, then export for the inspector or your accountant</Text>

      <View2 gap={8} mt={14}>
        {RANGES.map((r) => (
          <Chip key={r} label={r} selected={range === r} onPress={() => setRange(r)} />
        ))}
      </View2>
      <View2 gap={8} mt={8}>
        {BIZ_OPTIONS.map((b) => (
          <Chip key={b} label={b} selected={biz === b} onPress={() => setBiz(b)} />
        ))}
      </View2>

      <Text style={styles.countLine}>
        {trail.length} record{trail.length === 1 ? '' : 's'} in view
      </Text>

      {trail.length > 0 ? (
        <Card>
          {trail.map((r, i) => (
            <Row
              key={r.id}
              icon={iconForKind(r.kind)}
              iconSize={32}
              title={r.summary}
              sub={`${r.dateOccurred} · ${r.business} · ${r.actor}`}
              showDivider={i < trail.length - 1}
            />
          ))}
        </Card>
      ) : (
        <EmptyState
          icon="📑"
          title="No records match"
          helper="Every animal event and money entry lands here automatically as you use the app."
        />
      )}

      <View2 gap={8} mt={16}>
        <PrimaryButton label="Export CSV" onPress={exportCsv} size="md" style={{ flex: 1 }} />
        <OutlineButton label="Export PDF" onPress={exportPdf} size="md" style={{ flex: 1 }} />
      </View2>
      {!!exportedMsg && <Text style={styles.exportedText}>✓ {exportedMsg}</Text>}
    </Screen>
  );
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function iconForKind(kind: string): string {
  if (kind === 'Income') return '💵';
  if (kind === 'Expense') return '🧾';
  if (kind === 'Chore') return '⭐';
  if (kind === 'Equipment added' || kind === 'Equipment update') return '🚜';
  if (kind === 'Feedback') return '💬';
  if (kind === 'Task scheduled') return '📅';
  const map: Record<string, string> = { born: '🍼', vax: '💉', weight: '⚖️', tag: '🏷', note: '📝', sold: '💵', butchered: '🥩' };
  return map[kind] || '📝';
}

// Small inline row-wrap helper — this screen has two independent chip rows that
// share identical flex-wrap layout, not worth its own component file.
function View2({ children, gap, mt }: { children: React.ReactNode; gap: number; mt: number }) {
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap, marginTop: mt }}>{children}</View>;
}

const styles = StyleSheet.create({
  backLink: { fontSize: 13, color: colors.primary, fontWeight: '600', marginBottom: 12 },
  title: { fontFamily: fonts.displayExtraBold, fontSize: 21, color: colors.ink },
  helper: { fontSize: 12.5, color: colors.muted, marginTop: 3 },
  countLine: { fontSize: 12, color: colors.muted, marginVertical: 12 },
  exportedText: { textAlign: 'center', fontSize: 12.5, color: colors.success, fontWeight: '700', marginTop: 10 },
});
