import { useMemo, useState } from 'react';
import { Text, View, TextInput, Pressable, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useStore } from '@/store/store';
import { useProfile } from '@/store/authStore';
import { useGoogleCalendarStore } from '@/store/googleCalendarStore';
import { buildCalendarMonth } from '@/utils/calendarGrid';
import { daysUntil, relativeDayLabel, todayIso } from '@/domain/dates';
import { TASK_TYPE_ICON } from '@/domain/icons';
import { icsForTask, icsFilename } from '@/domain/ics';
import { saveAndShareText } from '@/utils/exportFiles';
import type { Task, TaskType } from '@/domain/types';
import { colors, radii } from '@/theme/tokens';
import { fonts } from '@/theme/typography';
import { Screen, Chip, Card, EmptyState, SectionLabel } from '@/components/ui';

const TASK_TYPES: TaskType[] = ['Butcher', 'Maintenance', 'Vaccination', 'Other'];

export default function CalendarScreen() {
  const params = useLocalSearchParams<{ openForm?: string }>();
  const tasks = useStore((s) => s.tasks);
  const users = useStore((s) => s.profiles);
  const currentUser = useProfile();
  const addTask = useStore((s) => s.addTask);
  const updateTask = useStore((s) => s.updateTask);
  const toggleTask = useStore((s) => s.toggleTask);
  const deleteTask = useStore((s) => s.deleteTask);
  const gcalConnected = useGoogleCalendarStore((s) => s.connected);
  const gcalLastSyncAt = useGoogleCalendarStore((s) => s.lastSyncAt);
  const gcalLastSyncError = useGoogleCalendarStore((s) => s.lastSyncError);
  const syncPendingTasks = useGoogleCalendarStore((s) => s.syncPendingTasks);
  const syncTaskUpdate = useGoogleCalendarStore((s) => s.syncTaskUpdate);
  const deleteTaskEvent = useGoogleCalendarStore((s) => s.deleteTaskEvent);

  const isKid = currentUser.role === 'kid';
  const today = todayIso();
  const now = new Date();
  const [calOffset, setCalOffset] = useState(0);
  const [showForm, setShowForm] = useState(params.openForm === '1');
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(today);
  const [type, setType] = useState<TaskType>('Butcher');
  const [assignee, setAssignee] = useState<string>('everyone');

  const base = new Date(now.getFullYear(), now.getMonth() + calOffset, 1);
  const { monthLabel, cells } = useMemo(
    () => buildCalendarMonth(base.getFullYear(), base.getMonth(), tasks, today),
    [base, tasks, today]
  );

  const assigneeOptions = [
    { key: 'everyone', label: 'Everyone' },
    ...users.filter((u) => u.role !== 'kid').map((u) => ({ key: u.id, label: u.name })),
    { key: 'kids', label: 'Kids' },
  ];

  const assigneeLabel = (id: string) =>
    id === 'everyone' ? 'Everyone' : id === 'kids' ? 'Kids' : users.find((u) => u.id === id)?.name || id;

  const sortedTasks = [...tasks].sort((a, b) => a.date.localeCompare(b.date));

  const save = async () => {
    if (!title.trim()) return;
    const input = { title: title.trim(), date, type, assigneeUserId: assignee };
    if (editingTaskId) {
      await updateTask(editingTaskId, input);
      const updated = { ...tasks.find((t) => t.id === editingTaskId)!, ...input };
      // Fire-and-forget — never block the save on a round trip to Google.
      syncTaskUpdate(updated, assigneeLabel(assignee));
    } else {
      await addTask(input);
      syncPendingTasks();
    }
    setShowForm(false);
    setEditingTaskId(null);
    setTitle('');
  };

  const openEdit = (t: Task) => {
    if (isKid) return;
    setEditingTaskId(t.id);
    setTitle(t.title);
    setDate(t.date);
    setType(t.type);
    setAssignee(t.assigneeUserId);
    setShowForm(true);
  };

  const removeTask = async (t: Task) => {
    await deleteTask(t.id);
    if (t.gcalEventId) deleteTaskEvent(t.gcalEventId);
  };

  const invite = (t: Task) => {
    saveAndShareText(icsFilename(t), icsForTask(t), 'text/calendar');
  };

  const gcalBannerTitle = gcalLastSyncError
    ? 'Google Calendar sync failed'
    : gcalConnected
      ? 'Synced to Google Calendar'
      : 'Not connected to Google Calendar yet';
  const gcalBannerSub = gcalLastSyncError
    ? gcalLastSyncError
    : gcalConnected
      ? `Owner's primary calendar${gcalLastSyncAt ? ` · last sync ${new Date(gcalLastSyncAt).toLocaleString()}` : ''}`
      : 'Tasks stay in the app either way — connect in More › Google Calendar for automatic sync';

  return (
    <Screen>
      <Text style={styles.title}>Calendar</Text>
      <Text style={styles.helper}>Anyone can add a task, assign it, and send a calendar invite (.ics).</Text>

      <View style={[styles.banner, gcalLastSyncError && styles.bannerError]}>
        <View style={[styles.bannerIcon, gcalLastSyncError && styles.bannerIconError]}>
          <Text style={styles.bannerIconText}>GC</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.bannerTitle, gcalLastSyncError && styles.bannerTitleError]}>{gcalBannerTitle}</Text>
          <Text style={styles.bannerSub}>{gcalBannerSub}</Text>
        </View>
      </View>

      <Card style={styles.calCard}>
        <View style={styles.calHeader}>
          <Pressable onPress={() => setCalOffset((o) => o - 1)} style={styles.navBtn}>
            <Text style={styles.navBtnText}>‹</Text>
          </Pressable>
          <Text style={styles.monthLabel}>{monthLabel}</Text>
          <Pressable onPress={() => setCalOffset((o) => o + 1)} style={styles.navBtn}>
            <Text style={styles.navBtnText}>›</Text>
          </Pressable>
        </View>
        <View style={styles.weekdayRow}>
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
            <Text key={i} style={styles.weekdayText}>
              {d}
            </Text>
          ))}
        </View>
        <View style={styles.grid}>
          {cells.map((c) => (
            <Pressable
              key={c.key}
              disabled={!c.dateKey}
              onPress={() => {
                if (!c.dateKey || isKid) return;
                setEditingTaskId(null);
                setDate(c.dateKey);
                setShowForm(true);
              }}
              style={[styles.cell, c.isToday && { backgroundColor: colors.primary }]}>
              <Text style={[styles.cellDay, { color: c.isToday ? '#fff' : colors.ink, fontWeight: c.isToday ? '800' : '500' }]}>
                {c.day}
              </Text>
              {c.hasOpenTask && <View style={styles.dot} />}
            </Pressable>
          ))}
        </View>
      </Card>

      <SectionLabel
        label="Upcoming"
        action={
          isKid
            ? undefined
            : {
                label: showForm ? '× Close' : '+ Add task',
                onPress: () => {
                  setEditingTaskId(null);
                  setShowForm((s) => !s);
                },
              }
        }
      />

      {showForm && !isKid && (
        <Card style={styles.formCard}>
          <View style={styles.chipWrap}>
            {TASK_TYPES.map((t) => (
              <Chip key={t} label={`${TASK_TYPE_ICON[t]} ${t}`} selected={type === t} onPress={() => setType(t)} />
            ))}
          </View>
          <View style={[styles.chipWrap, { alignItems: 'center' }]}>
            <Text style={styles.forLabel}>FOR</Text>
            {assigneeOptions.map((o) => (
              <Chip key={o.key} label={o.label} selected={assignee === o.key} onPress={() => setAssignee(o.key)} />
            ))}
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Butcher pigs P-14, P-15"
              placeholderTextColor={colors.faint}
              style={[styles.input, { flex: 1 }]}
            />
            <TextInput value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" placeholderTextColor={colors.faint} style={[styles.input, { width: 130 }]} />
          </View>
          <Pressable onPress={save} style={styles.formSaveBtn}>
            <Text style={styles.formSaveLabel}>{editingTaskId ? 'Save changes' : 'Add to calendar'}</Text>
          </Pressable>
        </Card>
      )}

      {sortedTasks.length > 0 ? (
        <Card>
          {sortedTasks.map((t, i) => {
            const days = daysUntil(t.date);
            const when = `${t.date} (${days === 0 ? 'today' : days > 0 ? `in ${days}d` : `${-days}d ago`})`;
            return (
              <View
                key={t.id}
                style={[styles.taskRow, i < sortedTasks.length - 1 && styles.taskRowDivider]}>
                <Pressable
                  onPress={() => toggleTask(t.id)}
                  style={[
                    styles.checkbox,
                    { backgroundColor: t.done ? colors.primary : '#fff', borderColor: t.done ? colors.primary : '#ccc7b2' },
                  ]}>
                  <Text style={{ color: '#fff', fontSize: 12 }}>{t.done ? '✓' : ''}</Text>
                </Pressable>
                <View style={styles.taskTypeIcon}>
                  <Text style={{ fontSize: 13 }}>{TASK_TYPE_ICON[t.type]}</Text>
                </View>
                <Pressable style={{ flex: 1, minWidth: 0 }} onPress={() => openEdit(t)} disabled={isKid}>
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.taskTitle,
                      { color: t.done ? colors.faint : colors.ink, textDecorationLine: t.done ? 'line-through' : 'none' },
                    ]}>
                    {t.title}
                  </Text>
                  <Text numberOfLines={1} style={styles.taskSub}>
                    {when} · for {assigneeLabel(t.assigneeUserId)} · by {users.find((u) => u.id === t.creatorUserId)?.name || t.creatorUserId}
                    {t.gcalEventId ? ' · 📅 synced' : ''}
                  </Text>
                </Pressable>
                <Pressable onPress={() => invite(t)} style={styles.inviteBtn}>
                  <Text style={styles.inviteLabel}>📆 Invite</Text>
                </Pressable>
                {currentUser.role === 'admin' && (
                  <Pressable onPress={() => removeTask(t)} hitSlop={8} style={{ padding: 4 }}>
                    <Text style={{ color: colors.faint, fontSize: 15 }}>✕</Text>
                  </Pressable>
                )}
              </View>
            );
          })}
        </Card>
      ) : (
        <EmptyState
          icon="📅"
          title="Nothing scheduled"
          helper='Tap a date or "+ Add task" to schedule a butcher date, service, or vaccination.'
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: fonts.displayExtraBold, fontSize: 21, color: colors.ink },
  helper: { fontSize: 12.5, color: colors.muted, marginTop: 3 },
  banner: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    backgroundColor: colors.docsBannerBg,
    borderWidth: 1,
    borderColor: colors.docsBannerBorder,
    borderRadius: 14,
    padding: 14,
    marginTop: 14,
  },
  bannerError: { backgroundColor: colors.alertTint, borderColor: colors.alertAccent },
  bannerIcon: { width: 30, height: 30, borderRadius: 8, backgroundColor: colors.petAccent, alignItems: 'center', justifyContent: 'center' },
  bannerIconError: { backgroundColor: colors.alertAccent },
  bannerIconText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  bannerTitle: { fontWeight: '700', fontSize: 12.5, color: colors.petInk },
  bannerTitleError: { color: colors.alertAccent },
  bannerSub: { fontSize: 11.5, color: colors.petMuted },
  calCard: { padding: 14, marginTop: 14 },
  calHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  navBtn: { width: 30, height: 30, borderRadius: 9, backgroundColor: colors.chipBg, alignItems: 'center', justifyContent: 'center' },
  navBtnText: { fontWeight: '700', color: colors.chipFg },
  monthLabel: { fontFamily: fonts.displayExtraBold, fontSize: 15, color: colors.ink },
  weekdayRow: { flexDirection: 'row', marginBottom: 4 },
  weekdayText: { flex: 1, textAlign: 'center', fontSize: 10, fontWeight: '700', color: colors.faint },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, height: 38, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  cellDay: { fontSize: 12 },
  dot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: colors.alertAccent, marginTop: 2 },
  formCard: { padding: 14, marginBottom: 12 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  forLabel: { fontSize: 11, fontWeight: '700', color: colors.muted, marginRight: 2 },
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
  inviteBtn: { borderWidth: 1.5, borderColor: colors.primary, borderRadius: 9, paddingVertical: 5, paddingHorizontal: 8 },
  inviteLabel: { fontSize: 10.5, color: colors.primary, fontWeight: '700' },
  taskRow: { flexDirection: 'row', gap: 12, alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16 },
  taskRowDivider: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  checkbox: { width: 22, height: 22, borderRadius: 7, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  taskTypeIcon: { width: 30, height: 30, borderRadius: 9, backgroundColor: colors.chipBg, alignItems: 'center', justifyContent: 'center' },
  taskTitle: { fontFamily: fonts.bodySemiBold, fontSize: 13 },
  taskSub: { fontSize: 11.5, color: colors.muted, marginTop: 1 },
});
