import { useEffect, useMemo, useState } from 'react';
import { Text, View, TextInput, Pressable, ScrollView, StyleSheet } from 'react-native';
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
import { Screen, Chip, Card, EmptyState, SectionLabel, CalendarDatePicker } from '@/components/ui';

const TASK_TYPES: TaskType[] = ['Butcher', 'Maintenance', 'Vaccination', 'Other'];

const REMINDER_OPTIONS: { minutes: number | null; label: string }[] = [
  { minutes: null, label: 'None' },
  { minutes: 0, label: 'At time' },
  { minutes: 10, label: '10 min before' },
  { minutes: 30, label: '30 min before' },
  { minutes: 60, label: '1 hour before' },
  { minutes: 1440, label: '1 day before' },
];

function formatTime12h(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

// '' represents "All day" — every half-hour slot in between.
const TIME_OPTIONS = ['', ...Array.from({ length: 48 }, (_, i) => `${String(Math.floor(i / 2)).padStart(2, '0')}:${i % 2 === 0 ? '00' : '30'}`)];

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
  const [time, setTime] = useState('');
  const [reminderMinutes, setReminderMinutes] = useState<number | null>(null);
  const [guestsText, setGuestsText] = useState('');
  const [type, setType] = useState<TaskType>('Butcher');
  const [assignee, setAssignee] = useState<string>('everyone');
  const [timePickerOpen, setTimePickerOpen] = useState(false);

  const resetFormExtras = () => {
    setTime('');
    setReminderMinutes(null);
    setGuestsText('');
    setTimePickerOpen(false);
  };

  // Opportunistic sync: catches tasks added from a device other than the
  // one holding the Google connection (only that device can actually push
  // to Google), same pattern already used on the Docs screen for OneDrive.
  // No true background sync — this only fires while the connected device
  // happens to have Calendar open.
  const pendingTaskCount = tasks.filter((t) => !t.gcalEventId).length;
  useEffect(() => {
    if (gcalConnected && pendingTaskCount > 0) syncPendingTasks();
  }, [gcalConnected, pendingTaskCount]);

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
    const input = {
      title: title.trim(),
      date,
      time: time.trim() || undefined,
      reminderMinutes: reminderMinutes ?? undefined,
      guestEmails: guestsText.trim()
        ? guestsText
            .split(',')
            .map((e) => e.trim())
            .filter(Boolean)
        : undefined,
      type,
      assigneeUserId: assignee,
    };
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
    resetFormExtras();
  };

  const openEdit = (t: Task) => {
    if (isKid) return;
    setEditingTaskId(t.id);
    setTitle(t.title);
    setDate(t.date);
    setTime(t.time ?? '');
    setReminderMinutes(t.reminderMinutes ?? null);
    setGuestsText((t.guestEmails ?? []).join(', '));
    setType(t.type);
    setAssignee(t.assigneeUserId);
    setShowForm(true);
  };

  const removeTask = async (t: Task) => {
    await deleteTask(t.id);
    if (t.gcalEventId) {
      // Mirrors buildAttendees' logic in googleCalendarStore.ts — only a
      // real (non-sentinel) assignee that actually resolves to a profile
      // would have been added as an attendee in the first place.
      const hasAssigneeAttendee = t.assigneeUserId !== 'everyone' && t.assigneeUserId !== 'kids' && users.some((u) => u.id === t.assigneeUserId);
      deleteTaskEvent(t.gcalEventId, hasAssigneeAttendee || !!t.guestEmails?.length);
    }
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
                resetFormExtras();
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
                  resetFormExtras();
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
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Butcher pigs P-14, P-15"
            placeholderTextColor={colors.faint}
            style={styles.input}
          />

          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
            <View style={{ flex: 1 }}>
              <CalendarDatePicker value={date} onChange={setDate} tasks={tasks} />
            </View>

            <View style={{ flex: 1 }}>
              <Pressable
                onPress={() => {
                  setTimePickerOpen((o) => !o);
                }}
                style={styles.select}>
                <Text style={styles.selectText}>🕐 {time ? formatTime12h(time) : 'All day'}</Text>
                <Text style={{ color: colors.muted }}>{timePickerOpen ? '▴' : '▾'}</Text>
              </Pressable>
              {timePickerOpen && (
                <View style={styles.pickerPopup}>
                  <ScrollView style={styles.timeScroll} nestedScrollEnabled>
                    {TIME_OPTIONS.map((opt) => (
                      <Pressable
                        key={opt || 'all-day'}
                        onPress={() => {
                          setTime(opt);
                          setTimePickerOpen(false);
                        }}
                        style={styles.optionRow}>
                        <Text style={[styles.optionText, opt === time && { color: colors.primary, fontWeight: '700' }]}>
                          {opt ? formatTime12h(opt) : 'All day'}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>
          </View>

          <View style={[styles.chipWrap, { alignItems: 'center', marginTop: 10 }]}>
            <Text style={styles.forLabel}>REMIND</Text>
            {REMINDER_OPTIONS.map((o) => (
              <Chip key={String(o.minutes)} label={o.label} selected={reminderMinutes === o.minutes} onPress={() => setReminderMinutes(o.minutes)} />
            ))}
          </View>
          <TextInput
            value={guestsText}
            onChangeText={setGuestsText}
            placeholder="Guest emails, comma-separated (optional)"
            placeholderTextColor={colors.faint}
            autoCapitalize="none"
            keyboardType="email-address"
            style={styles.input}
          />
          <Text style={styles.guestHelper}>They'll get a real Google Calendar invite once this syncs.</Text>
          <Pressable onPress={save} style={styles.formSaveBtn}>
            <Text style={styles.formSaveLabel}>{editingTaskId ? 'Save changes' : 'Add to calendar'}</Text>
          </Pressable>
        </Card>
      )}

      {sortedTasks.length > 0 ? (
        <Card>
          {sortedTasks.map((t, i) => {
            const days = daysUntil(t.date);
            const when = `${t.date}${t.time ? ` · ${formatTime12h(t.time)}` : ''} (${days === 0 ? 'today' : days > 0 ? `in ${days}d` : `${-days}d ago`})`;
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
                    {t.guestEmails?.length ? ` · 👥 ${t.guestEmails.length}` : ''}
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
  select: {
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: radii.inputSm,
    padding: 11,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectText: { fontSize: 13, color: colors.ink },
  pickerPopup: {
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: radii.inputSm,
    marginTop: 6,
    padding: 8,
    backgroundColor: '#fff',
  },
  timeScroll: { maxHeight: 200 },
  optionRow: { paddingVertical: 10, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: colors.divider },
  optionText: { fontSize: 13, color: colors.ink },
  guestHelper: { fontSize: 11, color: colors.muted, marginTop: 4 },
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
