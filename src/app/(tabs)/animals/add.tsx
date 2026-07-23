import { useState } from 'react';
import { Text, View, Pressable, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useStore } from '@/store/store';
import { todayIso } from '@/domain/dates';
import { colors, radii } from '@/theme/tokens';
import { fonts } from '@/theme/typography';
import { Screen, TextField, DateField, PrimaryButton } from '@/components/ui';
import type { NewAnimalInput } from '@/store/store';

const LIVESTOCK_SPECIES = [
  { key: 'cattle', emoji: '🐄', label: 'Cattle' },
  { key: 'pig', emoji: '🐖', label: 'Piglet' },
  { key: 'chicken', emoji: '🐔', label: 'Chick(s)' },
] as const;

const PET_SPECIES = [
  { key: 'dog', emoji: '🐕', label: 'Dog' },
  { key: 'cat', emoji: '🐈', label: 'Cat' },
  { key: 'horse', emoji: '🐴', label: 'Horse' },
] as const;

const SEX_BY_SPECIES: Record<string, string[]> = {
  cattle: ['Bull', 'Steer', 'Cow', 'Heifer'],
  pig: ['Gilt', 'Boar', 'Barrow'],
  chicken: ['Pullet', 'Cockerel', 'Straight run'],
};


const schema = z
  .object({
    cls: z.enum(['livestock', 'pet']),
    species: z.string().min(1),
    sex: z.string().optional(),
    tag: z.string().optional(),
    name: z.string().optional(),
    born: z.string().min(1, 'Required'),
    birthWeight: z.string().optional(),
    color: z.string().optional(),
    dam: z.string().optional(),
    count: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.cls === 'livestock') {
      if (!data.tag || !data.tag.trim()) {
        ctx.addIssue({ code: 'custom', path: ['tag'], message: 'Tag # is required' });
      }
    } else {
      if (!data.name || !data.name.trim()) {
        ctx.addIssue({ code: 'custom', path: ['name'], message: 'Name is required' });
      }
    }
  });

type FormValues = z.infer<typeof schema>;

