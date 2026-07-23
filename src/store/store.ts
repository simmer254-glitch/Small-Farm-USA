import { create } from 'zustand';
import { Alert, Platform } from 'react-native';
import { File } from 'expo-file-system';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import type {
  Animal,
  AnimalEvent,
  AnimalEventType,
  AuditEntry,
  AuditRefType,
  Business,
  Chore,
  Doc,
  DocFolder,
  Equipment,
  EquipmentServiceRecord,
  Feedback,
  PendingInvite,
  Task,
  TaskType,
  Transaction,
  TransactionKind,
  User,
} from '@/domain/types';
import { businessForSpecies } from '@/domain/businessLogic';
import { SALE_INCOME_LINE } from '@/domain/scheduleF';
import { localDateString } from '@/domain/dates';
import { makeId } from './id';
import { seedAuctions } from './seed';

type NewAnimalLivestock = {
  cls: 'livestock';
  species: 'cattle' | 'pig' | 'chicken';
  sex: string;
  tag: string;
  name: string;
  born: string;
  birthWeight?: number;
  color: string;
  dam: string;
  count: number;
};

type NewAnimalPet = {
  cls: 'pet';
  species: 'dog' | 'cat' | 'horse';
  name: string;
  born: string;
  color: string;
};

export type NewAnimalInput = NewAnimalLivestock | NewAnimalPet;

// ---------- DB row <-> TS mappers ----------
// Table columns are snake_case; TS fields are camelCase, and a couple of
// names differ outright (Transaction.desc -> description, since `desc` is
// an awkward SQL identifier). animal_events/equipment_service_records are
// separate tables but stay nested (Animal.events / Equipment.history) in
// the client store shape, matching the phase-1 UI's expectations exactly.

function animalFromRow(row: any, events: AnimalEvent[]): Animal {
  return {
    id: row.id,
    cls: row.cls,
    species: row.species,
    tag: row.tag,
    name: row.name,
    sex: row.sex,
    born: row.born,
    color: row.color,
    dam: row.dam,
    count: row.count,
    status: row.status,
    events,
  };
}

function eventFromRow(row: any): AnimalEvent & { animalId: string } {
  return { id: row.id, animalId: row.animal_id, date: row.date, type: row.type, title: row.title, lb: row.lb, actor: row.actor };
}

function transactionFromRow(row: any): Transaction {
  return {
    id: row.id,
    kind: row.kind,
    desc: row.description,
    amount: Number(row.amount),
    date: row.date,
    scheduleFLine: row.schedule_f_line,
    business: row.business,
    receiptDocId: row.receipt_doc_id ?? undefined,
  };
}

function taskFromRow(row: any): Task {
  return {
    id: row.id,
    title: row.title,
    date: row.date,
    type: row.type,
    assigneeUserId: row.assignee_user_id,
    creatorUserId: row.creator_user_id,
    done: row.done,
    gcalEventId: row.gcal_event_id ?? undefined,
  };
}

function equipmentFromRow(row: any, history: EquipmentServiceRecord[]): Equipment {
  return { id: row.id, name: row.name, hours: row.hours, unit: row.unit, lastService: row.last_service, history };
}

function serviceRecordFromRow(row: any): EquipmentServiceRecord & { equipmentId: string } {
  return { id: row.id, equipmentId: row.equipment_id, date: row.date, hours: row.hours, note: row.note };
}

function choreFromRow(row: any): Chore {
  return { id: row.id, icon: row.icon, title: row.title, date: row.date, actorUserId: row.actor_user_id };
}

function docFromRow(row: any): Doc {
  return {
    id: row.id,
    name: row.name,
    folder: row.folder,
    storagePath: row.storage_path ?? undefined,
    oneDriveId: row.onedrive_id ?? undefined,
    uploadedBy: row.uploaded_by,
    uploadedByUserId: row.uploaded_by_user_id ?? undefined,
    uploadedAt: row.uploaded_at,
  };
}

function feedbackFromRow(row: any): Feedback {
  return {
    id: row.id,
    who: row.who,
    authorUserId: row.author_user_id ?? undefined,
    date: row.date,
    text: row.text,
    status: row.status,
  };
}

function pendingInviteFromRow(row: any): PendingInvite {
  return {
    email: row.email,
    role: row.role,
    invitedBy: row.invited_by ?? undefined,
    createdAt: row.created_at,
  };
}

function profileFromRow(row: any): User {
  return { id: row.id, name: row.name, email: row.email, role: row.role, removedAt: row.removed_at ?? undefined };
}

function auditFromRow(row: any): AuditEntry {
  return {
    id: row.id,
    ts: row.ts,
    actor: row.actor,
    kind: row.kind,
    refType: row.ref_type,
    refId: row.ref_id,
    business: row.business,
    summary: row.summary,
    dateOccurred: row.date_occurred,
  };
}

function actor(): { id: string; name: string } {
  const profile = useAuthStore.getState().profile;
  return { id: profile?.id ?? '', name: profile?.name ?? 'You' };
}

