import { useState } from 'react';
import { Text, View, TextInput, Pressable, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useStore } from '@/store/store';
import { useProfile } from '@/store/authStore';
import { ageLabel, lastWeighInEvent, suggestionFor } from '@/domain/businessLogic';
import { SPECIES_EMOJI, ANIMAL_EVENT_ICON } from '@/domain/icons';
import { colors, radii } from '@/theme/tokens';
import { fonts } from '@/theme/typography';
import { Screen, Card, StatGrid, SectionLabel, Row, PrimaryButton } from '@/components/ui';

type LogType = 'weight' | 'vax' | 'note';

const LOG_PLACEHOLDER: Record<LogType, string> = {
  weight: 'Weight in lb, e.g. 540',
  vax: 'Vaccine given, e.g. Blackleg 7-way',
  note: 'Note, e.g. limping on left front',
};

export default function AnimalDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const animal = useStore((s) => s.animals.find((a) => a.id === id));
  const currentUser = useProfile();
  const addAnimalEvent = useStore((s) => s.addAnimalEvent);
  const markSold = useStore((s) => s.markSold);
  const markButchered = useStore((s) => s.markButchered);
  const deleteAnimal = useStore((s) => s.deleteAnimal);

  const [logType, setLogType] = useState<LogType | null>(null);
  const [logVal, setLogVal] = useState('');
  const [sellOpen, setSellOpen] = useState(false);
  const [sellBuyer, setSellBuyer] = useState('');
  const [sellPrice, setSellPrice] = useState('');

  if (!animal) {
    return (
      <Screen>
        <Text style={styles.backLink} onPress={() => router.push('/animals')}>
          ‹ All animals
        </Text>
        <Text>Animal not found.</Text>
      </Screen>
    );
  }

  const isPet = animal.cls === 'pet';
  const suggestion = suggestionFor(animal);
  const weighIn = lastWeighInEvent(animal);
  const isAdmin = currentUser.role === 'admin';
  const isKid = currentUser.role === 'kid';

  const subtitle = isPet
    ? `Pet / working animal · born ${animal.born}`
    : `${animal.count > 1 ? `Lot of ${animal.count} · ` : ''}${animal.sex} · born ${animal.born} · dam ${animal.dam} · ${animal.status}`;

  const logButtons: { key: LogType; label: string }[] = [
    { key: 'weight', label: '+ Weight' },
    { key: 'vax', label: isPet ? '+ Vet visit' : '+ Vaccination' },
    { key: 'note', label: '+ Note' },
  ];

  const saveLog = () => {
    if (!logType || !logVal.trim()) return;
    addAnimalEvent(animal.id, logType, logVal);
    setLogType(null);
    setLogVal('');
  };

  return (
    <Screen>
      <Text style={styles.backLink} onPress={() => router.push('/animals')}>
        ‹ All animals
      </Text>

      <Card style={styles.headerCard}>
        <View style={styles.headerRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarIcon}>{SPECIES_EMOJI[animal.species]}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{(animal.name ? `${animal.name} · ` : '') + `#${animal.tag}`}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>
        </View>
        <StatGrid
          stats={[
            { label: 'Age', value: ageLabel(animal.born) },
            { label: 'Last weighed', value: weighIn ? `${weighIn.lb} lb (${weighIn.date})` : 'Not recorded' },
            { label: 'Color', value: animal.color },
          ]}
        />
      </Card>

      {suggestion && (
        <View style={styles.suggestionBox}>
          <Text style={{ fontSize: 16 }}>💡</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.suggestionTitle}>{suggestion.title}</Text>
            <Text style={styles.suggestionBody}>{suggestion.body}</Text>
          </View>
        </View>
      )}

      {!isKid && (
        <>
          <View style={styles.logButtonRow}>
            {logButtons.map((b) => (
              <Pressable
                key={b.key}
                onPress={() => setLogType((t) => (t === b.key ? null : b.key))}
                style={[styles.logButton, { backgroundColor: logType === b.key ? colors.primary : '#fff' }]}>
                <Text style={[styles.logButtonLabel, { color: logType === b.key ? '#fff' : colors.primary }]}>{b.label}</Text>
              </Pressable>
            ))}
          </View>

          {logType && (
            <View style={styles.logForm}>
              <TextInput
                value={logVal}
                onChangeText={setLogVal}
                placeholder={LOG_PLACEHOLDER[logType]}
                placeholderTextColor={colors.faint}
                keyboardType={logType === 'weight' ? 'numeric' : 'default'}
                style={styles.logInput}
              />
              <Pressable onPress={saveLog} style={styles.logSaveButton}>
                <Text style={styles.logSaveLabel}>Save</Text>
              </Pressable>
            </View>
          )}
        </>
      )}

      <SectionLabel label="Life record" />
      <Card style={{ paddingHorizontal: 16, paddingVertical: 2 }}>
        {animal.events.map((e, i) => (
          <Row
            key={e.id}
            icon={ANIMAL_EVENT_ICON[e.type]}
            iconSize={30}
            title={e.title}
            sub={`${e.date} · ${e.actor}`}
            showDivider={i < animal.events.length - 1}
          />
        ))}
      </Card>

      {!isPet && !isKid && (
        <>
          <View style={styles.saleButtonRow}>
            <Pressable
              onPress={() => setSellOpen((o) => !o)}
              style={[styles.saleButton, { backgroundColor: colors.primary }]}>
              <Text style={styles.saleButtonLabel}>Mark sold</Text>
            </Pressable>
            <Pressable onPress={() => markButchered(animal.id)} style={[styles.saleButton, { backgroundColor: colors.butcherBrown }]}>
              <Text style={styles.saleButtonLabel}>Mark butchered</Text>
            </Pressable>
          </View>
          {sellOpen && (
            <View style={styles.sellForm}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TextInput
                  value={sellBuyer}
                  onChangeText={setSellBuyer}
                  placeholder="Buyer, e.g. Sterling Livestock"
                  placeholderTextColor={colors.faint}
                  style={[styles.logInput, { flex: 1 }]}
                />
                <TextInput
                  value={sellPrice}
                  onChangeText={setSellPrice}
                  placeholder="Price $"
                  placeholderTextColor={colors.faint}
                  keyboardType="numeric"
                  style={[styles.logInput, { width: 90 }]}
                />
              </View>
              <Pressable
                onPress={() => {
                  markSold(animal.id, sellBuyer, Number(sellPrice) || 0);
                  setSellOpen(false);
                  setSellBuyer('');
                  setSellPrice('');
                }}
                style={styles.confirmSaleButton}>
                <Text style={styles.saleButtonLabel}>Confirm sale — logs the income entry too</Text>
              </Pressable>
            </View>
          )}
        </>
      )}

      {isPet && (
        <View style={styles.petBanner}>
          <Text style={styles.petBannerText}>🐾 Pet / working animal — never sold or eaten. No lifecycle tracking.</Text>
        </View>
      )}

      {isAdmin ? (
        <Pressable
          onPress={() => {
            deleteAnimal(animal.id);
            router.push('/animals');
          }}
          style={styles.deleteRow}>
          <Text style={styles.deleteLabel}>Delete record (admin)</Text>
        </Pressable>
      ) : (
        <Text style={styles.noDeleteLabel}>Only an admin can delete records</Text>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  backLink: { fontSize: 13, color: colors.primary, fontWeight: '600', marginBottom: 12 },
  headerCard: { padding: 18 },
  headerRow: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: colors.chipBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarIcon: { fontSize: 26 },
  title: { fontFamily: fonts.displayExtraBold, fontSize: 19, color: colors.ink },
  subtitle: { fontSize: 12.5, color: colors.muted, marginTop: 2 },
  suggestionBox: {
    backgroundColor: colors.primaryTint,
    borderWidth: 1,
    borderColor: '#d5ddbf',
    borderRadius: radii.card,
    padding: 14,
    marginTop: 12,
    flexDirection: 'row',
    gap: 12,
  },
  suggestionTitle: { fontWeight: '700', fontSize: 13, color: colors.primaryDeep },
  suggestionBody: { fontSize: 12, color: '#5f6b47', marginTop: 2 },
  logButtonRow: { flexDirection: 'row', gap: 8, marginTop: 14 },
  logButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 4,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  logButtonLabel: { fontWeight: '700', fontSize: 12.5 },
  logForm: { backgroundColor: '#fff', borderRadius: 14, padding: 12, marginTop: 10, flexDirection: 'row', gap: 8 },
  logInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: radii.inputSm,
    padding: 11,
    fontSize: 14,
    backgroundColor: colors.surface,
    color: colors.ink,
  },
  logSaveButton: { backgroundColor: colors.primary, borderRadius: radii.inputSm, paddingVertical: 11, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  logSaveLabel: { color: '#fff', fontWeight: '700', fontSize: 13 },
  saleButtonRow: { flexDirection: 'row', gap: 8, marginTop: 16 },
  saleButton: { flex: 1, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  saleButtonLabel: { color: '#fff', fontWeight: '700', fontSize: 13 },
  sellForm: { backgroundColor: '#fff', borderRadius: 14, padding: 12, marginTop: 10 },
  confirmSaleButton: { backgroundColor: colors.primary, borderRadius: radii.inputSm, padding: 12, alignItems: 'center', marginTop: 8 },
  petBanner: {
    backgroundColor: colors.petBg,
    borderWidth: 1,
    borderColor: colors.petBorder,
    borderRadius: 14,
    padding: 12,
    marginTop: 16,
  },
  petBannerText: { fontSize: 12, color: colors.petMuted, fontWeight: '600', textAlign: 'center' },
  deleteRow: { marginTop: 10, padding: 10 },
  deleteLabel: { textAlign: 'center', fontSize: 12.5, fontWeight: '700', color: colors.danger },
  noDeleteLabel: { marginTop: 10, padding: 10, textAlign: 'center', fontSize: 11.5, color: colors.faint },
});
