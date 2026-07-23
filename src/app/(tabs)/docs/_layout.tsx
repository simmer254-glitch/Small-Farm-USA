import { Stack } from 'expo-router';

export default function DocsStackLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="[folder]" />
    </Stack>
  );
}