export default function AddAnimalScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const animals = useStore((s) => s.animals);
  const editing = params.id ? animals.find((a) => a.id === params.id) : undefined;
  const addAnimal = useStore((s) => s.addAnimal);
  const updateAnimal = useStore((s) => s.updateAnimal);
  const [saved, setSaved] = useState(false);

  const { control, handleSubmit, watch, setValue, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: editing
      ? {
          cls: editing.cls,
          species: editing.species,
          sex: editing.sex,
          tag: editing.tag,
          name: editing.name,
          born: editing.born,
          birthWeight: '',
          color: editing.color === '—' ? '' : editing.color,
          dam: editing.dam === '—' ? '' : editing.dam,
          count: editing.count > 1 ? String(editing.count) : '',
        }
      : {
          cls: 'livestock',
          species: 'cattle',
          sex: 'Heifer',
          tag: '',
          name: '',
          born: todayIso(),
          birthWeight: '',
          color: '',
          dam: '',
          count: '',
        },
  });

  const cls = watch('cls');
  const species = watch('species');
  const isLivestock = cls === 'livestock';

  const onSubmit = (data: FormValues) => {
    const input: NewAnimalInput = isLivestock
      ? {
          cls: 'livestock',
          species: data.species as 'cattle' | 'pig' | 'chicken',
          sex: data.sex || SEX_BY_SPECIES[data.species][0],
          tag: data.tag!.trim(),
          name: data.name?.trim() || '',
          born: data.born,
          birthWeight: data.birthWeight ? Number(data.birthWeight) : undefined,
          color: data.color?.trim() || '',
          dam: data.dam?.trim() || '',
          count: data.count ? Number(data.count) : 1,
        }
      : {
          cls: 'pet',
          species: data.species as 'dog' | 'cat' | 'horse',
          name: data.name!.trim(),
          born: data.born,
          color: data.color?.trim() || '',
        };

    if (editing) {
      updateAnimal(editing.id, input);
      router.push(`/animals/${editing.id}`);
      return;
    }

    addAnimal(input);
    setSaved(true);
    reset({
      ...data,
      tag: '',
      name: '',
      birthWeight: '',
      color: '',
      dam: '',
      count: '',
    });
  };

  return (
    <Screen>
      <Text style={styles.backLink} onPress={() => router.push(editing ? `/animals/${editing.id}` : '/animals')}>
        ‹ Cancel
      </Text>
      <Text style={styles.title}>{editing ? 'Edit animal' : 'New animal'}</Text>
      <Text style={styles.helper}>Big buttons — easy one-handed at the barn.</Text>

      <Text style={styles.fieldGroupLabel}>TYPE</Text>
      <View style={styles.row2}>
        {(['livestock', 'pet'] as const).map((k) => (
          <Pressable
            key={k}
            onPress={() => {
              setValue('cls', k);
              setSaved(false);
              if (k === 'pet') setValue('species', 'dog');
              else {
                setValue('species', 'cattle');
                setValue('sex', 'Heifer');
              }
            }}
            style={[styles.toggleOpt, cls === k ? styles.optSelected : styles.optUnselected]}>
            <Text style={styles.toggleLabel}>{k === 'livestock' ? '🐄 Livestock' : '🐕 Pet'}</Text>
          </Pressable>
        ))}
      </View>

      {isLivestock ? (
        <>
          <Text style={styles.fieldGroupLabel}>SPECIES</Text>
          <View style={styles.row3}>
            {LIVESTOCK_SPECIES.map((o) => (
              <Pressable
                key={o.key}
                onPress={() => {
                  setValue('species', o.key);
                  setValue('sex', SEX_BY_SPECIES[o.key][0]);
                  setSaved(false);
                }}
                style={[styles.speciesOpt, species === o.key ? styles.optSelected : styles.optUnselected]}>
                <Text style={styles.speciesEmoji}>{o.emoji}</Text>
                <Text style={styles.speciesLabel}>{o.label}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.fieldGroupLabel}>SEX</Text>
          <Controller
            control={control}
            name="sex"
            render={({ field: { value, onChange } }) => (
              <View style={styles.row3}>
                {(SEX_BY_SPECIES[species] || []).map((x) => (
                  <Pressable
                    key={x}
                    onPress={() => onChange(x)}
                    style={[styles.toggleOpt, value === x ? styles.optSelected : styles.optUnselected]}>
                    <Text style={styles.toggleLabel}>{x}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          />

          <View style={styles.grid2}>
            <TextField control={control} name="tag" label="TAG #" placeholder="e.g. 214" style={styles.gridCell} />
            <TextField control={control} name="name" label="NAME (OPTIONAL)" placeholder="e.g. Daisy" style={styles.gridCell} />
            <DateField control={control} name="born" label="BORN" style={styles.gridCell} />
            {!editing && (
              <TextField
                control={control}
                name="birthWeight"
                label="BIRTH WEIGHT (LB, OPT.)"
                placeholder="75"
                keyboardType="numeric"
                style={styles.gridCell}
              />
            )}
            <TextField control={control} name="color" label="COLOR / MARKINGS" placeholder="Black, white face" style={styles.gridCell} />
            <TextField control={control} name="dam" label="DAM (MOTHER)" placeholder="Tag # of dam" style={styles.gridCell} />
            <TextField
              control={control}
              name="count"
              label="COUNT (LOT/BATCH, OPT.)"
              placeholder="1"
              keyboardType="numeric"
              style={styles.gridCell}
            />
          </View>
          <Text style={styles.footNote}>For chick batches or pig litters, set a count and one tag covers the whole lot.</Text>
        </>
      ) : (
        <>
          <Text style={styles.fieldGroupLabel}>SPECIES</Text>
          <View style={styles.row3}>
            {PET_SPECIES.map((o) => (
              <Pressable
                key={o.key}
                onPress={() => {
                  setValue('species', o.key);
                  setSaved(false);
                }}
                style={[styles.speciesOpt, species === o.key ? styles.optSelected : styles.optUnselected]}>
                <Text style={styles.speciesEmoji}>{o.emoji}</Text>
                <Text style={styles.speciesLabel}>{o.label}</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.grid2}>
            <TextField control={control} name="name" label="NAME" placeholder="e.g. Blue" style={styles.gridCellFull} />
            <DateField control={control} name="born" label="BORN (APPROX. OK)" style={styles.gridCell} />
            <TextField control={control} name="color" label="COLOR / BREED" placeholder="Blue heeler" style={styles.gridCell} />
          </View>
          <Text style={styles.petNote}>🐾 Pets & working animals get a light profile — no tags, lots, or sale tracking.</Text>
        </>
      )}

      <PrimaryButton label={editing ? 'Save changes' : 'Save animal'} onPress={handleSubmit(onSubmit)} style={styles.saveButton} />
      {saved && <Text style={styles.savedText}>✓ Saved — added to the herd list</Text>}
    </Screen>
  );
}

const styles = StyleSheet.create({
  backLink: { fontSize: 13, color: colors.primary, fontWeight: '600', marginBottom: 12 },
  title: { fontFamily: fonts.displayExtraBold, fontSize: 21, color: colors.ink },
  helper: { fontSize: 12.5, color: colors.muted, marginTop: 3 },
  fieldGroupLabel: { fontSize: 12, fontWeight: '700', color: colors.muted, marginTop: 18, marginBottom: 8 },
  row2: { flexDirection: 'row', gap: 8 },
  row3: { flexDirection: 'row', gap: 8 },
  toggleOpt: { flex: 1, borderRadius: 14, paddingVertical: 13, paddingHorizontal: 4, alignItems: 'center', borderWidth: 1.5 },
  toggleLabel: { fontWeight: '700', fontSize: 13, color: colors.ink },
  speciesOpt: { flex: 1, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 6, alignItems: 'center', borderWidth: 1.5 },
  speciesEmoji: { fontSize: 22 },
  speciesLabel: { fontSize: 12, fontWeight: '700', color: colors.ink, marginTop: 4 },
  optSelected: { borderColor: colors.primary, backgroundColor: colors.primaryTint },
  optUnselected: { borderColor: colors.inputBorder, backgroundColor: '#fff' },
  grid2: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 16 },
  gridCell: { width: '47.5%' },
  gridCellFull: { width: '100%' },
  footNote: { fontSize: 11.5, color: colors.muted, marginTop: 10 },
  petNote: { fontSize: 11.5, color: colors.petMuted, marginTop: 10 },
  saveButton: { marginTop: 20 },
  savedText: { textAlign: 'center', fontSize: 13, color: colors.success, fontWeight: '700', marginTop: 10 },
});
