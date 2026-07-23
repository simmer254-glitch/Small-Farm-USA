// Entity model — see README "State Management (production data model)".

export type Role = 'admin' | 'member' | 'kid';

export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
  removedAt?: string;
};

export type PendingInvite = {
  email: string;
  role: Role;
  invitedBy?: string;
  createdAt: string;
};

export type AnimalClass = 'livestock' | 'pet';
export type LivestockSpecies = 'cattle' | 'pig' | 'chicken';
export type PetSpecies = 'dog' | 'cat' | 'horse';
export type Species = LivestockSpecies | PetSpecies;
export type AnimalStatus = 'active' | 'sold' | 'butchered' | 'dead';
export type Business = 'Cattle' | 'Poultry' | 'Hogs' | 'General';

export type AnimalEventType = 'born' | 'tag' | 'weight' | 'vax' | 'note' | 'sold' | 'butchered' | 'dead';

export type AnimalEvent = {
  id: string;
  date: string; // ISO date
  type: AnimalEventType;
  title: string;
  lb?: number | null;
  actor: string;
};

export type Animal = {
  id: string;
  cls: AnimalClass;
  species: Species;
  tag: string; // for pets, tag mirrors name (no real tag concept)
  name: string;
  sex: string;
  born: string; // ISO date
  color: string;
  dam: string;
  count: number; // lot/batch size, 1 for singles and all pets
  status: AnimalStatus;
  events: AnimalEvent[];
};

export type TransactionKind = 'income' | 'expense';

export type Transaction = {
  id: string;
  kind: TransactionKind;
  desc: string;
  amount: number;
  date: string;
  scheduleFLine: string;
  business: Business;
  receiptDocId?: string;
};

export type TaskType = 'Butcher' | 'Maintenance' | 'Vaccination' | 'Other';

export type Task = {
  id: string;
  title: string;
  date: string;
  type: TaskType;
  assigneeUserId: 'everyone' | string;
  creatorUserId: string;
  done: boolean;
  gcalEventId?: string;
};

export type EquipmentServiceRecord = {
  id: string;
  date: string;
  hours: string;
  note: string;
};

export type Equipment = {
  id: string;
  name: string;
  hours: string;
  unit: string;
  lastService: string;
  history: EquipmentServiceRecord[];
};

export type Chore = {
  id: string;
  icon: string;
  title: string;
  date: string;
  actorUserId: string;
};

export type DocFolder = 'Brand inspections' | 'Receipts' | 'Vet records' | 'Insurance & titles';

export type Doc = {
  id: string;
  name: string;
  folder: DocFolder;
  localUri?: string;
  storagePath?: string; // path in the Supabase Storage 'docs' bucket — the durable, permanent copy (phase 3+)
  oneDriveId?: string;
  uploadedBy: string; // display-name snapshot, kept even if the uploader later leaves
  uploadedByUserId?: string; // real profile id, for row-level ownership checks (phase 2+)
  uploadedAt: string;
};

export type FeedbackStatus = 'New' | 'Planned' | 'Done';

export type Feedback = {
  id: string;
  who: string; // display-name snapshot
  authorUserId?: string; // real profile id (phase 2+)
  date: string;
  text: string;
  status: FeedbackStatus;
};

export type AuditRefType =
  | 'animal'
  | 'transaction'
  | 'task'
  | 'chore'
  | 'equipment'
  | 'feedback'
  | 'profile'; // member joined / role changed — written by the phase-2 signup trigger and set_user_role RPC

export type AuditEntry = {
  id: string;
  ts: string; // ISO timestamp
  actor: string;
  kind: string; // human label, e.g. "Weighed", "Sold", "Expense"
  refType: AuditRefType;
  refId: string;
  business: Business;
  summary: string;
  dateOccurred: string; // ISO date the event pertains to (may differ from ts)
};

export type MarketQuote = {
  label: string;
  note: string;
  price: string;
  delta: string;
  up: boolean;
};

export type Auction = {
  key: string;
  name: string;
  meta: string;
  quotes: MarketQuote[];
};