function reportError(action: string, error: { message: string } | null) {
  if (!error) return;
  Alert.alert('Something went wrong', `Couldn't ${action}: ${error.message}. Check your connection and try again.`);
}

function auditRow(entry: {
  actor: string;
  kind: string;
  refType: AuditRefType;
  refId: string;
  business: Business;
  summary: string;
  dateOccurred: string;
}) {
  return {
    id: makeId(),
    ts: new Date().toISOString(),
    actor: entry.actor,
    kind: entry.kind,
    ref_type: entry.refType,
    ref_id: entry.refId,
    business: entry.business,
    summary: entry.summary,
    date_occurred: entry.dateOccurred,
  };
}

// Idempotent upsert-by-id: since ids are generated client-side before insert,
// an optimistic local row and its realtime echo share the same id, so this
// is a plain replace-or-append with no content diffing needed.
function upsertById<T extends { id: string }>(list: T[], item: T): T[] {
  const idx = list.findIndex((x) => x.id === item.id);
  if (idx === -1) return [item, ...list];
  const next = list.slice();
  next[idx] = item;
  return next;
}

function removeById<T extends { id: string }>(list: T[], id: string): T[] {
  return list.filter((x) => x.id !== id);
}

type State = {
  loaded: boolean;
  profiles: User[];
  animals: Animal[];
  transactions: Transaction[];
  tasks: Task[];
  equipment: Equipment[];
  chores: Chore[];
  docs: Doc[];
  feedback: Feedback[];
  pendingInvites: PendingInvite[];
  auditLog: AuditEntry[];
  selectedAuctionKey: string;
  auctions: typeof seedAuctions;

  fetchAll: () => Promise<void>;
  subscribeRealtime: () => () => void;

  addAnimal: (input: NewAnimalInput) => Promise<string>;
  addAnimalEvent: (animalId: string, type: Extract<AnimalEventType, 'weight' | 'vax' | 'note'>, value: string) => Promise<void>;
  markSold: (animalId: string, buyer: string, price: number) => Promise<void>;
  markButchered: (animalId: string) => Promise<void>;
  markDead: (animalId: string) => Promise<void>;
  updateAnimal: (animalId: string, input: NewAnimalInput) => Promise<void>;
  deleteAnimal: (animalId: string) => Promise<void>;

  addTransaction: (input: {
    kind: TransactionKind;
    desc: string;
    amount: number;
    date: string;
    scheduleFLine: string;
    business: Business;
    receiptDocId?: string;
  }) => Promise<void>;
  updateTransaction: (
    id: string,
    input: {
      kind: TransactionKind;
      desc: string;
      amount: number;
      date: string;
      scheduleFLine: string;
      business: Business;
      receiptDocId?: string;
    }
  ) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;

  addTask: (input: { title: string; date: string; type: TaskType; assigneeUserId: string }) => Promise<void>;
  toggleTask: (taskId: string) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;

  logChore: (icon: string, title: string) => Promise<void>;

  addEquipment: (name: string, hours: string) => Promise<void>;
  updateEquipmentService: (equipmentId: string, hours: string, note: string) => Promise<void>;
  updateEquipment: (equipmentId: string, name: string, unit: string) => Promise<void>;
  deleteEquipment: (equipmentId: string) => Promise<void>;

  addFeedback: (who: string, text: string) => Promise<void>;
  updateFeedback: (feedbackId: string, text: string) => Promise<void>;
  deleteFeedback: (feedbackId: string) => Promise<void>;

  addDoc: (input: { name: string; folder: DocFolder; localUri?: string }) => Promise<string>;
  deleteDoc: (docId: string) => Promise<void>;

  invite: (email: string, role: User['role']) => Promise<{ error: string | null }>;
  setUserRole: (userId: string, role: User['role']) => Promise<{ error: string | null }>;
  cancelInvite: (email: string) => Promise<void>;
  removeFamilyMember: (userId: string) => Promise<{ error: string | null }>;

  setAuction: (key: string) => void;
};

