import { Stack } from 'expo-router';

export default function MoreStackLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="audit" />
      <Stack.Screen name="family" />
      <Stack.Screen name="money/index" />
      <Stack.Screen name="money/add" />
    </Stack>
  );
}
