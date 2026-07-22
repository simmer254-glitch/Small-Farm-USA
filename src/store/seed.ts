import type {
  Animal,
  AuditEntry,
  Auction,
  Chore,
  Equipment,
  Feedback,
  Task,
  Transaction,
  User,
} from '@/domain/types';
import { businessForSpecies } from '@/domain/businessLogic';
import { localDateString } from '@/domain/dates';
import { makeId } from './id';

const today = () => localDateString();
const daysFromNow = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return localDateString(d);
};
const monthsAgoDate = (months: number) => localDateString(Date.now() - months * 2629800000);

export const seedUsers: User[] = [
  { id: 'dad', name: 'Dad', email: 'dad@example.com', role: 'admin' },
  { id: 'mom', name: 'Mom', email: 'mom@example.com', role: 'member' },
  { id: 'kid1', name: 'Jake', email: '', role: 'kid' },
];

export const seedAnimals: Animal[] = [
  {
    id: 'an-daisy',
    cls: 'livestock',
    species: 'cattle',
    tag: '214',
    name: 'Daisy',
    sex: 'Heifer',
    born: monthsAgoDate(7),
    color: 'Black, white face',
    dam: '101',
    count: 1,
    status: 'active',
    events: [
      { id: makeId(), date: monthsAgoDate(1), type: 'weight', title: 'Weighed 480 lb', lb: 480, actor: 'Mom' },
      { id: makeId(), date: monthsAgoDate(7), type: 'tag', title: 'Tagged #214', actor: 'Dad' },
      { id: makeId(), date: monthsAgoDate(7), type: 'born', title: 'Born · 78 lb · dam 101', lb: 78, actor: 'Dad' },
    ],
  },
  {
    id: 'an-steer19',
    cls: 'livestock',
    species: 'cattle',
    tag: '188',
    name: '',
    sex: 'Steer',
    born: monthsAgoDate(19),
    color: 'Red, white markings',
    dam: '104',
    count: 1,
    status: 'active',
    events: [
      { id: makeId(), date: monthsAgoDate(2), type: 'weight', title: 'Weighed 1,180 lb', lb: 1180, actor: 'Dad' },
      { id: makeId(), date: monthsAgoDate(19), type: 'tag', title: 'Tagged #188', actor: 'Dad' },
      { id: makeId(), date: monthsAgoDate(19), type: 'born', title: 'Born · 82 lb · dam 104', lb: 82, actor: 'Dad' },
    ],
  },
  {
    id: 'an-bull101',
    cls: 'livestock',
    species: 'cattle',
    tag: '101',
    name: 'Duke',
    sex: 'Bull',
    born: monthsAgoDate(40),
    color: 'Black',
    dam: '?',
    count: 1,
    status: 'active',
    events: [
      { id: makeId(), date: monthsAgoDate(40), type: 'tag', title: 'Tagged #101', actor: 'Dad' },
      { id: makeId(), date: monthsAgoDate(40), type: 'born', title: 'Born', lb: null, actor: 'Dad' },
    ],
  },
  {
    id: 'an-soldsteer',
    cls: 'livestock',
    species: 'cattle',
    tag: '77',
    name: '',
    sex: 'Steer',
    born: monthsAgoDate(24),
    color: 'Black',
    dam: '104',
    count: 1,
    status: 'sold',
    events: [
      {
        id: makeId(),
        date: daysFromNow(-10),
        type: 'sold',
        title: 'Sold to Sterling Livestock · $1,850',
        actor: 'Dad',
      },
      { id: makeId(), date: monthsAgoDate(24), type: 'tag', title: 'Tagged #77', actor: 'Dad' },
      { id: makeId(), date: monthsAgoDate(24), type: 'born', title: 'Born · dam 104', lb: 80, actor: 'Dad' },
    ],
  },
  {
    id: 'an-pig-market',
    cls: 'livestock',
    species: 'pig',
    tag: 'P-14',
    name: '',
    sex: 'Barrow',
    born: monthsAgoDate(6),
    color: 'Pink',
    dam: 'P-2',
    count: 1,
    status: 'active',
    events: [
      { id: makeId(), date: daysFromNow(-3), type: 'weight', title: 'Weighed 265 lb', lb: 265, actor: 'Dad' },
      { id: makeId(), date: monthsAgoDate(6), type: 'tag', title: 'Tagged P-14', actor: 'Mom' },
      { id: makeId(), date: monthsAgoDate(6), type: 'born', title: 'Born · 3 lb · dam P-2', lb: 3, actor: 'Mom' },
    ],
  },
  {
    id: 'an-pig-young',
    cls: 'livestock',
    species: 'pig',
    tag: 'P-20',
    name: '',
    sex: 'Gilt',
    born: monthsAgoDate(2),
    color: 'Pink, black spots',
    dam: 'P-2',
    count: 1,
    status: 'active',
    events: [{ id: makeId(), date: monthsAgoDate(2), type: 'born', title: 'Born · 3 lb · dam P-2', lb: 3, actor: 'Mom' }],
  },
  {
    id: 'an-pig-butchered',
    cls: 'livestock',
    species: 'pig',
    tag: 'P-6',
    name: '',
    sex: 'Barrow',
    born: monthsAgoDate(7),
    color: 'Pink',
    dam: 'P-1',
    count: 1,
    status: 'butchered',
    events: [
      { id: makeId(), date: daysFromNow(-15), type: 'butchered', title: 'Marked butchered', actor: 'Dad' },
      { id: makeId(), date: monthsAgoDate(7), type: 'born', title: 'Born · dam P-1', lb: 3, actor: 'Mom' },
    ],
  },
  {
    id: 'an-broilers',
    cls: 'livestock',
    species: 'chicken',
    tag: 'B-1',
    name: '',
    sex: 'Straight run',
    born: monthsAgoDate(3),
    color: 'White',
    dam: '?',
    count: 25,
    status: 'active',
    events: [
      { id: makeId(), date: monthsAgoDate(3), type: 'tag', title: 'Tagged B-1', actor: 'Mom' },
      { id: makeId(), date: monthsAgoDate(3), type: 'born', title: 'Batch received · 25 chicks', lb: null, actor: 'Mom' },
    ],
  },
  {
    id: 'an-blue',
    cls: 'pet',
    species: 'dog',
    tag: 'Blue',
    name: 'Blue',
    sex: '—',
    born: monthsAgoDate(30),
    color: 'Blue heeler',
    dam: '—',
    count: 1,
    status: 'active',
    events: [{ id: makeId(), date: monthsAgoDate(30), type: 'note', title: 'Added to the family', actor: 'Dad' }],
  },
  {
    id: 'an-duke-horse',
    cls: 'pet',
    species: 'horse',
    tag: 'Cash',
    name: 'Cash',
    sex: '—',
    born: monthsAgoDate(96),
    color: 'Bay',
    dam: '—',
    count: 1,
    status: 'active',
    events: [{ id: makeId(), date: monthsAgoDate(96), type: 'note', title: 'Added to the family', actor: 'Mom' }],
  },
];

