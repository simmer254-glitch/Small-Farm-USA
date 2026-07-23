import { useState } from 'react';
import { Text, View, TextInput, Pressable, Linking, StyleSheet } from 'react-native';
import { router, useLocalSearchParams, Redirect } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useStore } from '@/store/store';
import { useProfile } from '@/store/authStore';
import { useOneDriveStore } from '@/store/oneDriveStore';
import { supabase } from '@/lib/supabase';
import { EXPENSE_LINES, INCOME_LINES } from '@/domain/scheduleF';
import { todayIso } from '@/domain/dates';
import type { Business, TransactionKind } from '@/domain/types';
import { colors, radii } from '@/theme/tokens';
import { fonts } from '@/theme/typography';
import { Screen, Chip, PrimaryButton, CalendarDatePicker } from '@/components/ui';

const BUSINESSES: Business[] = ['Cattle', 'Poultry', 'Hogs', 'General'];

export default function AddTransactionScreen() {
  const params = useLocalSearchParams<{ kind?: string; id?: string }>();
  const transactions = useStore((s) => s.transactions);
  const editing = params.id ? transactions.find((t) => t.id === params.id) : undefined;
  const kind: TransactionKind = editing ? editing.kind : params.kind === 'income' ? 'income' : 'expense';
  const addTransaction = useStore((s) => s.addTransaction);
  const updateTransaction = useStore((s) => s.updateTransaction);
  const deleteTransaction = useStore((s) => s.deleteTransaction);
  const addDoc = useStore((s) => s.addDoc);
  const docs = useStore((s) => s.docs);
  const role = useProfile().role;
  const isKid = role === 'kid';
  const isAdmin = role === 'admin';

  const lineOptions = kind === 'income' ? INCOME_LINES : EXPENSE_LINES;

  if (isKid) return <Redirect href="/more" />;

  const [desc, setDesc] = useState(editing?.desc ?? '');
  const [amount, setAmount] = useState(editing ? String(editing.amount) : '');
  const [date, setDate] = useState(editing?.date ?? todayIso());
  const [business, setBusiness] = useState<Business>(editing?.business ?? 'Cattle');
  const [line, setLine] = useState<string>(editing?.scheduleFLine ?? lineOptions[kind === 'income' ? 1 : 2]);
  const [linePickerOpen, setLinePickerOpen] = useState(false);
  const [receiptUri, setReceiptUri] = useState<string | null>(null);

  const existingReceipt = editing?.receiptDocId ? docs.find((d) => d.id === editing.receiptDocId) : undefined;

  const attachReceipt = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.6 });
    if (!result.canceled && result.assets?.[0]) {
      setReceiptUri(result.assets[0].uri);
    }
  };

  const viewExistingReceipt = async () => {
    if (!existingReceipt?.storagePath) return;
    // storagePath is just the doc's bare UUID (no extension — see addDoc's
    // rationale), so without `download` set to the real display name, the
    // browser would save it with no filename/extension at all.
    const { data, error } = await supabase.storage.from('docs').createSignedUrl(existingReceipt.storagePath, 60, { download: existingReceipt.name });
    if (error || !data) return;
    Linking.openURL(data.signedUrl);
  };

  const save = async () => {
    if (!desc.trim() || !Number(amount)) return;
    let receiptDocId = editing?.receiptDocId;
    if (receiptUri) {
      // addDoc returns '' if the Storage upload failed — treat that as "no
      // new receipt" rather than passing an empty string as a foreign key.
      receiptDocId = (await addDoc({ name: `Receipt — ${desc.trim()}.jpg`, folder: 'Receipts', localUri: receiptUri })) || receiptDocId;
      // Fire-and-forget: don't make saving the entry wait on a network round
      // trip to Microsoft. No-ops instantly if nobody's connected yet.
      useOneDriveStore.getState().syncPendingDocs();
    }
    if (editing) {
      await updateTransaction(editing.id, { kind, desc: desc.trim(), amount: Number(amount), date, scheduleFLine: line, business, receiptDocId });
    } else {
      await addTransaction({ kind, desc: desc.trim(), amount: Number(amount), date, scheduleFLine: line, business, receiptDocId });
    }
    router.push('/more/money');
  };

  const remove = async () => {
    if (!editing) return;
    await deleteTransaction(editing.id);
    router.push('/more/money');
  };

  return (
    <Screen>
      <Text style={styles.backLink} onPress={() => router.push('/more/money')}>
        ‹ Cancel
      </Text>
      <Text style={styles.title}>{editing ? 'Edit entry' : kind === 'income' ? 'New income' : 'New expense'}</Text>

      <View style={styles.grid}>
        <View style={styles.fullCell}>
          <Text style={styles.fieldLabel}>DESCRIPTION</Text>
          <TextInput
            value={desc}
            onChangeText={setDesc}
            placeholder="e.g. Feed — creep pellets"
            placeholderTextColor={colors.faint}
            style={styles.input}
          />
        </View>
        <View style={styles.halfCell}>
          <Text style={styles.fieldLabel}>AMOUNT ($)</Text>
          <TextInput value={amount} onChangeText={setAmount} placeholder="0.00" placeholderTextColor={colors.faint} keyboardType="numeric" style={styles.input} />
        </View>
        <View style={styles.halfCell}>
          <Text style={styles.fieldLabel}>DATE</Text>
          <CalendarDatePicker value={date} onChange={setDate} />
        </View>
        <View style={styles.fullCell}>
          <Text style={styles.fieldLabel}>BUSINESS</Text>
          <View style={styles.chipWrap}>
            {BUSINESSES.map((b) => (
              <Chip key={b} label={b} selected={business === b} onPress={() => setBusiness(b)} />
            ))}
          </View>
        </View>
        <View style={styles.fullCell}>
          <Text style={styles.fieldLabel}>SCHEDULE F CATEGORY</Text>
          <Pressable onPress={() => setLinePickerOpen((o) => !o)} style={styles.select}>
            <Text style={styles.selectText} numberOfLines={1}>
              {line}
            </Text>
            <Text style={{ color: colors.muted }}>{linePickerOpen ? '▴' : '▾'}</Text>
          </Pressable>
          {linePickerOpen && (
            <View style={styles.optionsBox}>
              {lineOptions.map((o) => (
                <Pressable
                  key={o}
                  onPress={() => {
                    setLine(o);
                    setLinePickerOpen(false);
                  }}
                  style={styles.optionRow}>
                  <Text style={[styles.optionText, o === line && { color: colors.primary, fontWeight: '700' }]}>{o}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </View>

      <Pressable onPress={attachReceipt} style={[styles.receiptArea, { borderColor: receiptUri ? colors.primary : colors.uploadDash, backgroundColor: receiptUri ? colors.primaryTint : '#fff' }]}>
        <Text style={{ fontSize: 20 }}>📷</Text>
        <Text style={[styles.receiptLabel, { color: receiptUri ? colors.primaryDeep : colors.primary }]}>
          {receiptUri ? '✓ New receipt photo attached' : existingReceipt ? '✓ Receipt attached — tap to replace' : 'Snap receipt photo'}
        </Text>
        <Text style={styles.receiptHelper}>Receipt photos file automatically into Docs › Receipts</Text>
      </Pressable>
      {existingReceipt && !receiptUri && (
        <Text style={styles.viewReceiptLink} onPress={viewExistingReceipt}>
          View current receipt
        </Text>
      )}

      <PrimaryButton label={editing ? 'Save changes' : 'Save entry'} onPress={save} style={{ marginTop: 16 }} />

      {editing &&
        (isAdmin ? (
          <Pressable onPress={remove} style={styles.deleteRow}>
            <Text style={styles.deleteLabel}>Delete entry (admin)</Text>
          </Pressable>
        ) : (
          <Text style={styles.noDeleteLabel}>Only an admin can delete entries</Text>
        ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  backLink: { fontSize: 13, color: colors.primary, fontWeight: '600', marginBottom: 12 },
  title: { fontFamily: fonts.displayExtraBold, fontSize: 21, color: colors.ink },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 16 },
  fullCell: { width: '100%' },
  halfCell: { width: '47.5%' },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: colors.muted, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: radii.input,
    padding: 13,
    fontSize: 15,
    backgroundColor: '#fff',
    color: colors.ink,
  },
  chipWrap: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  select: {
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: radii.input,
    padding: 13,
    backgroundColor: '#fff',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectText: { fontSize: 14, color: colors.ink, flex: 1 },
  optionsBox: { borderWidth: 1, borderColor: colors.inputBorder, borderRadius: radii.input, marginTop: 6, overflow: 'hidden', backgroundColor: '#fff' },
  optionRow: { padding: 12, borderBottomWidth: 1, borderBottomColor: colors.divider },
  optionText: { fontSize: 13.5, color: colors.ink },
  receiptArea: { marginTop: 12, borderRadius: radii.card, padding: 16, alignItems: 'center', borderWidth: 2, borderStyle: 'dashed' },
  receiptLabel: { fontWeight: '700', fontSize: 13, marginTop: 4 },
  receiptHelper: { fontSize: 11.5, color: colors.muted, marginTop: 2 },
  viewReceiptLink: { textAlign: 'center', fontSize: 12.5, fontWeight: '600', color: colors.primary, marginTop: 8 },
  deleteRow: { marginTop: 10, padding: 10 },
  deleteLabel: { textAlign: 'center', fontSize: 12.5, fontWeight: '700', color: colors.danger },
  noDeleteLabel: { marginTop: 10, padding: 10, textAlign: 'center', fontSize: 11.5, color: colors.faint },
});
