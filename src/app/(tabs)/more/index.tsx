import { useState } from 'react';
import { Text, View, TextInput, Pressable, Platform, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useStore } from '@/store/store';
import { useAuthStore, useProfile } from '@/store/authStore';
import { useOneDriveStore } from '@/store/oneDriveStore';
import { useGoogleCalendarStore } from '@/store/googleCalendarStore';
import { seedDemoData } from '@/store/devSeed';
import { colors, radii } from '@/theme/tokens';
import { fonts } from '@/theme/typography';
import { Screen, Card, Row, SectionLabel, Badge, type BadgeTone } from '@/components/ui';

const FEEDBACK_BADGE: Record<string, BadgeTone> = { New: 'new', Planned: 'planned', Done: 'done' };
const ROLE_LABEL: Record<string, string> = { admin: 'Admin', member: 'Member', kid: 'Kid mode' };
const ROLE_BG: Record<string, string> = { admin: colors.primary, member: colors.muted, kid: colors.petAccent };

export default function MoreScreen() {
  const transactions = useStore((s) => s.transactions);
  const equipment = useStore((s) => s.equipment);
  const feedback = useStore((s) => s.feedback);
  const users = useStore((s) => s.profiles);
  const currentUser = useProfile();
  const addEquipment = useStore((s) => s.addEquipment);
  const updateEquipmentService = useStore((s) => s.updateEquipmentService);
  const updateEquipment = useStore((s) => s.updateEquipment);
  const deleteEquipment = useStore((s) => s.deleteEquipment);
  const addFeedback = useStore((s) => s.addFeedback);
  const updateFeedback = useStore((s) => s.updateFeedback);
  const deleteFeedback = useStore((s) => s.deleteFeedback);
  const signOut = useAuthStore((s) => s.signOut);
  const connected = useOneDriveStore((s) => s.connected);
  const lastSyncAt = useOneDriveStore((s) => s.lastSyncAt);
  const lastSyncError = useOneDriveStore((s) => s.lastSyncError);
  const syncing = useOneDriveStore((s) => s.syncing);
  const promptAsync = useOneDriveStore((s) => s.promptAsync);
  const syncPendingDocs = useOneDriveStore((s) => s.syncPendingDocs);
  const gcalConnected = useGoogleCalendarStore((s) => s.connected);
  const gcalLastSyncAt = useGoogleCalendarStore((s) => s.lastSyncAt);
  const gcalLastSyncError = useGoogleCalendarStore((s) => s.lastSyncError);
  const gcalSyncing = useGoogleCalendarStore((s) => s.syncing);
  const gcalPromptAsync = useGoogleCalendarStore((s) => s.promptAsync);
  const syncPendingTasks = useGoogleCalendarStore((s) => s.syncPendingTasks);

  const [showEqForm, setShowEqForm] = useState(false);
  const [eqName, setEqName] = useState('');
  const [eqHours, setEqHours] = useState('');
  const [eqEditId, setEqEditId] = useState<string | null>(null);
  const [eqEditHours, setEqEditHours] = useState('');
  const [eqEditNote, setEqEditNote] = useState('');
  const [eqRenameId, setEqRenameId] = useState<string | null>(null);
  const [eqRenameName, setEqRenameName] = useState('');
  const [eqRenameUnit, setEqRenameUnit] = useState('');

  const [fbDraft, setFbDraft] = useState('');
  const [fbEditId, setFbEditId] = useState<string | null>(null);
  const [fbEditText, setFbEditText] = useState('');
  const [seedMsg, setSeedMsg] = useState('');
  const [seeding, setSeeding] = useState(false);

  const runSeed = async () => {
    setSeeding(true);
    setSeedMsg('');
    const { error } = await seedDemoData();
    setSeeding(false);
    setSeedMsg(error ? `Seed failed: ${error}` : '✓ Sample data added — check Animals, Calendar, Money, Docs.');
  };

  const income = transactions.filter((t) => t.kind === 'income').reduce((s, t) => s + t.amount, 0);
  const expense = transactions.filter((t) => t.kind === 'expense').reduce((s, t) => s + t.amount, 0);
  const net = income - expense;
  const fmt = (n: number) => (n < 0 ? '−$' : '$') + Math.abs(Math.round(n)).toLocaleString('en-US');
  const moneyTeaser =
    transactions.length > 0 ? `${transactions.length} entries · net ${fmt(net)} YTD` : 'No entries yet · tap to add';

  const saveEquipment = () => {
    if (!eqName.trim()) return;
    addEquipment(eqName.trim(), eqHours);
    setShowEqForm(false);
    setEqName('');
    setEqHours('');
  };

  const sendFeedback = () => {
    if (!fbDraft.trim()) return;
    addFeedback(currentUser.name, fbDraft.trim());
    setFbDraft('');
  };

  const isAdmin = currentUser.role === 'admin';
  const isMemberOrAdmin = currentUser.role !== 'kid';
  const canManageOneDrive = isAdmin && Platform.OS === 'web';
  const canManageGoogle = isAdmin && Platform.OS === 'web';
  const oneDriveLabel = syncing
    ? 'Syncing…'
    : lastSyncError
      ? 'Sync failed ›'
      : connected
        ? `Connected${lastSyncAt ? ` · synced ${new Date(lastSyncAt).toLocaleDateString()}` : ''} ›`
        : canManageOneDrive
          ? 'Not connected · Connect ›'
          : 'Not connected';
  const oneDriveColor = lastSyncError ? colors.alertAccent : connected ? colors.success : colors.muted;
  const oneDrivePress = !canManageOneDrive
    ? undefined
    : connected
      ? () => syncPendingDocs()
      : () => promptAsync?.();

  const gcalLabel = gcalSyncing
    ? 'Syncing…'
    : gcalLastSyncError
      ? 'Sync failed ›'
      : gcalConnected
        ? `Connected${gcalLastSyncAt ? ` · synced ${new Date(gcalLastSyncAt).toLocaleDateString()}` : ''} ›`
        : canManageGoogle
          ? 'Not connected · Connect ›'
          : 'Not connected';
  const gcalColor = gcalLastSyncError ? colors.alertAccent : gcalConnected ? colors.success : colors.muted;
  const gcalPress = !canManageGoogle
    ? undefined
    : gcalConnected
      ? () => syncPendingTasks()
      : () => gcalPromptAsync?.();

  return (
    <Screen>
      <Text style={styles.title}>More</Text>

      {currentUser.role !== 'kid' && (
        <>
          <Pressable onPress={() => router.push('/more/money')} style={styles.moneyCard}>
            <View style={styles.moneyIcon}>
              <Text style={{ color: '#fff', fontWeight: '800' }}>$</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.moneyTitle}>Farm Finances</Text>
              <Text style={styles.moneySub}>{moneyTeaser}</Text>
            </View>
            <Text style={{ color: colors.darkCardMuted2 }}>›</Text>
          </Pressable>

          <Pressable onPress={() => router.push('/more/audit')} style={styles.auditRow}>
            <View style={styles.auditIcon}>
              <Text style={{ fontSize: 15 }}>📑</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.auditTitle}>Reports & audit</Text>
              <Text style={styles.auditSub}>Pull records fast for the brand inspector</Text>
            </View>
            <Text style={{ color: colors.faint }}>›</Text>
          </Pressable>
        </>
      )}

      <SectionLabel label="Equipment" action={{ label: '+ Add equipment', onPress: () => setShowEqForm((s) => !s) }} />
      {showEqForm && (
        <Card style={styles.formCard}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput
              value={eqName}
              onChangeText={setEqName}
              placeholder="e.g. JD 5075E tractor"
              placeholderTextColor={colors.faint}
              style={[styles.input, { flex: 1 }]}
            />
            <TextInput
              value={eqHours}
              onChangeText={setEqHours}
              placeholder="Hours/mi"
              placeholderTextColor={colors.faint}
              keyboardType="numeric"
              style={[styles.input, { width: 90 }]}
            />
          </View>
          <Pressable onPress={saveEquipment} style={styles.formSaveBtn}>
            <Text style={styles.formSaveLabel}>Add equipment</Text>
          </Pressable>
        </Card>
      )}
      {equipment.length > 0 ? (
        <Card>
          {equipment.map((eq, i) => (
            <View key={eq.id} style={i < equipment.length - 1 && styles.eqDivider}>
              <Row
                icon="🚜"
                iconSize={36}
                title={eq.name}
                sub={`${eq.hours} ${eq.unit}${eq.lastService ? ` · ${eq.lastService}` : ' · no service logged yet'}`}
                showDivider={false}
                trailing={
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Pressable
                      onPress={() => {
                        setEqEditId((id) => (id === eq.id ? null : eq.id));
                        setEqEditHours('');
                        setEqEditNote('');
                      }}
                      style={styles.updateBtn}>
                      <Text style={styles.updateBtnLabel}>Update</Text>
                    </Pressable>
                    {isMemberOrAdmin && (
                      <Pressable
                        onPress={() => {
                          setEqRenameId((id) => (id === eq.id ? null : eq.id));
                          setEqRenameName(eq.name);
                          setEqRenameUnit(eq.unit);
                        }}
                        hitSlop={8}>
                        <Text style={{ fontSize: 14 }}>✏️</Text>
                      </Pressable>
                    )}
                    {isAdmin && (
                      <Pressable onPress={() => deleteEquipment(eq.id)} hitSlop={8}>
                        <Text style={{ color: colors.faint, fontSize: 15 }}>✕</Text>
                      </Pressable>
                    )}
                  </View>
                }
              />
              {eqRenameId === eq.id && (
                <View style={styles.eqEditForm}>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TextInput
                      value={eqRenameName}
                      onChangeText={setEqRenameName}
                      placeholder="Equipment name"
                      placeholderTextColor={colors.faint}
                      style={[styles.input, { flex: 1 }]}
                    />
                    <TextInput
                      value={eqRenameUnit}
                      onChangeText={setEqRenameUnit}
                      placeholder="Unit, e.g. hrs/mi"
                      placeholderTextColor={colors.faint}
                      style={[styles.input, { width: 110 }]}
                    />
                  </View>
                  <Pressable
                    onPress={() => {
                      if (!eqRenameName.trim()) return;
                      updateEquipment(eq.id, eqRenameName.trim(), eqRenameUnit.trim() || eq.unit);
                      setEqRenameId(null);
                    }}
                    style={styles.formSaveBtn}>
                    <Text style={styles.formSaveLabel}>Save changes</Text>
                  </Pressable>
                </View>
              )}
              {eqEditId === eq.id && (
                <View style={styles.eqEditForm}>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TextInput
                      value={eqEditHours}
                      onChangeText={setEqEditHours}
                      placeholder="New hours / miles"
                      placeholderTextColor={colors.faint}
                      keyboardType="numeric"
                      style={[styles.input, { width: 150 }]}
                    />
                    <TextInput
                      value={eqEditNote}
                      onChangeText={setEqEditNote}
                      placeholder="Service done (optional)"
                      placeholderTextColor={colors.faint}
                      style={[styles.input, { flex: 1 }]}
                    />
                  </View>
                  <Pressable
                    onPress={() => {
                      updateEquipmentService(eq.id, eqEditHours, eqEditNote);
                      setEqEditId(null);
                    }}
                    style={styles.formSaveBtn}>
                    <Text style={styles.formSaveLabel}>Save update</Text>
                  </Pressable>
                </View>
              )}
            </View>
          ))}
        </Card>
      ) : (
        <Card style={styles.emptyCard}>
          <Text style={{ fontSize: 26 }}>🚜</Text>
          <Text style={styles.emptyTitle}>No equipment yet</Text>
          <Text style={styles.emptyHelper}>Add tractors, balers, trailers — then log hours and services as you go.</Text>
        </Card>
      )}

      <SectionLabel label="Family feedback" />
      <Card style={styles.feedbackCard}>
        {feedback.length > 0 && (
          <View style={{ gap: 10, marginBottom: 12 }}>
            {feedback.map((fb) => (
              <View key={fb.id} style={styles.feedbackRow}>
                <View style={styles.feedbackHeader}>
                  <Text style={styles.feedbackWho}>
                    {fb.who} <Text style={styles.feedbackDate}>· {fb.date}</Text>
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Badge label={fb.status} tone={FEEDBACK_BADGE[fb.status]} />
                    {isMemberOrAdmin && (
                      <Pressable
                        onPress={() => {
                          setFbEditId((id) => (id === fb.id ? null : fb.id));
                          setFbEditText(fb.text);
                        }}
                        hitSlop={8}>
                        <Text style={{ fontSize: 14 }}>✏️</Text>
                      </Pressable>
                    )}
                    {isAdmin && (
                      <Pressable onPress={() => deleteFeedback(fb.id)} hitSlop={8}>
                        <Text style={{ color: colors.faint, fontSize: 15 }}>✕</Text>
                      </Pressable>
                    )}
                  </View>
                </View>
                {fbEditId === fb.id ? (
                  <View style={{ gap: 8, marginTop: 6 }}>
                    <TextInput
                      value={fbEditText}
                      onChangeText={setFbEditText}
                      placeholderTextColor={colors.faint}
                      style={styles.input}
                      multiline
                    />
                    <Pressable
                      onPress={() => {
                        if (!fbEditText.trim()) return;
                        updateFeedback(fb.id, fbEditText.trim());
                        setFbEditId(null);
                      }}
                      style={styles.formSaveBtn}>
                      <Text style={styles.formSaveLabel}>Save changes</Text>
                    </Pressable>
                  </View>
                ) : (
                  <Text style={styles.feedbackText}>{fb.text}</Text>
                )}
              </View>
            ))}
          </View>
        )}
        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput
              value={fbDraft}
              onChangeText={setFbDraft}
              placeholder="Suggest an improvement…"
              placeholderTextColor={colors.faint}
              style={[styles.input, { flex: 1 }]}
            />
            <Pressable onPress={sendFeedback} style={styles.sendBtn}>
              <Text style={styles.formSaveLabel}>Send</Text>
            </Pressable>
          </View>
        </View>
      </Card>

      <SectionLabel label="Farm & account" />
      <Card>
        <Row
          title="👤 Your role"
          trailing={
            <View style={[styles.roleChip, { backgroundColor: ROLE_BG[currentUser.role] }]}>
              <Text style={styles.roleChipLabel}>{ROLE_LABEL[currentUser.role]}</Text>
            </View>
          }
        />
        <Row
          title="👪 Family members"
          onPress={() => router.push('/more/family')}
          trailing={<Text style={styles.plainTrailing}>{users.length} · manage ›</Text>}
        />
        <Row title="🔒 Security & encryption" trailing={<Text style={[styles.plainTrailing, { color: colors.success }]}>On ›</Text>} />
        <Row
          title="☁️ OneDrive backup"
          onPress={oneDrivePress}
          trailing={<Text style={[styles.plainTrailing, { color: oneDriveColor }]}>{oneDriveLabel}</Text>}
        />
        <Row
          title="📅 Google Calendar"
          onPress={gcalPress}
          trailing={<Text style={[styles.plainTrailing, { color: gcalColor }]}>{gcalLabel}</Text>}
        />
        <Row
          title="🚪 Sign out"
          showDivider={false}
          onPress={signOut}
          trailing={<Text style={{ color: colors.faint }}>›</Text>}
        />
      </Card>
      <Text style={styles.footNote}>
        Admins can delete records and tasks. Members can add and update everything else. Kid mode is a simple chore
        view.
      </Text>

      {__DEV__ && (
        <View style={{ marginTop: 20 }}>
          <Pressable onPress={runSeed} disabled={seeding} style={styles.devSeedBtn}>
            <Text style={styles.devSeedLabel}>{seeding ? 'Seeding…' : 'Seed sample data (dev)'}</Text>
          </Pressable>
          {!!seedMsg && <Text style={styles.message}>{seedMsg}</Text>}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: fonts.displayExtraBold, fontSize: 21, color: colors.ink },
  moneyCard: { backgroundColor: colors.darkCard, borderRadius: radii.card, padding: 14, marginTop: 14, flexDirection: 'row', gap: 12, alignItems: 'center' },
  moneyIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#414a33', alignItems: 'center', justifyContent: 'center' },
  moneyTitle: { color: '#fff', fontWeight: '700', fontSize: 14 },
  moneySub: { color: colors.darkCardMuted, fontSize: 11.5, marginTop: 1 },
  auditRow: { backgroundColor: '#fff', borderRadius: radii.card, padding: 14, marginTop: 10, flexDirection: 'row', gap: 12, alignItems: 'center' },
  auditIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: colors.chipBg, alignItems: 'center', justifyContent: 'center' },
  auditTitle: { fontWeight: '700', fontSize: 14, color: colors.ink },
  auditSub: { fontSize: 11.5, color: colors.muted, marginTop: 1 },
  formCard: { padding: 14, marginBottom: 12 },
  input: {
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: radii.inputSm,
    padding: 11,
    fontSize: 13,
    backgroundColor: colors.surface,
    color: colors.ink,
  },
  formSaveBtn: { backgroundColor: colors.primary, borderRadius: 12, padding: 12, alignItems: 'center', marginTop: 10 },
  formSaveLabel: { color: '#fff', fontWeight: '700', fontSize: 13 },
  eqDivider: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  updateBtn: { borderWidth: 1.5, borderColor: colors.primary, borderRadius: 10, paddingVertical: 6, paddingHorizontal: 10 },
  updateBtnLabel: { fontSize: 11.5, color: colors.primary, fontWeight: '700' },
  eqEditForm: { paddingHorizontal: 16, paddingBottom: 14, gap: 8 },
  emptyCard: { padding: 24, alignItems: 'center' },
  emptyTitle: { fontWeight: '700', fontSize: 13, color: colors.ink, marginTop: 8 },
  emptyHelper: { fontSize: 12, color: colors.muted, marginTop: 3, textAlign: 'center' },
  feedbackCard: { padding: 16 },
  feedbackRow: { borderBottomWidth: 1, borderBottomColor: colors.divider, paddingBottom: 10 },
  feedbackHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  feedbackWho: { fontWeight: '700', fontSize: 12.5, color: colors.ink },
  feedbackDate: { fontWeight: '500', color: colors.muted },
  feedbackText: { fontSize: 12.5, color: '#4a4636', marginTop: 4 },
  sendBtn: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 11, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  roleChip: { borderRadius: 14, paddingVertical: 5, paddingHorizontal: 12 },
  roleChipLabel: { fontSize: 12, fontWeight: '700', color: '#fff' },
  plainTrailing: { fontSize: 12, color: colors.muted },
  footNote: { fontSize: 11, color: colors.faint, marginTop: 10, textAlign: 'center' },
  devSeedBtn: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.faint,
    borderRadius: radii.card,
    padding: 14,
    alignItems: 'center',
  },
  devSeedLabel: { fontSize: 12.5, fontWeight: '700', color: colors.muted },
  message: { fontSize: 12, color: colors.primaryDeep, textAlign: 'center', marginTop: 8 },
});
