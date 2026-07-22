import { useMemo, useState } from 'react';
import { Text, View, TextInput, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useStore } from '@/store/store';
import { ageLabel, animalBadgeTone } from '@/domain/businessLogic';
import { SPECIES_EMOJI } from '@/domain/icons';
import type { LivestockSpecies } from '@/domain/types';
import { colors, radii } from '@/theme/tokens';
import { fonts } from '@/theme/typography';
import { Screen, Chip, Card, Row, Badge, EmptyState, PrimaryButton, SectionLabel, type BadgeTone } from '@/components/ui';

const BADGE_LABEL: Record<BadgeTone, string> = {
  ok: 'OK',
  action: 'Action',
  sold: 'Sold',
  butchered: 'Butchered',
  pet: 'Pet',
  new: 'New',
  planned: 'Planned',
  done: 'Done',
};

const FILTERS: { key: 'all' | LivestockSpecies; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'cattle', label: '🐄 Cattle' },
  { key: 'pig', label: '🐖 Pigs' },
  { key: 'chicken', label: '🐔 Chickens' },
];

export default function AnimalsScreen() {
  const params = useLocalSearchParams<{ filter?: string }>();
  const animals = useStore((s) => s.animals);
  const [filter, setFilter] = useState<'all' | LivestockSpecies>(
    (params.filter as 'all' | LivestockSpecies) || 'all'
  );
  const [search, setSearch] = useState('');

  const livestock = animals.filter((a) => a.cls !== 'pet');
  const pets = animals.filter((a) => a.cls === 'pet');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return livestock.filter((a) => {
      if (filter !== 'all' && a.species !== filter) return false;
      if (!q) return true;
      return `${a.tag} ${a.name} ${a.dam}`.toLowerCase().includes(q);
    });
  }, [livestock, filter, search]);

  return (
    <Screen>
      <Text style={styles.title}>Animals</Text>

      <View style={styles.chipRow}>
        {FILTERS.map((f) => (
          <Chip key={f.key} label={f.label} selected={filter === f.key} onPress={() => setFilter(f.key)} />
        ))}
      </View>

      {livestock.length > 0 && (
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>⌕</Text>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search tag, name, or dam…"
            placeholderTextColor={colors.faint}
            style={styles.searchInput}
          />
        </View>
      )}

      {livestock.length > 0 ? (
        <Card style={styles.listCard}>
          {filtered.map((a, i) => {
            const tone = animalBadgeTone(a);
            return (
              <Row
                key={a.id}
                icon={SPECIES_EMOJI[a.species]}
                iconSize={40}
                title={(a.name ? `${a.name} · ` : '') + `#${a.tag}`}
                sub={`${a.count > 1 ? `Lot of ${a.count} · ` : ''}${a.sex} · ${ageLabel(a.born)} · ${a.color}`}
                onPress={() => router.push(`/animals/${a.id}`)}
                showDivider={i < filtered.length - 1}
                trailing={<Badge label={BADGE_LABEL[tone]} tone={tone} />}
              />
            );
          })}
        </Card>
      ) : (
        <EmptyState
          icon="🐄"
          title="No animals yet"
          helper="Add your first animal — a calf, a whole flock, or the cows you already have."
        />
      )}

      <SectionLabel label="Pets & working animals" />
      {pets.length > 0 ? (
        <Card variant="pet">
          {pets.map((p, i) => (
            <Row
              key={p.id}
              icon={SPECIES_EMOJI[p.species]}
              iconBg={colors.petChipBg}
              iconSize={40}
              title={p.name}
              titleColor={colors.petInk}
              sub={`${p.species.charAt(0).toUpperCase() + p.species.slice(1)} · ${ageLabel(p.born)} · ${p.color}`}
              subColor={colors.petMuted}
              onPress={() => router.push(`/animals/${p.id}`)}
              showDivider={i < pets.length - 1}
              trailing={<Badge label="Pet" tone="pet" />}
            />
          ))}
        </Card>
      ) : (
        <View style={styles.petEmpty}>
          <Text style={styles.petEmptyText}>
            Dogs, barn cats, horses — kept separate from livestock. Add one via "+ New animal" › Pet / working.
          </Text>
        </View>
      )}

      <PrimaryButton label="+ New animal" onPress={() => router.push('/animals/add')} style={styles.addButton} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: fonts.displayExtraBold, fontSize: 21, color: colors.ink },
  chipRow: { flexDirection: 'row', gap: 8, marginTop: 14, flexWrap: 'wrap' },
  searchBox: {
    marginTop: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    shadowColor: 'rgba(44,51,32,1)',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  searchIcon: { color: colors.faint, fontSize: 14 },
  searchInput: { flex: 1, paddingVertical: 12, paddingHorizontal: 10, fontSize: 13.5, color: colors.ink },
  listCard: { marginTop: 14 },
  petEmpty: {
    backgroundColor: colors.petBg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.petBorder2,
    borderRadius: radii.card,
    padding: 16,
  },
  petEmptyText: { fontSize: 12, color: colors.petMuted, textAlign: 'center' },
  addButton: { marginTop: 16 },
});
