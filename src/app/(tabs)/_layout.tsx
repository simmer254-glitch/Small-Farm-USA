import { Text } from 'react-native';
import { Tabs, Redirect } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import { colors } from '@/theme/tokens';
import { fonts } from '@/theme/typography';

const TAB_ICON: Record<string, string> = {
  home: '⌂',
  animals: '☰',
  calendar: '📅',
  docs: '▤',
  more: '⚙',
};

export default function TabsLayout() {
  const session = useAuthStore((s) => s.session);
  if (!session) return <Redirect href="/sign-in" />;

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.faint,
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopColor: colors.chipBg,
          paddingTop: 10,
          paddingBottom: 18,
          paddingHorizontal: 8,
          height: 78,
        },
        tabBarLabelStyle: { fontFamily: fonts.bodySemiBold, fontSize: 10.5 },
        tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>{TAB_ICON[route.name]}</Text>,
      })}>
      <Tabs.Screen name="home" options={{ title: 'Home' }} />
      <Tabs.Screen name="animals" options={{ title: 'Animals' }} />
      <Tabs.Screen name="calendar" options={{ title: 'Calendar' }} />
      <Tabs.Screen name="docs" options={{ title: 'Docs' }} />
      <Tabs.Screen name="more" options={{ title: 'More' }} />
    </Tabs>
  );
}
