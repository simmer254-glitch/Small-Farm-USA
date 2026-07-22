import type { Task } from '@/domain/types';

export type CalendarCell = {
  key: string;
  day: string; // '' for leading blanks
  dateKey: string | null;
  isToday: boolean;
  hasOpenTask: boolean;
};

const pad2 = (n: number) => (n < 10 ? '0' : '') + n;

export function buildCalendarMonth(
  year: number,
  month: number, // 0-indexed
  tasks: Task[],
  todayIso: string
): { monthLabel: string; cells: CalendarCell[] } {
  const first = new Date(year, month, 1);
  const monthLabel = first.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  const firstWeekday = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const mKey = `${year}-${pad2(month + 1)}`;

  const cells: CalendarCell[] = [];
  for (let i = 0; i < firstWeekday; i++) {
    cells.push({ key: `blank-${i}`, day: '', dateKey: null, isToday: false, hasOpenTask: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dateKey = `${mKey}-${pad2(d)}`;
    cells.push({
      key: dateKey,
      day: String(d),
      dateKey,
      isToday: dateKey === todayIso,
      hasOpenTask: tasks.some((t) => t.date === dateKey && !t.done),
    });
  }
  return { monthLabel, cells };
}
