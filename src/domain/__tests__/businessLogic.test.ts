import { ageMo, ageLabel, lastWeight, suggestionFor, businessForSpecies, animalBadgeTone } from '../businessLogic';
import type { Animal } from '../types';

const NOW = new Date('2026-07-17T00:00:00Z');

function daysAgo(days: number): string {
  const d = new Date(NOW);
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

function monthsAgo(months: number): string {
  // Keep full ISO precision (no date-only slicing) — the wk/mo/yr boundary tests
  // are tight enough that truncating to a day would flip them across the boundary.
  return new Date(NOW.getTime() - months * 2629800000).toISOString();
}

function makeAnimal(overrides: Partial<Animal>): Animal {
  return {
    id: 'a1',
    cls: 'livestock',
    species: 'cattle',
    tag: '100',
    name: '',
    sex: 'Heifer',
    born: monthsAgo(7),
    color: 'Black',
    dam: '?',
    count: 1,
    status: 'active',
    events: [],
    ...overrides,
  };
}

describe('ageLabel / ageMo boundaries', () => {
  test('just under 3 months shows weeks', () => {
    expect(ageLabel(monthsAgo(2.99), NOW)).toMatch(/wk$/);
  });
  test('at 3 months shows months', () => {
    expect(ageLabel(monthsAgo(3.0), NOW)).toMatch(/mo$/);
  });
  test('just under 24 months shows months', () => {
    expect(ageLabel(monthsAgo(23.99), NOW)).toMatch(/mo$/);
  });
  test('at 24 months shows years', () => {
    expect(ageLabel(monthsAgo(24.0), NOW)).toMatch(/yr$/);
  });
  test('ageMo never negative for future-ish rounding', () => {
    expect(ageMo(NOW.toISOString(), NOW)).toBe(0);
  });
});

describe('lastWeight', () => {
  test('prefers most recent weight/born event with lb', () => {
    const a = makeAnimal({
      events: [
        { id: '3', date: '2026-06-01', type: 'weight', title: 'Weighed 500 lb', lb: 500, actor: 'You' },
        { id: '2', date: '2026-01-01', type: 'weight', title: 'Weighed 300 lb', lb: 300, actor: 'You' },
        { id: '1', date: '2025-12-01', type: 'born', title: 'Born · 75 lb', lb: 75, actor: 'You' },
      ],
    });
    expect(lastWeight(a)).toBe(500);
  });
  test('returns null when no weight ever logged', () => {
    const a = makeAnimal({ events: [{ id: '1', date: '2025-12-01', type: 'born', title: 'Born', lb: null, actor: 'You' }] });
    expect(lastWeight(a)).toBeNull();
  });
});

describe('suggestionFor', () => {
  test('cattle heifer at 7mo → weaning window', () => {
    const a = makeAnimal({ species: 'cattle', sex: 'Heifer', born: monthsAgo(7) });
    expect(suggestionFor(a, NOW)?.title).toBe('In the weaning window');
  });
  test('cattle steer at 7mo → weaning window', () => {
    const a = makeAnimal({ species: 'cattle', sex: 'Steer', born: monthsAgo(7) });
    expect(suggestionFor(a, NOW)?.title).toBe('In the weaning window');
  });
  test('cattle bull at 7mo → no suggestion (sex-gated)', () => {
    const a = makeAnimal({ species: 'cattle', sex: 'Bull', born: monthsAgo(7) });
    expect(suggestionFor(a, NOW)).toBeNull();
  });
  test('cattle steer at 19mo → near finish age', () => {
    const a = makeAnimal({ species: 'cattle', sex: 'Steer', born: monthsAgo(19) });
    expect(suggestionFor(a, NOW)?.title).toBe('Near typical finish age');
  });
  test('pig at 6mo → near market weight', () => {
    const a = makeAnimal({ species: 'pig', sex: 'Barrow', born: monthsAgo(6) });
    expect(suggestionFor(a, NOW)?.title).toBe('Near market weight');
  });
  test('pig under age but heavy → near market weight', () => {
    const a = makeAnimal({
      species: 'pig',
      sex: 'Gilt',
      born: monthsAgo(3),
      events: [{ id: '1', date: daysAgo(5), type: 'weight', title: 'Weighed 260 lb', lb: 260, actor: 'You' }],
    });
    expect(suggestionFor(a, NOW)?.title).toBe('Near market weight');
  });
  test('chicken at 3mo → check processing age', () => {
    const a = makeAnimal({ species: 'chicken', sex: 'Pullet', born: monthsAgo(3) });
    expect(suggestionFor(a, NOW)?.title).toBe('Check processing age');
  });
  test('pets never get a suggestion', () => {
    const a = makeAnimal({ cls: 'pet', species: 'dog', born: monthsAgo(7) });
    expect(suggestionFor(a, NOW)).toBeNull();
  });
  test('sold animals never get a suggestion', () => {
    const a = makeAnimal({ species: 'cattle', sex: 'Steer', born: monthsAgo(19), status: 'sold' });
    expect(suggestionFor(a, NOW)).toBeNull();
  });
  test('butchered animals never get a suggestion', () => {
    const a = makeAnimal({ species: 'pig', born: monthsAgo(6), status: 'butchered' });
    expect(suggestionFor(a, NOW)).toBeNull();
  });
  test('dead animals never get a suggestion, and badge tone is "dead"', () => {
    const a = makeAnimal({ species: 'cattle', sex: 'Steer', born: monthsAgo(19), status: 'dead' });
    expect(suggestionFor(a, NOW)).toBeNull();
    expect(animalBadgeTone(a, NOW)).toBe('dead');
  });
});

describe('businessForSpecies', () => {
  test('cattle -> Cattle, pig -> Hogs, chicken -> Poultry', () => {
    expect(businessForSpecies('cattle')).toBe('Cattle');
    expect(businessForSpecies('pig')).toBe('Hogs');
    expect(businessForSpecies('chicken')).toBe('Poultry');
  });
  test('pets/other -> General', () => {
    expect(businessForSpecies('dog')).toBe('General');
    expect(businessForSpecies('cat')).toBe('General');
    expect(businessForSpecies('horse')).toBe('General');
  });
});
