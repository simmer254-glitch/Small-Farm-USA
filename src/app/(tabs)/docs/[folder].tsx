import { Text, View, Pressable, Linking, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { useStore } from '@/store/store';
import { useProfile } from '@/store/authStore';
import { supabase } from '@/lib/supabase';
import type { Doc, DocFolder } from '@/domain/types';
import { colors, radii } from '@/theme/tokens';
import { fonts } from '@/theme/typography';
import { Screen, Card, Row, EmptyState } from '@/components/ui';

export default function DocsFolderScreen() {
  const { folder } = useLocalSearchParams<{ folder: DocFolder }>();
  const docs = useStore((s) => s.docs);
  const addDoc = useStore((s) => s.addDoc);
  const deleteDoc = useStore((s) => s.deleteDoc);
  const role = useProfile().role;
  const isKid = role === 'kid';
  const isAdmin = role === 'admin';

  const folderDocs = docs.filter((d) => d.folder === folder);

  const upload = async () => {
    if (isKid) return;
    const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    addDoc({ name: asset.name, folder, localUri: asset.uri });
  };

  const openDoc = async (doc: Doc) => {
    if (!doc.storagePath) return;
    // storagePath is just the doc's bare UUID (no extension — see addDoc's
    // rationale), so without `download` set to the real display name, the
    // browser would save it with no filename/extension at all.
    const { data, error } = await supabase.storage.from('docs').createSignedUrl(doc.storagePath, 60, { download: doc.name });
    if (error || !data) return;
    Linking.openURL(data.signedUrl);
  };

  return (
    <Screen>
      <Text style={styles.backLink} onPress={() => router.push('/docs')}>
        ‹ Documents
      </Text>
      <Text style={styles.title}>{folder}</Text>

      {folderDocs.length > 0 ? (
        <Card style={{ marginTop: 14 }}>
          {folderDocs.map((d, i) => (
            <Row
              key={d.id}
              icon="📄"
              iconSize={34}
              title={d.name}
              sub={`${d.uploadedAt.slice(0, 10)} · ${d.uploadedBy}${d.oneDriveId ? ' · ☁️ synced' : ''}`}
              showDivider={i < folderDocs.length - 1}
              trailing={
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  {d.storagePath && (
                    <Pressable onPress={() => openDoc(d)} hitSlop={8}>
                      <Text style={{ color: colors.primary, fontSize: 12.5, fontWeight: '700' }}>Open</Text>
                    </Pressable>
                  )}
                  {isAdmin && (
                    <Pressable onPress={() => deleteDoc(d.id)} hitSlop={8}>
                      <Text style={{ color: colors.faint, fontSize: 15 }}>✕</Text>
                    </Pressable>
                  )}
                </View>
              }
            />
          ))}
        </Card>
      ) : (
        <EmptyState icon="📄" title="No files yet" helper={`Nothing in ${folder} yet — add the first one below.`} />
      )}

      {!isKid && (
        <Pressable onPress={upload} style={styles.captureArea}>
          <Text style={{ fontSize: 20 }}>📷</Text>
          <Text style={styles.captureLabel}>Add a file to {folder}</Text>
        </Pressable>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  backLink: { fontSize: 13, color: colors.primary, fontWeight: '600', marginBottom: 12 },
  title: { fontFamily: fonts.displayExtraBold, fontSize: 21, color: colors.ink },
  captureArea: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.uploadDash,
    borderRadius: radii.card,
    padding: 20,
    alignItems: 'center',
    marginTop: 14,
  },
  captureLabel: { fontWeight: '700', fontSize: 13, color: colors.primary, marginTop: 6 },
});
