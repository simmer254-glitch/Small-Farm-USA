import type { Animal, AnimalEvent, Business, Species } from './types';

// Average month, in ms — exact constant from the prototype. Do not swap for a calendar library:
// the suggestion boundaries below are tuned against this exact value.
const MS_PER_AVG_MONTH = 2629800000;

export function ageMo(born: string, now: number | Date = Date.now()): number {
  const nowMs = now instanceof Date ? now.getTime() : now;
  return Math.max(0, (nowMs - new Date(born).getTime()) / MS_PER_AVG_MONTH);
}

export function ageLabel(born: string, now: number | Date = Date.now()): string {
  const m = ageMo(born, now);
  if (m < 3) {
    const w = Math.round(m * 4.345);
    return `${w} wk`;
  }
  if (m < 24) {
    return `${Math.round(m * 10) / 10} mo`;
  }
  return `${Math.round(m / 1.2) / 10} yr`;
}

export function lastWeighInEvent(animal: Animal): AnimalEvent | null {
  return animal.events.find((e) => (e.type === 'weight' || e.type === 'born') && e.lb != null) ?? null;
}

export function lastWeight(animal: Animal): number | null {
  return lastWeighInEvent(animal)?.lb ?? null;
}

export type Suggestion = { title: string; body: string };

export function suggestionFor(animal: Animal, now: number | Date = Date.now()): Suggestion | null {
  if (animal.status !== 'active' || animal.cls === 'pet') return null;
  const m = ageMo(animal.born, now);
  const lb = lastWeight(animal);

  if (animal.species === 'cattle') {
    if ((animal.sex === 'Heifer' || animal.sex === 'Steer') && m >= 6 && m <= 8.5) {
      return {
        title: 'In the weaning window',
        body:
          'Calves wean best at 6–8 months / 450–600 lb. This one is ' +
          ageLabel(animal.born, now) +
          (lb ? ` at ~${lb} lb (last weigh-in)` : ' — log a weight to sharpen this') +
          '.',
      };
    }
    if (animal.sex === 'Steer' && m >= 18) {
      return {
        title: 'Near typical finish age',
        body:
          'Steers typically finish at 1,100–1,400 lb around 18–22 months.' +
          (lb ? ` Last weigh-in: ${lb} lb.` : ' Log a current weight to confirm.'),
      };
    }
  }
  if (animal.species === 'pig' && (m >= 5.5 || (lb != null && lb >= 250))) {
    return {
      title: 'Near market weight',
      body:
        'Pigs are typically butchered at 250–290 lb (~6 months).' +
        (lb ? ` Last weigh-in: ${lb} lb.` : ' Log a weight to confirm.'),
    };
  }
  if (animal.species === 'chicken' && m >= 1.8 && m < 6) {
    return {
      title: 'Check processing age',
      body:
        'Meat birds (Cornish Cross) process best at 8–10 weeks. This record is ' +
        ageLabel(animal.born, now) +
        ' old.',
    };
  }
  return null;
}

export type AnimalBadgeTone = 'ok' | 'action' | 'sold' | 'butchered';

export function animalBadgeTone(animal: Animal, now: number | Date = Date.now()): AnimalBadgeTone {
  if (animal.status === 'sold') return 'sold';
  if (animal.status === 'butchered') return 'butchered';
  if (suggestionFor(animal, now)) return 'action';
  return 'ok';
}

export function businessForSpecies(species: Species): Business {
  if (species === 'cattle') return 'Cattle';
  if (species === 'pig') return 'Hogs';
  if (species === 'chicken') return 'Poultry';
  return 'General';
}
