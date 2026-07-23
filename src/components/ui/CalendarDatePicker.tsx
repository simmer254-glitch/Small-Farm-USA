import { useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { buildCalendarMonth } from '@/utils/calendarGrid';
import { parseLocalDate, todayIso } from '@/domain/dates';
import type { Task } from '@/domain/types';
import { colors, radii } from '@/theme/tokens';
import { fonts } from '@/theme/typography';

const WEEKDAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

// A small popup calendar-grid date picker, reusing the exact same
// buildCalendarMonth util the Calendar screen's own main month view uses.
// `tasks` is optional — the "has open task" dot only makes sense where that
// concept exists (Calendar); other screens (e.g. Money) just pass none.
export function CalendarDatePicker({ value, onChange, tasks = [] }: { value: string; onChange: (date: string) => void; tasks?: Task[] }) {
  const [open, setOpen] = useState(false);
  const [offset, setOffset] = useState(0);
  const today = todayIso();

  const base = useMemo(() => {
    const d = parseLocalDate(value);
    return new Date(d.getFullYear(), d.getMonth() + offset, 1);
  }, [value, offset]);
  const { monthLabel, cells } = useMemo(() => buildCalendarMonth(base.getFullYear(), base.getMonth(), tasks, today), [base, tasks, today]);

  return (
    <View>
      <Pressable
        onPress={() => {
          setOffset(0);
          setOpen((o) => !o);
        }}
        style={styles.select}>
        <Text style={styles.selectText}>📅 {value}</Text>
        <Text style={{ color: colors.muted }}>{open ? '▴' : '▾'}</Text>
      </Pressable>
      {open && (
        <View style={styles.popup}>
          <View style={styles.header}>
            <Pressable onPress={() => setOffset((o) => o - 1)} style={styles.navBtn}>
              <Text style={styles.navBtnText}>‹</Text>
            </Pressable>
            <Text style={styles.monthLabel}>{monthLabel}</Text>
            <Pressable onPress={() => setOffset((o) => o + 1)} style={styles.navBtn}>
              <Text style={styles.navBtnText}>›</Text>
            </Pressable>
          </View>
          <View style={styles.weekdayRow}>
            {WEEKDAY_LETTERS.map((d, i) => (
              <Text key={i} style={styles.weekdayText}>
                {d}
              </Text>
            ))}
          </View>
          <View style={styles.grid}>
            {cells.map((c) => {
              const isSelected = c.dateKey === value;
              return (
                <Pressable
                  key={c.key}
                  disabled={!c.dateKey}
                  onPress={() => {
                    if (!c.dateKey) return;
                    onChange(c.dateKey);
                    setOpen(false);
                  }}
                  style={[styles.cell, isSelected && { backgroundColor: colors.primary }, !isSelected && c.isToday && styles.cellToday]}>
                  <Text style={[styles.cellDay, { color: isSelected ? '#fff' : colors.ink, fontWeight: isSelected || c.isToday ? '800' : '500' }]}>{c.day}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
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
  popup: {
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: radii.inputSm,
    marginTop: 6,
    padding: 8,
    backgroundColor: '#fff',
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  navBtn: { width: 30, height: 30, borderRadius: 9, backgroundColor: colors.chipBg, alignItems: 'center', justifyContent: 'center' },
  navBtnText: { fontWeight: '700', color: colors.chipFg },
  monthLabel: { fontFamily: fonts.displayExtraBold, fontSize: 15, color: colors.ink },
  weekdayRow: { flexDirection: 'row', marginBottom: 4 },
  weekdayText: { flex: 1, textAlign: 'center', fontSize: 10, fontWeight: '700', color: colors.faint },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, height: 38, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  cellToday: { borderWidth: 1.5, borderColor: colors.primary },
  cellDay: { fontSize: 12 },
});
