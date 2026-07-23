import { useState } from 'react';
import { Text, View, TextInput, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useStore } from '@/store/store';
import { useProfile } from '@/store/authStore';
import type { Role } from '@/domain/types';
import { colors, radii } from '@/theme/tokens';
import { fonts } from '@/theme/typography';
import { Screen, Card, Row, Chip, PrimaryButton } from '@/components/ui';

const ROLE_LABEL: Record<Role, string> = { admin: 'Admin', member: 'Member', kid: 'Kid mode' };
const ROLE_BG: Record<Role, string> = { admin: colors.primary, member: colors.muted, kid: colors.petAccent };
const ROLES: Role[] = ['admin', 'member', 'kid'];

export default function FamilyMembersScreen() {
  const allProfiles = useStore((s) => s.profiles);
  const profiles = allProfiles.filter((p) => !p.removedAt);
  const pendingInvites = useStore((s) => s.pendingInvites);
  const invite = useStore((s) => s.invite);
  const setUserRole = useStore((s) => s.setUserRole);
  const cancelInvite = useStore((s) => s.cancelInvite);
  const removeFamilyMember = useStore((s) => s.removeFamilyMember);
  const currentUser = useProfile();
  const isAdmin = currentUser.role === 'admin';

  const [editingId, setEditingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<Role>('member');
  const [message, setMessage] = useState('');

  const sendInvite = async () => {
    if (!inviteEmail.trim()) return;
    const { error } = await invite(inviteEmail.trim(), inviteRole);
    if (error) {
      setMessage(`Couldn't add invite: ${error}`);
      return;
    }
    setMessage(`✓ ${inviteEmail.trim()} can now sign in as ${ROLE_LABEL[inviteRole]} — tell them to open the app.`);
    setInviteEmail('');
  };

  const changeRole = async (userId: string, role: Role) => {
    const { error } = await setUserRole(userId, role);
    if (error) setMessage(`Couldn't change role: ${error}`);
    setEditingId(null);
  };

  const removeMember = async (userId: string, name: string) => {
    const { error } = await removeFamilyMember(userId);
    if (error) {
      setMessage(`Couldn't remove ${name}: ${error}`);
    } else {
      setMessage(`✓ ${name} has been removed and can no longer sign in.`);
    }
    setRemovingId(null);
    setEditingId(null);
  };

  return (
    <Screen>
      <Text style={styles.backLink} onPress={() => router.push('/more')}>
        ‹ More
      </Text>
      <Text style={styles.title}>Family members</Text>
      <Text style={styles.helper}>
        {isAdmin
          ? 'Add a family member by email below, then tell them to open the app and sign in with that address.'
          : 'Everyone signed in to Small Farm USA.'}
      </Text>

      <Card style={{ marginTop: 14 }}>
        {profiles.map((p, i) => (
          <View key={p.id}>
            <Row
              title={p.name}
              sub={p.email}
              showDivider={i < profiles.length - 1 && editingId !== p.id}
              trailing={
                isAdmin ? (
                  <Pressable onPress={() => setEditingId((id) => (id === p.id ? null : p.id))} style={[styles.roleChip, { backgroundColor: ROLE_BG[p.role] }]}>
                    <Text style={styles.roleChipLabel}>{ROLE_LABEL[p.role]} ▾</Text>
                  </Pressable>
                ) : (
                  <View style={[styles.roleChip, { backgroundColor: ROLE_BG[p.role] }]}>
                    <Text style={styles.roleChipLabel}>{ROLE_LABEL[p.role]}</Text>
                  </View>
                )
              }
            />
            {editingId === p.id && (
              <View style={[styles.roleEditor, i < profiles.length - 1 && styles.divider]}>
                <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                  {ROLES.map((r) => (
                    <Chip key={r} label={ROLE_LABEL[r]} selected={r === p.role} onPress={() => changeRole(p.id, r)} />
                  ))}
                </View>
                {p.id !== currentUser.id && (
                  <View style={{ marginTop: 10 }}>
                    {removingId === p.id ? (
                      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                        <Pressable onPress={() => removeMember(p.id, p.name)} style={styles.confirmRemoveBtn}>
                          <Text style={styles.confirmRemoveLabel}>Confirm remove {p.name}</Text>
                        </Pressable>
                        <Pressable onPress={() => setRemovingId(null)} hitSlop={8}>
                          <Text style={styles.cancelRemoveLabel}>Cancel</Text>
                        </Pressable>
                      </View>
                    ) : (
                      <Pressable onPress={() => setRemovingId(p.id)} hitSlop={8}>
                        <Text style={styles.removeLabel}>Remove from family</Text>
                      </Pressable>
                    )}
                  </View>
                )}
              </View>
            )}
          </View>
        ))}
      </Card>

      {isAdmin && pendingInvites.length > 0 && (
        <>
          <Text style={styles.sectionLabel}>Pending invites</Text>
          <Card>
            {pendingInvites.map((inv, i) => (
              <Row
                key={inv.email}
                title={inv.email}
                sub={`Invited as ${ROLE_LABEL[inv.role]}`}
                showDivider={i < pendingInvites.length - 1}
                trailing={
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={[styles.roleChip, { backgroundColor: colors.faint }]}>
                      <Text style={styles.roleChipLabel}>Pending</Text>
                    </View>
                    <Pressable onPress={() => cancelInvite(inv.email)} hitSlop={8}>
                      <Text style={{ color: colors.faint, fontSize: 15 }}>✕</Text>
                    </Pressable>
                  </View>
                }
              />
            ))}
          </Card>
        </>
      )}

      {isAdmin && (
        <>
          <Text style={styles.sectionLabel}>Add a family member</Text>
          <Card style={styles.inviteCard}>
            <TextInput
              value={inviteEmail}
              onChangeText={setInviteEmail}
              placeholder="their-email@example.com"
              placeholderTextColor={colors.faint}
              autoCapitalize="none"
              keyboardType="email-address"
              style={styles.input}
            />
            <View style={styles.chipRow}>
              {ROLES.map((r) => (
                <Chip key={r} label={ROLE_LABEL[r]} selected={inviteRole === r} onPress={() => setInviteRole(r)} />
              ))}
            </View>
            <PrimaryButton label="Add" onPress={sendInvite} style={{ marginTop: 10 }} />
          </Card>
        </>
      )}

      {!!message && <Text style={styles.message}>{message}</Text>}
    </Screen>
  );
}

const styles = StyleSheet.create({
  backLink: { fontSize: 13, color: colors.primary, fontWeight: '600', marginBottom: 12 },
  title: { fontFamily: fonts.displayExtraBold, fontSize: 21, color: colors.ink },
  helper: { fontSize: 12.5, color: colors.muted, marginTop: 3 },
  sectionLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 20,
    marginBottom: 10,
  },
  roleChip: { borderRadius: 14, paddingVertical: 5, paddingHorizontal: 12 },
  roleChipLabel: { fontSize: 12, fontWeight: '700', color: '#fff' },
  roleEditor: { paddingHorizontal: 16, paddingBottom: 14 },
  removeLabel: { fontSize: 12, fontWeight: '700', color: colors.danger },
  confirmRemoveBtn: { backgroundColor: colors.danger, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12 },
  confirmRemoveLabel: { color: '#fff', fontWeight: '700', fontSize: 12 },
  cancelRemoveLabel: { fontSize: 12, fontWeight: '600', color: colors.muted },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  inviteCard: { padding: 14 },
  input: {
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: radii.inputSm,
    padding: 12,
    fontSize: 14,
    backgroundColor: colors.surface,
    color: colors.ink,
  },
  chipRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  message: { fontSize: 12.5, color: colors.primaryDeep, textAlign: 'center', marginTop: 12 },
});