export const seedTransactions: Transaction[] = [
  {
    id: 'tx-feed',
    kind: 'expense',
    desc: 'Feed — creep pellets',
    amount: 340,
    date: daysFromNow(-4),
    scheduleFLine: 'Line 16 · Feed',
    business: 'Cattle',
  },
  {
    id: 'tx-vet',
    kind: 'expense',
    desc: 'Vet visit — hoof trim & checkup',
    amount: 120,
    date: daysFromNow(-9),
    scheduleFLine: 'Line 31 · Vet, breeding & medicine',
    business: 'Hogs',
  },
  {
    id: 'tx-sale',
    kind: 'income',
    desc: 'Sold #77 — Sterling Livestock',
    amount: 1850,
    date: daysFromNow(-10),
    scheduleFLine: 'Line 2 · Sales of raised livestock/produce',
    business: 'Cattle',
  },
];

export const seedTasks: Task[] = [
  {
    id: 'task-vax',
    title: 'Vaccinate calves — 7-way blackleg',
    date: daysFromNow(5),
    type: 'Vaccination',
    assigneeUserId: 'everyone',
    creatorUserId: 'dad',
    done: false,
  },
  {
    id: 'task-eggs',
    title: 'Collect eggs & check waterers',
    date: today(),
    type: 'Other',
    assigneeUserId: 'kids',
    creatorUserId: 'mom',
    done: false,
  },
  {
    id: 'task-butcher',
    title: 'Butcher hogs P-14',
    date: daysFromNow(10),
    type: 'Butcher',
    assigneeUserId: 'dad',
    creatorUserId: 'dad',
    done: false,
  },
];

export const seedEquipment: Equipment[] = [
  {
    id: 'eq-tractor',
    name: 'JD 5075E tractor',
    hours: '812',
    unit: 'hrs/mi',
    lastService: 'Oil change — Jun 2',
    history: [{ id: makeId(), date: daysFromNow(-45), hours: '790', note: 'Oil change' }],
  },
];

export const seedChores: Chore[] = [];

export const seedFeedback: Feedback[] = [
  {
    id: 'fb-1',
    who: 'Mom',
    date: daysFromNow(-6),
    text: 'Would love a reminder a few days before vaccination due dates.',
    status: 'New',
  },
];

