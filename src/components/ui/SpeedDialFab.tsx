import { useState } from 'react';
import { Pressable, Text, View, StyleSheet } from 'react-native';
import { colors, shadow } from '@/theme/tokens';
import { fonts } from '@/theme/typography';

export type FabAction = { icon: string; label: string; onPress: () => void };

export function SpeedDialFab({ actions }: { actions: FabAction[] }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {open && (
        <>
          <Pressable style={styles.scrim} onPress={() => setOpen(false)} />
          <View style={styles.actionsCol}>
            {actions.map((a) => (
              <Pressable
                key={a.label}
                onPress={() => {
                  setOpen(false);
                  a.onPress();
                }}
                style={({ pressed }) => [styles.actionRow, pressed && { backgroundColor: colors.primaryTint }]}>
                <Text style={styles.actionIcon}>{a.icon}</Text>
                <Text style={styles.actionLabel} numberOfLines={1}>
                  {a.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </>
      )}
      <Pressable onPress={() => setOpen((o) => !o)} style={({ pressed }) => [styles.fab, pressed && { backgroundColor: colors.primaryHover }]}>
        <Text style={styles.fabIcon}>{open ? '×' : '+'}</Text>
      </Pressable>
    </>
  );
}

const styles = StyleSheet.create({
  scrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(44,51,32,.35)',
    zIndex: 5,
  },
  actionsCol: {
    position: 'absolute',
    right: 18,
    bottom: 140,
    zIndex: 6,
    gap: 8,
    alignItems: 'flex-end',
  },
  actionRow: {
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    ...shadow.popover,
  },
  actionIcon: { fontSize: 15 },
  actionLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.ink,
  },
  fab: {
    position: 'absolute',
    right: 18,
    bottom: 82,
    zIndex: 6,
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.fab,
  },
  fabIcon: {
    fontSize: 26,
    color: '#fff',
  },
});
