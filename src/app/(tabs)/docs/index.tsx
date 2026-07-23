import { useEffect } from 'react';
import { Text, View, Pressable, Linking, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { useStore } from '@/store/store';
import { useProfile } from '@/store/authStore';
import { useOneDriveStore } from '@/store/oneDriveStore';
import { supabase } from '@/lib/supabase';
import type { Doc, DocFolder } from '@/domain/types';
import { colors, radii, shadow } from '@/theme/tokens';
import { fonts } from '@/theme/typography';
import { Screen, Card, Row, SectionLabel } from '@/components/ui';

const FOLDERS: { key: DocFolder; icon: string }[] = [
  { key: 'Brand inspections', icon: '📋' },
  { key: 'Receipts', icon: '🧾' },
  { key: 'Vet records', icon: '💉' },
  { key: 'Insurance & titles', icon: '🛡' },
];

export default function DocsScreen() {
  const docs = useStore((s) => s.docs);
  const addDoc = useStore((s) => s.addDoc);
  const deleteDoc = useStore((s) => s.deleteDoc);
  const role = useProfile().role;
  const isKid = role === 'kid';
  const isAdmin = role === 'admin';
  const connected = useOneDriveStore((s) => s.connected);
  const lastSyncAt = useOneDriveStore((s) => s.lastSyncAt);
  const lastSyncError = useOneDriveStore((s) => s.lastSyncError);
  const syncPendingDocs = useOneDriveStore((s) => s.syncPendingDocs);

  // Opportunistic sync: catches anything uploaded before the owner ever
  // connected, and anything uploaded elsewhere in the app (e.g. a receipt
  // from Money) that this screen wasn't open for. No true background sync —
  // this only fires while a family member happens to have Docs open.
  const pendingCount = docs.filter((d) => !d.oneDriveId && d.storagePath).length;
  useEffect(() => {
    if (connected && pendingCount > 0) syncPendingDocs();
  }, [connected, pendingCount]);

  const upload = async (folder: DocFolder) => {
    if (isKid) return;
    const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    addDoc({ name: asset.name, folder, localUri: asset.uri });
  };

  const openDoc = async (doc: Doc) => {
    if (!doc.storagePath) return;
    const { data, error } = await supabase.storage.from('docs').createSignedUrl(doc.storagePath, 60);
    if (error || !data) return;
    Linking.openURL(data.signedUrl);
  };

  const bannerTitle = lastSyncError
    ? 'OneDrive sync failed'
    : connected
      ? 'Backed up to OneDrive'
      : 'Not connected to OneDrive yet';
  const bannerSub = lastSyncError
    ? lastSyncError
    : connected
      ? `/Small Farm USA${lastSyncAt ? ` · last sync ${new Date(lastSyncAt).toLocaleString()}` : ''}`
      : 'Documents are safely stored, and sync to OneDrive once connected — connect in More › OneDrive backup';

  return (
    <Screen>
      <Text style={styles.title}>Farm documents</Text>

      <View style={[styles.banner, lastSyncError && styles.bannerError]}>
        <View style={[styles.bannerIcon, lastSyncError && styles.bannerIconError]}>
          <Text style={styles.bannerIconText}>OD</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.bannerTitle, lastSyncError && styles.bannerTitleError]}>{bannerTitle}</Text>
          <Text style={styles.bannerSub}>{bannerSub}</Text>
        </View>
      </View>

      <View style={styles.grid}>
        {FOLDERS.map((f) => {
          const count = docs.filter((d) => d.folder === f.key).length;
          return (
            <Pressable
              key={f.key}
              onPress={() => router.push({ pathname: '/docs/[folder]', params: { folder: f.key } })}
              style={({ pressed }) => [styles.folderCard, pressed && styles.folderCardPressed]}>
              <Text style={{ fontSize: 22 }}>{f.icon}</Text>
              <Text style={styles.folderLabel}>{f.key}</Text>
              <Text style={styles.folderCount}>{count} file{count === 1 ? '' : 's'}</Text>
            </Pressable>
          );
        })}
      </View>

      {docs.length > 0 && (
        <>
          <SectionLabel label="Recent uploads" />
          <Card>
            {docs.slice(0, 10).map((d, i) => (
              <Row
                key={d.id}
                icon="📄"
                iconSize={34}
                title={d.name}
                sub={`${d.uploadedAt.slice(0, 10)} · ${d.uploadedBy} · ${d.folder}${d.oneDriveId ? ' · ☁️ synced' : ''}`}
                showDivider={i < Math.min(docs.length, 10) - 1}
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
        </>
      )}

      {!isKid && (
        <Pressable onPress={() => upload('Receipts')} style={styles.captureArea}>
          <Text style={{ fontSize: 20 }}>📷</Text>
          <Text style={styles.captureLabel}>Snap or upload a document</Text>
          <Text style={styles.captureHelper}>Brand inspections, receipts, vet records…</Text>
        </Pressable>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: fonts.displayExtraBold, fontSize: 21, color: colors.ink },
  banner: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    backgroundColor: colors.docsBannerBg,
    borderWidth: 1,
    borderColor: colors.docsBannerBorder,
    borderRadius: 14,
    padding: 14,
    marginTop: 14,
  },
  bannerError: { backgroundColor: colors.alertTint, borderColor: colors.alertAccent },
  bannerIcon: { width: 30, height: 30, borderRadius: 8, backgroundColor: colors.petAccent, alignItems: 'center', justifyContent: 'center' },
  bannerIconError: { backgroundColor: colors.alertAccent },
  bannerIconText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  bannerTitle: { fontWeight: '700', fontSize: 12.5, color: colors.petInk },
  bannerTitleError: { color: colors.alertAccent },
  bannerSub: { fontSize: 11.5, color: colors.petMuted },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 16 },
  folderCard: {
    width: '47.5%',
    backgroundColor: '#fff',
    borderRadius: radii.card,
    padding: 14,
    ...shadow.card,
  },
  folderCardPressed: { opacity: 0.85 },
  folderLabel: { fontWeight: '700', fontSize: 13, color: colors.ink, marginTop: 8 },
  folderCount: { fontSize: 11.5, color: colors.muted, marginTop: 2 },
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
  captureHelper: { fontSize: 11.5, color: colors.muted, marginTop: 2 },
});