export const seedAuctions: Auction[] = [
  {
    key: 'sterling',
    name: 'Sterling Livestock',
    meta: 'Sterling, CO · Jul 15 sale · 1,840 head',
    quotes: [
      { label: 'Steers 500–600 lb', note: 'Med/Lg 1', price: '$342.50', delta: '▲ $4.25', up: true },
      { label: 'Steers 600–700 lb', note: 'Med/Lg 1', price: '$321.00', delta: '▲ $3.00', up: true },
      { label: 'Heifers 500–600 lb', note: 'Med/Lg 1', price: '$318.00', delta: '▲ $2.00', up: true },
      { label: 'Cull cows', note: 'Boning 80–85%', price: '$142.75', delta: '▼ $1.50', up: false },
      { label: 'Feeder pigs 40–60 lb', note: 'US 1-2', price: '$78.00', delta: '▲ $2.50', up: true },
      { label: 'Slaughter hogs', note: 'Nat. base carcass', price: '$96.40', delta: '▼ $0.80', up: false },
    ],
  },
  {
    key: 'brush',
    name: 'Livestock Exchange, Brush',
    meta: 'Brush, CO · Jul 16 sale · 990 head',
    quotes: [
      { label: 'Steers 500–600 lb', note: 'Med/Lg 1', price: '$339.00', delta: '▲ $3.50', up: true },
      { label: 'Heifers 500–600 lb', note: 'Med/Lg 1', price: '$315.25', delta: '▲ $1.75', up: true },
      { label: 'Cull cows', note: 'Boning 80–85%', price: '$141.00', delta: '▼ $2.00', up: false },
      { label: 'Bred cows', note: '3–6 yr, fall calvers', price: '$2,850/hd', delta: '▲ $50', up: true },
    ],
  },
  {
    key: 'lajunta',
    name: 'Winter Livestock',
    meta: 'La Junta, CO · Jul 14 sale · 2,210 head',
    quotes: [
      { label: 'Steers 500–600 lb', note: 'Med/Lg 1', price: '$344.75', delta: '▲ $5.00', up: true },
      { label: 'Heifers 500–600 lb', note: 'Med/Lg 1', price: '$320.50', delta: '▲ $2.25', up: true },
      { label: 'Cull cows', note: 'Boning 80–85%', price: '$144.00', delta: '▲ $0.50', up: true },
    ],
  },
  {
    key: 'ftcollins',
    name: 'Centennial Livestock',
    meta: 'Fort Collins, CO · Jul 16 sale · 760 head',
    quotes: [
      { label: 'Steers 500–600 lb', note: 'Med/Lg 1', price: '$340.25', delta: '▲ $2.75', up: true },
      { label: 'Cull cows', note: 'Boning 80–85%', price: '$143.25', delta: '▼ $0.75', up: false },
      { label: 'Slaughter hogs', note: 'Nat. base carcass', price: '$96.10', delta: '▼ $1.00', up: false },
    ],
  },
];

// Derive the initial audit ledger from the seeded entities themselves, so the
// ledger and the entities never disagree at first load.
export function buildSeedAuditLog(): AuditEntry[] {
  const entries: AuditEntry[] = [];
  for (const a of seedAnimals) {
    const business = a.cls === 'pet' ? 'General' : businessForSpecies(a.species);
    for (const e of a.events) {
      entries.push({
        id: makeId(),
        ts: `${e.date}T00:00:00.000Z`,
        actor: e.actor,
        kind: e.type,
        refType: 'animal',
        refId: a.id,
        business,
        summary: `${a.name || '#' + a.tag} — ${e.title}`,
        dateOccurred: e.date,
      });
    }
  }
  for (const t of seedTransactions) {
    entries.push({
      id: makeId(),
      ts: `${t.date}T00:00:00.000Z`,
      actor: 'You',
      kind: t.kind === 'income' ? 'Income' : 'Expense',
      refType: 'transaction',
      refId: t.id,
      business: t.business,
      summary: `${t.desc} — ${t.kind === 'income' ? '+' : '−'}$${t.amount.toLocaleString()}`,
      dateOccurred: t.date,
    });
  }
  for (const eq of seedEquipment) {
    entries.push({
      id: makeId(),
      ts: `${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`,
      actor: 'Dad',
      kind: 'Equipment added',
      refType: 'equipment',
      refId: eq.id,
      business: 'General',
      summary: `${eq.name} added`,
      dateOccurred: today(),
    });
  }
  for (const fb of seedFeedback) {
    entries.push({
      id: makeId(),
      ts: `${fb.date}T00:00:00.000Z`,
      actor: fb.who,
      kind: 'Feedback',
      refType: 'feedback',
      refId: fb.id,
      business: 'General',
      summary: `Feedback — ${fb.text}`,
      dateOccurred: fb.date,
    });
  }
  return entries;
}