export const useStore = create<State>()((set, get) => ({
  loaded: false,
  profiles: [],
  animals: [],
  transactions: [],
  tasks: [],
  equipment: [],
  chores: [],
  docs: [],
  feedback: [],
  pendingInvites: [],
  auditLog: [],
  selectedAuctionKey: 'sterling',
  auctions: seedAuctions,

  fetchAll: async () => {
    const [profilesQ, animalsQ, eventsQ, txnsQ, tasksQ, equipmentQ, recordsQ, choresQ, docsQ, feedbackQ, pendingInvitesQ, auditQ] = await Promise.all([
      supabase.from('profiles').select('*'),
      supabase.from('animals').select('*'),
      supabase.from('animal_events').select('*'),
      supabase.from('transactions').select('*'),
      supabase.from('tasks').select('*'),
      supabase.from('equipment').select('*'),
      supabase.from('equipment_service_records').select('*'),
      supabase.from('chores').select('*'),
      supabase.from('docs').select('*'),
      supabase.from('feedback').select('*'),
      supabase.from('pending_invites').select('*'),
      supabase.from('audit_log').select('*'),
    ]);

    const events = (eventsQ.data ?? []).map(eventFromRow);
    const records = (recordsQ.data ?? []).map(serviceRecordFromRow);

    const animals = (animalsQ.data ?? []).map((row) => {
      const own = events
        .filter((e) => e.animalId === row.id)
        .sort((a, b) => b.date.localeCompare(a.date))
        .map(({ animalId, ...e }) => e);
      return animalFromRow(row, own);
    });

    const equipment = (equipmentQ.data ?? []).map((row) => {
      const own = records
        .filter((r) => r.equipmentId === row.id)
        .sort((a, b) => b.date.localeCompare(a.date))
        .map(({ equipmentId, ...r }) => r);
      return equipmentFromRow(row, own);
    });

    set({
      profiles: (profilesQ.data ?? []).map(profileFromRow),
      animals,
      equipment,
      transactions: (txnsQ.data ?? []).map(transactionFromRow),
      tasks: (tasksQ.data ?? []).map(taskFromRow),
      chores: (choresQ.data ?? []).map(choreFromRow),
      docs: (docsQ.data ?? []).map(docFromRow),
      feedback: (feedbackQ.data ?? []).map(feedbackFromRow),
      pendingInvites: (pendingInvitesQ.data ?? []).map(pendingInviteFromRow),
      auditLog: (auditQ.data ?? []).map(auditFromRow),
      loaded: true,
    });
  },

  subscribeRealtime: () => {
    const channel = supabase
      .channel('public-data')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, (payload) => {
        set((s) => {
          if (payload.eventType === 'DELETE') return { profiles: removeById(s.profiles, (payload.old as any).id) };
          return { profiles: upsertById(s.profiles, profileFromRow(payload.new)) };
        });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'animals' }, (payload) => {
        set((s) => {
          if (payload.eventType === 'DELETE') return { animals: removeById(s.animals, (payload.old as any).id) };
          const row = payload.new as any;
          const existing = s.animals.find((a) => a.id === row.id);
          return { animals: upsertById(s.animals, animalFromRow(row, existing?.events ?? [])) };
        });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'animal_events' }, (payload) => {
        if (payload.eventType === 'DELETE') return; // events are never deleted independently
        const e = eventFromRow(payload.new as any);
        set((s) => ({
          animals: s.animals.map((a) =>
            a.id === e.animalId ? { ...a, events: upsertById(a.events, { id: e.id, date: e.date, type: e.type, title: e.title, lb: e.lb, actor: e.actor }) } : a
          ),
        }));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, (payload) => {
        set((s) => {
          if (payload.eventType === 'DELETE') return { transactions: removeById(s.transactions, (payload.old as any).id) };
          return { transactions: upsertById(s.transactions, transactionFromRow(payload.new)) };
        });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, (payload) => {
        set((s) => {
          if (payload.eventType === 'DELETE') return { tasks: removeById(s.tasks, (payload.old as any).id) };
          return { tasks: upsertById(s.tasks, taskFromRow(payload.new)) };
        });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'equipment' }, (payload) => {
        set((s) => {
          if (payload.eventType === 'DELETE') return { equipment: removeById(s.equipment, (payload.old as any).id) };
          const row = payload.new as any;
          const existing = s.equipment.find((e) => e.id === row.id);
          return { equipment: upsertById(s.equipment, equipmentFromRow(row, existing?.history ?? [])) };
        });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'equipment_service_records' }, (payload) => {
        if (payload.eventType === 'DELETE') return;
        const r = serviceRecordFromRow(payload.new as any);
        set((s) => ({
          equipment: s.equipment.map((eq) =>
            eq.id === r.equipmentId ? { ...eq, history: upsertById(eq.history, { id: r.id, date: r.date, hours: r.hours, note: r.note }) } : eq
          ),
        }));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chores' }, (payload) => {
        if (payload.eventType === 'DELETE') return;
        set((s) => ({ chores: upsertById(s.chores, choreFromRow(payload.new)) }));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'docs' }, (payload) => {
        set((s) => {
          if (payload.eventType === 'DELETE') return { docs: removeById(s.docs, (payload.old as any).id) };
          return { docs: upsertById(s.docs, docFromRow(payload.new)) };
        });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'feedback' }, (payload) => {
        set((s) => {
          if (payload.eventType === 'DELETE') return { feedback: removeById(s.feedback, (payload.old as any).id) };
          return { feedback: upsertById(s.feedback, feedbackFromRow(payload.new)) };
        });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pending_invites' }, (payload) => {
        // Keyed by email, not id — pending_invites has no id column, so the
        // generic upsertById/removeById helpers (which require `{ id }`)
        // don't apply here.
        set((s) => {
          if (payload.eventType === 'DELETE') {
            const email = (payload.old as any).email;
            return { pendingInvites: s.pendingInvites.filter((i) => i.email !== email) };
          }
          const invite = pendingInviteFromRow(payload.new);
          const idx = s.pendingInvites.findIndex((i) => i.email === invite.email);
          if (idx === -1) return { pendingInvites: [invite, ...s.pendingInvites] };
          const next = s.pendingInvites.slice();
          next[idx] = invite;
          return { pendingInvites: next };
        });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'audit_log' }, (payload) => {
        if (payload.eventType !== 'INSERT') return; // audit_log is append-only
        set((s) => ({ auditLog: upsertById(s.auditLog, auditFromRow(payload.new)) }));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  addAnimal: async (input) => {
    const id = makeId();
    const { name: actorName } = actor();
    const dateStr = localDateString();
    const business = input.cls === 'pet' ? 'General' : businessForSpecies(input.species);

    const eventsToInsert: AnimalEvent[] =
      input.cls === 'pet'
        ? [{ id: makeId(), date: dateStr, type: 'note', title: 'Added to the family', actor: actorName }]
        : [
            {
              id: makeId(),
              date: dateStr,
              type: 'born',
              title: `Born${input.birthWeight ? ` · ${input.birthWeight} lb` : ''} · dam ${input.dam || '?'}`,
              lb: input.birthWeight ?? null,
              actor: actorName,
            },
            { id: makeId(), date: dateStr, type: 'tag', title: `Tagged #${input.tag}`, actor: actorName },
          ];

    const animal: Animal =
      input.cls === 'pet'
        ? {
            id,
            cls: 'pet',
            species: input.species,
            tag: input.name,
            name: input.name,
            sex: '—',
            born: input.born,
            color: input.color || '—',
            dam: '—',
            count: 1,
            status: 'active',
            events: eventsToInsert,
          }
        : {
            id,
            cls: 'livestock',
            species: input.species,
            tag: input.tag,
            name: input.name,
            sex: input.sex,
            born: input.born,
            color: input.color || '—',
            dam: input.dam || '—',
            count: input.count || 1,
            status: 'active',
            events: eventsToInsert,
          };

    set((s) => ({ animals: [animal, ...s.animals] }));

    const { error } = await supabase.from('animals').insert({
      id,
      cls: animal.cls,
      species: animal.species,
      tag: animal.tag,
      name: animal.name,
      sex: animal.sex,
      born: animal.born,
      color: animal.color,
      dam: animal.dam,
      count: animal.count,
      status: animal.status,
    });
    if (error) {
      set((s) => ({ animals: removeById(s.animals, id) }));
      reportError('save the new animal', error);
      return id;
    }

    await supabase.from('animal_events').insert(eventsToInsert.map((e) => ({ id: e.id, animal_id: id, date: e.date, type: e.type, title: e.title, lb: e.lb, actor: e.actor })));
    await supabase.from('audit_log').insert(
      eventsToInsert.map((e) =>
        auditRow({ actor: actorName, kind: e.type, refType: 'animal', refId: id, business, summary: `${animal.name || '#' + animal.tag} — ${e.title}`, dateOccurred: e.date })
      )
    );
    return id;
  },

  addAnimalEvent: async (animalId, type, value) => {
    const { name: actorName } = actor();
    const dateStr = localDateString();
    const animal = get().animals.find((a) => a.id === animalId);
    if (!animal || !value.trim()) return;
    const title = type === 'weight' ? `Weighed ${value.trim()} lb` : value.trim();
    const lb = type === 'weight' ? Number(value) || null : undefined;
    const event: AnimalEvent = { id: makeId(), date: dateStr, type, title, lb, actor: actorName };
    const business = animal.cls === 'pet' ? 'General' : businessForSpecies(animal.species);

    set((s) => ({ animals: s.animals.map((a) => (a.id === animalId ? { ...a, events: [event, ...a.events] } : a)) }));

    const { error } = await supabase
      .from('animal_events')
      .insert({ id: event.id, animal_id: animalId, date: event.date, type: event.type, title: event.title, lb: event.lb, actor: event.actor });
    if (error) {
      set((s) => ({ animals: s.animals.map((a) => (a.id === animalId ? { ...a, events: removeById(a.events, event.id) } : a)) }));
      reportError('save that entry', error);
      return;
    }
    await supabase
      .from('audit_log')
      .insert(auditRow({ actor: actorName, kind: type, refType: 'animal', refId: animalId, business, summary: `${animal.name || '#' + animal.tag} — ${title}`, dateOccurred: dateStr }));
  },

  markSold: async (animalId, buyer, price) => {
    const { name: actorName } = actor();
    const dateStr = localDateString();
    const animal = get().animals.find((a) => a.id === animalId);
    if (!animal) return;
    const buyerName = buyer.trim() || 'Private buyer';
    const title = `Sold to ${buyerName}${price ? ` · $${price.toLocaleString()}` : ''}`;
    const event: AnimalEvent = { id: makeId(), date: dateStr, type: 'sold', title, actor: actorName };
    const business = businessForSpecies(animal.species);

    set((s) => ({
      animals: s.animals.map((a) => (a.id === animalId ? { ...a, status: 'sold' as const, events: [event, ...a.events] } : a)),
    }));

    const { error } = await supabase.from('animals').update({ status: 'sold' }).eq('id', animalId);
    if (error) {
      reportError('mark that animal sold', error);
      return;
    }
    await supabase.from('animal_events').insert({ id: event.id, animal_id: animalId, date: event.date, type: event.type, title: event.title, actor: event.actor });
    await supabase.from('audit_log').insert(auditRow({ actor: actorName, kind: 'sold', refType: 'animal', refId: animalId, business, summary: `${animal.name || '#' + animal.tag} — ${title}`, dateOccurred: dateStr }));

    if (price > 0) {
      const txnId = makeId();
      const desc = `Sold ${animal.name || '#' + animal.tag} — ${buyerName}`;
      const txn: Transaction = { id: txnId, kind: 'income', desc, amount: price, date: dateStr, scheduleFLine: SALE_INCOME_LINE, business };
      set((s) => ({ transactions: [txn, ...s.transactions] }));
      const { error: txnError } = await supabase
        .from('transactions')
        .insert({ id: txnId, kind: 'income', description: desc, amount: price, date: dateStr, schedule_f_line: SALE_INCOME_LINE, business });
      if (txnError) {
        set((s) => ({ transactions: removeById(s.transactions, txnId) }));
        reportError('record the sale income', txnError);
        return;
      }
      await supabase
        .from('audit_log')
        .insert(auditRow({ actor: actorName, kind: 'Income', refType: 'transaction', refId: txnId, business, summary: `${desc} — +$${price.toLocaleString()}`, dateOccurred: dateStr }));
    }
  },

  markButchered: async (animalId) => {
    const { name: actorName } = actor();
    const dateStr = localDateString();
    const animal = get().animals.find((a) => a.id === animalId);
    if (!animal) return;
    const event: AnimalEvent = { id: makeId(), date: dateStr, type: 'butchered', title: 'Marked butchered', actor: actorName };
    const business = businessForSpecies(animal.species);

    set((s) => ({
      animals: s.animals.map((a) => (a.id === animalId ? { ...a, status: 'butchered' as const, events: [event, ...a.events] } : a)),
    }));

    const { error } = await supabase.from('animals').update({ status: 'butchered' }).eq('id', animalId);
    if (error) {
      reportError('mark that animal butchered', error);
      return;
    }
    await supabase.from('animal_events').insert({ id: event.id, animal_id: animalId, date: event.date, type: event.type, title: event.title, actor: event.actor });
    await supabase
      .from('audit_log')
      .insert(auditRow({ actor: actorName, kind: 'butchered', refType: 'animal', refId: animalId, business, summary: `${animal.name || '#' + animal.tag} — Marked butchered`, dateOccurred: dateStr }));
  },

  markDead: async (animalId) => {
    const { name: actorName } = actor();
    const dateStr = localDateString();
    const animal = get().animals.find((a) => a.id === animalId);
    if (!animal) return;
    const event: AnimalEvent = { id: makeId(), date: dateStr, type: 'dead', title: 'Marked dead', actor: actorName };
    const business = businessForSpecies(animal.species);

    set((s) => ({
      animals: s.animals.map((a) => (a.id === animalId ? { ...a, status: 'dead' as const, events: [event, ...a.events] } : a)),
    }));

    const { error } = await supabase.from('animals').update({ status: 'dead' }).eq('id', animalId);
    if (error) {
      reportError('mark that animal dead', error);
      return;
    }
    await supabase.from('animal_events').insert({ id: event.id, animal_id: animalId, date: event.date, type: event.type, title: event.title, actor: event.actor });
    await supabase
      .from('audit_log')
      .insert(auditRow({ actor: actorName, kind: 'dead', refType: 'animal', refId: animalId, business, summary: `${animal.name || '#' + animal.tag} — Marked dead`, dateOccurred: dateStr }));
  },

  updateAnimal: async (animalId, input) => {
    const { name: actorName } = actor();
    const prev = get().animals;
    const existing = prev.find((a) => a.id === animalId);
    if (!existing) return;
    const business = input.cls === 'pet' ? 'General' : businessForSpecies(input.species);

    // Same cls-based field-filling as addAnimal — pets never carry a real
    // tag/sex/dam/count, so editing a pet must keep writing the same
    // placeholders addAnimal does, not leave them blank.
    const fields =
      input.cls === 'pet'
        ? { cls: 'pet' as const, species: input.species, tag: input.name, name: input.name, sex: '—', born: input.born, color: input.color || '—', dam: '—', count: 1 }
        : {
            cls: 'livestock' as const,
            species: input.species,
            tag: input.tag,
            name: input.name,
            sex: input.sex,
            born: input.born,
            color: input.color || '—',
            dam: input.dam || '—',
            count: input.count || 1,
          };

    set((s) => ({ animals: s.animals.map((a) => (a.id === animalId ? { ...a, ...fields } : a)) }));

    const { error } = await supabase.from('animals').update(fields).eq('id', animalId);
    if (error) {
      set({ animals: prev });
      reportError('save that change', error);
      return;
    }
    await supabase.from('audit_log').insert(
      auditRow({
        actor: actorName,
        kind: 'Animal edited',
        refType: 'animal',
        refId: animalId,
        business,
        summary: `${fields.name || '#' + fields.tag} — record edited`,
        dateOccurred: localDateString(),
      })
    );
  },

  deleteAnimal: async (animalId) => {
    const prev = get().animals;
    set((s) => ({ animals: removeById(s.animals, animalId) }));
    const { error } = await supabase.from('animals').delete().eq('id', animalId);
    if (error) {
      set({ animals: prev });
      reportError('delete that record', error);
    }
    // Note: audit_log rows referencing this animal are untouched — the
    // ledger has no FK to animals, so history survives the deletion.
  },

  addTransaction: async (input) => {
    const { name: actorName } = actor();
    const id = makeId();
    const txn: Transaction = { id, ...input };
    set((s) => ({ transactions: [txn, ...s.transactions] }));

    const { error } = await supabase.from('transactions').insert({
      id,
      kind: input.kind,
      description: input.desc,
      amount: input.amount,
      date: input.date,
      schedule_f_line: input.scheduleFLine,
      business: input.business,
      receipt_doc_id: input.receiptDocId ?? null,
    });
    if (error) {
      set((s) => ({ transactions: removeById(s.transactions, id) }));
      reportError('save that entry', error);
      return;
    }
    await supabase.from('audit_log').insert(
      auditRow({
        actor: actorName,
        kind: input.kind === 'income' ? 'Income' : 'Expense',
        refType: 'transaction',
        refId: id,
        business: input.business,
        summary: `${input.desc} — ${input.kind === 'income' ? '+' : '−'}$${input.amount.toLocaleString()}`,
        dateOccurred: input.date,
      })
    );
  },

  updateTransaction: async (id, input) => {
    const { name: actorName } = actor();
    const prev = get().transactions;
    set((s) => ({ transactions: s.transactions.map((t) => (t.id === id ? { id, ...input } : t)) }));

    const { error } = await supabase
      .from('transactions')
      .update({
        kind: input.kind,
        description: input.desc,
        amount: input.amount,
        date: input.date,
        schedule_f_line: input.scheduleFLine,
        business: input.business,
        receipt_doc_id: input.receiptDocId ?? null,
      })
      .eq('id', id);
    if (error) {
      set({ transactions: prev });
      reportError('save that change', error);
      return;
    }
    await supabase.from('audit_log').insert(
      auditRow({
        actor: actorName,
        kind: 'Entry edited',
        refType: 'transaction',
        refId: id,
        business: input.business,
        summary: `${input.desc} — ${input.kind === 'income' ? '+' : '−'}$${input.amount.toLocaleString()}`,
        dateOccurred: input.date,
      })
    );
  },

  deleteTransaction: async (id) => {
    const prev = get().transactions;
    set((s) => ({ transactions: removeById(s.transactions, id) }));
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (error) {
      set({ transactions: prev });
      reportError('delete that entry', error);
    }
  },

  addTask: async (input) => {
    const { id: creatorUserId, name: actorName } = actor();
    const id = makeId();
    const task: Task = { id, done: false, creatorUserId, ...input };
    set((s) => ({ tasks: [...s.tasks, task] }));

    const { error } = await supabase.from('tasks').insert({
      id,
      title: input.title,
      date: input.date,
      type: input.type,
      assignee_user_id: input.assigneeUserId,
      creator_user_id: creatorUserId,
      done: false,
    });
    if (error) {
      set((s) => ({ tasks: removeById(s.tasks, id) }));
      reportError('schedule that task', error);
      return;
    }
    await supabase
      .from('audit_log')
      .insert(auditRow({ actor: actorName, kind: 'Task scheduled', refType: 'task', refId: id, business: 'General', summary: `Scheduled — ${input.title}`, dateOccurred: input.date }));
  },

  toggleTask: async (taskId) => {
    const prevTasks = get().tasks;
    set((s) => ({ tasks: s.tasks.map((t) => (t.id === taskId ? { ...t, done: !t.done } : t)) }));
    const { error } = await supabase.rpc('toggle_task', { task_id: taskId });
    if (error) {
      set({ tasks: prevTasks });
      reportError('update that task', error);
    }
  },

  deleteTask: async (taskId) => {
    const prev = get().tasks;
    set((s) => ({ tasks: removeById(s.tasks, taskId) }));
    const { error } = await supabase.from('tasks').delete().eq('id', taskId);
    if (error) {
      set({ tasks: prev });
      reportError('delete that task', error);
    }
  },

  logChore: async (icon, title) => {
    const { id: actorUserId, name: actorName } = actor();
    const id = makeId();
    const dateStr = localDateString();
    const chore: Chore = { id, icon, title, date: dateStr, actorUserId };
    set((s) => ({ chores: [chore, ...s.chores] }));

    const { error } = await supabase.from('chores').insert({ id, icon, title, date: dateStr, actor_user_id: actorUserId });
    if (error) {
      set((s) => ({ chores: removeById(s.chores, id) }));
      reportError('log that chore', error);
      return;
    }
    await supabase.from('audit_log').insert(auditRow({ actor: actorName, kind: 'Chore', refType: 'chore', refId: id, business: 'General', summary: `Chore — ${title}`, dateOccurred: dateStr }));
  },

  addEquipment: async (name, hours) => {
    const { name: actorName } = actor();
    const id = makeId();
    const eq: Equipment = { id, name, hours: hours || '0', unit: 'hrs/mi', lastService: '', history: [] };
    set((s) => ({ equipment: [...s.equipment, eq] }));

    const { error } = await supabase.from('equipment').insert({ id, name, hours: hours || '0', unit: 'hrs/mi', last_service: '' });
    if (error) {
      set((s) => ({ equipment: removeById(s.equipment, id) }));
      reportError('add that equipment', error);
      return;
    }
    await supabase
      .from('audit_log')
      .insert(auditRow({ actor: actorName, kind: 'Equipment added', refType: 'equipment', refId: id, business: 'General', summary: `${name} added`, dateOccurred: localDateString() }));
  },

  updateEquipmentService: async (equipmentId, hours, note) => {
    const { name: actorName } = actor();
    const dateStr = localDateString();
    const eq = get().equipment.find((e) => e.id === equipmentId);
    if (!eq) return;
    const recordId = makeId();
    const record: EquipmentServiceRecord = { id: recordId, date: dateStr, hours: hours || eq.hours, note: note || '' };
    const newHours = hours || eq.hours;
    const newLastService = note ? `${note} — ${dateStr}` : eq.lastService;

    set((s) => ({
      equipment: s.equipment.map((e) => (e.id === equipmentId ? { ...e, hours: newHours, lastService: newLastService, history: [record, ...e.history] } : e)),
    }));

    const { error } = await supabase.from('equipment').update({ hours: newHours, last_service: newLastService }).eq('id', equipmentId);
    if (error) {
      reportError('update that equipment', error);
      return;
    }
    await supabase.from('equipment_service_records').insert({ id: recordId, equipment_id: equipmentId, date: dateStr, hours: newHours, note: note || '' });
    await supabase.from('audit_log').insert(
      auditRow({
        actor: actorName,
        kind: 'Equipment update',
        refType: 'equipment',
        refId: equipmentId,
        business: 'General',
        summary: `${eq.name} — ${hours ? `${hours} ${eq.unit}` : ''}${note ? ` · ${note}` : ''}`,
        dateOccurred: dateStr,
      })
    );
  },

  updateEquipment: async (equipmentId, name, unit) => {
    const { name: actorName } = actor();
    const prev = get().equipment;
    const eq = prev.find((e) => e.id === equipmentId);
    if (!eq) return;

    set((s) => ({ equipment: s.equipment.map((e) => (e.id === equipmentId ? { ...e, name, unit } : e)) }));

    const { error } = await supabase.from('equipment').update({ name, unit }).eq('id', equipmentId);
    if (error) {
      set({ equipment: prev });
      reportError('save that change', error);
      return;
    }
    await supabase
      .from('audit_log')
      .insert(auditRow({ actor: actorName, kind: 'Equipment edited', refType: 'equipment', refId: equipmentId, business: 'General', summary: `${name} — record edited`, dateOccurred: localDateString() }));
  },

  deleteEquipment: async (equipmentId) => {
    const prev = get().equipment;
    set((s) => ({ equipment: removeById(s.equipment, equipmentId) }));
    const { error } = await supabase.from('equipment').delete().eq('id', equipmentId);
    if (error) {
      set({ equipment: prev });
      reportError('delete that equipment', error);
    }
  },

  addFeedback: async (who, text) => {
    const { id: authorUserId } = actor();
    const id = makeId();
    const dateStr = localDateString();
    const fb: Feedback = { id, who, authorUserId, date: dateStr, text, status: 'New' };
    set((s) => ({ feedback: [fb, ...s.feedback] }));

    const { error } = await supabase.from('feedback').insert({ id, who, author_user_id: authorUserId, date: dateStr, text, status: 'New' });
    if (error) {
      set((s) => ({ feedback: removeById(s.feedback, id) }));
      reportError('send that feedback', error);
      return;
    }
    await supabase.from('audit_log').insert(auditRow({ actor: who, kind: 'Feedback', refType: 'feedback', refId: id, business: 'General', summary: `Feedback — ${text}`, dateOccurred: dateStr }));
  },

  updateFeedback: async (feedbackId, text) => {
    const { name: actorName } = actor();
    const prev = get().feedback;
    const fb = prev.find((f) => f.id === feedbackId);
    if (!fb) return;

    set((s) => ({ feedback: s.feedback.map((f) => (f.id === feedbackId ? { ...f, text } : f)) }));

    const { error } = await supabase.from('feedback').update({ text }).eq('id', feedbackId);
    if (error) {
      set({ feedback: prev });
      reportError('save that change', error);
      return;
    }
    await supabase
      .from('audit_log')
      .insert(auditRow({ actor: actorName, kind: 'Feedback edited', refType: 'feedback', refId: feedbackId, business: 'General', summary: `Feedback edited — ${text}`, dateOccurred: localDateString() }));
  },

  deleteFeedback: async (feedbackId) => {
    const prev = get().feedback;
    set((s) => ({ feedback: removeById(s.feedback, feedbackId) }));
    const { error } = await supabase.from('feedback').delete().eq('id', feedbackId);
    if (error) {
      set({ feedback: prev });
      reportError('delete that feedback', error);
    }
  },

  addDoc: async (input) => {
    const { id: uploadedByUserId, name: actorName } = actor();
    const id = makeId();

    // Storage upload must finish strictly before the docs row is inserted —
    // never insert a row referencing a not-yet-uploaded object. This is the
    // durable, permanent copy every device reads from regardless of the
    // owner's OneDrive connectivity; OneDrive (synced later) is the
    // archival copy the README requires, not the primary read path.
    let storagePath: string | undefined;
    if (input.localUri) {
      try {
        // expo-file-system's new File/Directory API is an unimplemented stub
        // on web (see node_modules/expo-file-system/src/ExpoFileSystem.web.ts
        // — the web FileSystemFile class only logs a warning; it never
        // throws, so this was silently reading zero bytes instead of failing
        // loudly). Every upload attempt on web has been generating a
        // zero-byte object in Storage: the docs row and folder count look
        // right, but there's never been real file content to sync anywhere.
        // Web's DocumentPicker/ImagePicker URIs are blob: URLs, which fetch()
        // reads correctly — that's the actual cross-platform-safe approach
        // here (the earlier note against fetch(uri).blob() on native RN/
        // Hermes doesn't apply to a real browser's fetch implementation).
        let bytes: Uint8Array;
        if (Platform.OS === 'web') {
          const res = await fetch(input.localUri);
          const buf: ArrayBuffer = await res.arrayBuffer();
          bytes = new Uint8Array(buf);
        } else {
          bytes = await new File(input.localUri).bytes();
        }
        // The storage key is the doc's own UUID alone — never the raw
        // filename. A display name like "Receipt — Vaccine for cattle.jpg"
        // (em dash, spaces, arbitrary punctuation) sent straight through as
        // an object key is what Supabase Storage's upload API was 400ing on;
        // the original name is already tracked separately in docs.name for
        // display and for the filename pushed to OneDrive, so the key itself
        // never needs to encode it.
        storagePath = id;
        const { error: uploadErr } = await supabase.storage.from('docs').upload(storagePath, bytes, { contentType: 'application/octet-stream' });
        if (uploadErr) throw uploadErr;
      } catch (e) {
        reportError('upload that document', e instanceof Error ? e : new Error('Upload failed'));
        return '';
      }
    }

    const doc: Doc = { id, uploadedBy: actorName, uploadedByUserId, uploadedAt: new Date().toISOString(), storagePath, ...input };
    set((s) => ({ docs: [doc, ...s.docs] }));

    const { error } = await supabase.from('docs').insert({
      id,
      name: input.name,
      folder: input.folder,
      storage_path: storagePath ?? null,
      uploaded_by: actorName,
      uploaded_by_user_id: uploadedByUserId,
    });
    if (error) {
      set((s) => ({ docs: removeById(s.docs, id) }));
      reportError('save that document', error);
    }
    return id;
  },

  deleteDoc: async (docId) => {
    const prev = get().docs;
    const doc = prev.find((d) => d.id === docId);
    set((s) => ({ docs: removeById(s.docs, docId) }));
    const { error } = await supabase.from('docs').delete().eq('id', docId);
    if (error) {
      set({ docs: prev });
      reportError('delete that document', error);
      return;
    }
    // Best-effort cleanup of the Storage copy — a leftover blob isn't
    // visible anywhere once the row's gone, so a failure here isn't worth
    // surfacing to the user. Any already-synced OneDrive copy is left in
    // place; deleting from the owner's actual OneDrive isn't handled here.
    if (doc?.storagePath) {
      await supabase.storage.from('docs').remove([doc.storagePath]);
    }
  },

  // Pre-authorizes a family member: no invite email is sent by this app —
  // the admin tells them directly to open the app and sign in with this
  // exact email. The handle_new_user DB trigger consumes this row and
  // assigns the role the moment they complete their first sign-in.
  invite: async (email, role) => {
    const { id: invitedBy } = actor();
    const { error } = await supabase.from('pending_invites').insert({ email: email.trim().toLowerCase(), role, invited_by: invitedBy });
    return { error: error?.message ?? null };
  },

  setUserRole: async (userId, role) => {
    const { error } = await supabase.rpc('set_user_role', { target: userId, new_role: role });
    return { error: error?.message ?? null };
  },

  removeFamilyMember: async (userId) => {
    const { error } = await supabase.rpc('remove_family_member', { target: userId });
    return { error: error?.message ?? null };
  },

  cancelInvite: async (email) => {
    const prev = get().pendingInvites;
    set((s) => ({ pendingInvites: s.pendingInvites.filter((i) => i.email !== email) }));
    const { error } = await supabase.from('pending_invites').delete().eq('email', email);
    if (error) {
      set({ pendingInvites: prev });
      reportError('cancel that invite', error);
    }
  },

  setAuction: (key) => set({ selectedAuctionKey: key }),
}));
