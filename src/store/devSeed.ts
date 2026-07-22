// Dev-only, one-time database seeding — populates a fresh Supabase project
// with the same realistic demo dataset used in phase 1, so the app isn't
// empty on first real use. Runs through the already-authenticated admin
// session (whoever taps the button), so it needs no service-role key.
// Never shown outside __DEV__ — see the gated button in More.
import { supabase } from '@/lib/supabase';
import { makeId } from './id';
import { businessForSpecies } from '@/domain/businessLogic';
import { seedAnimals, seedTransactions, seedTasks, seedEquipment, seedFeedback } from './seed';

export async function seedDemoData(): Promise<{ error: string | null }> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const me = session?.user.id;
  if (!me) return { error: 'Not signed in' };

  const animalIdMap = new Map(seedAnimals.map((a) => [a.id, makeId()]));

  const { error: animalsErr } = await supabase.from('animals').insert(
    seedAnimals.map((a) => ({
      id: animalIdMap.get(a.id),
      cls: a.cls,
      species: a.species,
      tag: a.tag,
      name: a.name,
      sex: a.sex,
      born: a.born,
      color: a.color,
      dam: a.dam,
      count: a.count,
      status: a.status,
    }))
  );
  if (animalsErr) return { error: animalsErr.message };

  const { error: eventsErr } = await supabase.from('animal_events').insert(
    seedAnimals.flatMap((a) =>
      a.events.map((e) => ({
        id: makeId(),
        animal_id: animalIdMap.get(a.id),
        date: e.date,
        type: e.type,
        title: e.title,
        lb: e.lb ?? null,
        actor: e.actor,
      }))
    )
  );
  if (eventsErr) return { error: eventsErr.message };

  const txnIdMap = new Map(seedTransactions.map((t) => [t.id, makeId()]));
  const { error: txnErr } = await supabase.from('transactions').insert(
    seedTransactions.map((t) => ({
      id: txnIdMap.get(t.id),
      kind: t.kind,
      description: t.desc,
      amount: t.amount,
      date: t.date,
      schedule_f_line: t.scheduleFLine,
      business: t.business,
    }))
  );
  if (txnErr) return { error: txnErr.message };

  // 'everyone'/'kids' stay as sentinels; any specific-person assignment in
  // the seed data (e.g. 'dad') maps to whoever is running the seed, since
  // only one real profile is guaranteed to exist at this point.
  const { error: taskErr } = await supabase.from('tasks').insert(
    seedTasks.map((t) => ({
      id: makeId(),
      title: t.title,
      date: t.date,
      type: t.type,
      assignee_user_id: t.assigneeUserId === 'everyone' || t.assigneeUserId === 'kids' ? t.assigneeUserId : me,
      creator_user_id: me,
      done: t.done,
    }))
  );
  if (taskErr) return { error: taskErr.message };

  const eqIdMap = new Map(seedEquipment.map((eq) => [eq.id, makeId()]));
  const { error: eqErr } = await supabase.from('equipment').insert(
    seedEquipment.map((eq) => ({
      id: eqIdMap.get(eq.id),
      name: eq.name,
      hours: eq.hours,
      unit: eq.unit,
      last_service: eq.lastService,
    }))
  );
  if (eqErr) return { error: eqErr.message };

  const recordRows = seedEquipment.flatMap((eq) =>
    eq.history.map((h) => ({ id: makeId(), equipment_id: eqIdMap.get(eq.id), date: h.date, hours: h.hours, note: h.note }))
  );
  if (recordRows.length) {
    const { error } = await supabase.from('equipment_service_records').insert(recordRows);
    if (error) return { error: error.message };
  }

  const fbIdMap = new Map(seedFeedback.map((fb) => [fb.id, makeId()]));
  const { error: fbErr } = await supabase.from('feedback').insert(
    seedFeedback.map((fb) => ({ id: fbIdMap.get(fb.id), who: fb.who, author_user_id: me, date: fb.date, text: fb.text, status: fb.status }))
  );
  if (fbErr) return { error: fbErr.message };

  const nowIso = new Date().toISOString();
  const auditRows = [
    ...seedAnimals.flatMap((a) => {
      const business = a.cls === 'pet' ? 'General' : businessForSpecies(a.species);
      return a.events.map((e) => ({
        id: makeId(),
        ts: nowIso,
        actor: e.actor,
        kind: e.type,
        ref_type: 'animal',
        ref_id: animalIdMap.get(a.id),
        business,
        summary: `${a.name || '#' + a.tag} — ${e.title}`,
        date_occurred: e.date,
      }));
    }),
    ...seedTransactions.map((t) => ({
      id: makeId(),
      ts: nowIso,
      actor: 'You',
      kind: t.kind === 'income' ? 'Income' : 'Expense',
      ref_type: 'transaction',
      ref_id: txnIdMap.get(t.id),
      business: t.business,
      summary: `${t.desc} — ${t.kind === 'income' ? '+' : '−'}$${t.amount.toLocaleString()}`,
      date_occurred: t.date,
    })),
    ...seedEquipment.map((eq) => ({
      id: makeId(),
      ts: nowIso,
      actor: 'You',
      kind: 'Equipment added',
      ref_type: 'equipment',
      ref_id: eqIdMap.get(eq.id),
      business: 'General',
      summary: `${eq.name} added`,
      date_occurred: nowIso.slice(0, 10),
    })),
    ...seedFeedback.map((fb) => ({
      id: makeId(),
      ts: nowIso,
      actor: fb.who,
      kind: 'Feedback',
      ref_type: 'feedback',
      ref_id: fbIdMap.get(fb.id),
      business: 'General',
      summary: `Feedback — ${fb.text}`,
      date_occurred: fb.date,
    })),
  ];
  const { error: auditErr } = await supabase.from('audit_log').insert(auditRows);
  if (auditErr) return { error: auditErr.message };

  return { error: null };
}
