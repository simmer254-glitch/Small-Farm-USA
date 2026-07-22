// Design tokens ported verbatim from the design handoff README's "Design Tokens" section.
// Single fixed palette — no light/dark switching.

export const colors = {
  background: '#e5e2d8',
  surface: '#faf8f2',
  card: '#fff',
  ink: '#2c3320',
  muted: '#8a8672',
  faint: '#b3af9d',
  divider: '#f0eee4',
  chipBg: '#eceadd',
  chipFg: '#4a4636',

  primary: '#5a6b3b',
  primaryHover: '#4c5b31',
  primaryDeep: '#3e4a29',
  primaryTint: '#f0f3e6',
  primaryTint2: '#e3ecd7',

  darkCard: '#2c3320',
  darkCardMuted: '#a8ad94',
  darkCardMuted2: '#8a9478',

  success: '#4a7a2e',
  netGreenOnDark: '#b8d18f',
  netRedOnDark: '#e0a48a',

  danger: '#a3401e',
  down: '#b5502a',
  up: '#5a8a3b',

  alertTint: '#f5e3d7',
  alertAccent: '#a35422',

  butcherBrown: '#7a4a2e',
  butcherTint: '#f0e4dd',

  soldTint: '#e8e4f0',
  soldAccent: '#5b4a8a',

  // Pets & working animals — visually distinct blue family
  petBg: '#f3f6fa',
  petBorder: '#dde6f0',
  petBorder2: '#c9d8e8',
  petInk: '#22436b',
  petMuted: '#5b789c',
  petAccent: '#2a63a8',
  petChipBg: '#e2eaf4',

  inputBorder: '#ddd9c8',
  inputBg: '#faf8f2',
  inputBgAlt: '#fff',
  focusOutline: '#5a6b3b',

  docsBannerBg: '#e8eef5',
  docsBannerBorder: '#cdd9e6',

  uploadDash: '#ccc7b2',
} as const;

export const radii = {
  chip: 20,
  chipSm: 18,
  card: 16,
  cardLg: 18,
  button: 16,
  buttonSm: 12,
  input: 12,
  inputSm: 10,
  avatar: 12,
  avatarLg: 16,
} as const;

export const spacing = {
  screenH: 22,
  screenTop: 44,
  screenBottom: 20,
  rowPadV: 13,
  rowPadH: 16,
  gapSm: 8,
  gapMd: 12,
  cardPad: 16,
  cardPadLg: 18,
} as const;

export const shadow = {
  card: {
    shadowColor: 'rgba(44,51,32,1)',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  fab: {
    shadowColor: 'rgba(44,51,32,1)',
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  popover: {
    shadowColor: 'rgba(44,51,32,1)',
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
  },
} as const;

export const hitSlop = { top: 8, bottom: 8, left: 8, right: 8 };
export const minHitTarget = 44;
