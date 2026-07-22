import type { AnimalEventType, Species, TaskType } from './types';

export const SPECIES_EMOJI: Record<Species, string> = {
  cattle: '🐄',
  pig: '🐖',
  chicken: '🐔',
  dog: '🐕',
  cat: '🐈',
  horse: '🐴',
};

export const ANIMAL_EVENT_ICON: Record<AnimalEventType, string> = {
  born: '🍼',
  vax: '💉',
  weight: '⚖️',
  tag: '🏷',
  note: '📝',
  sold: '💵',
  butchered: '🥩',
};

export const TASK_TYPE_ICON: Record<TaskType, string> = {
  Butcher: '🥩',
  Maintenance: '🔧',
  Vaccination: '💉',
  Other: '📌',
};

export const KID_CHORE_OPTIONS = [
  { icon: '🥚', label: 'Collected eggs' },
  { icon: '🌾', label: 'Fed & watered' },
  { icon: '💧', label: 'Filled water' },
  { icon: '👀', label: 'Checked animals' },
] as const;
