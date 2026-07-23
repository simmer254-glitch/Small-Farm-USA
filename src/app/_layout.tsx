import { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts, Archivo_700Bold, Archivo_800ExtraBold } from '@expo-google-fonts/archivo';
import {
  PublicSans_400Regular,
  PublicSans_500Medium,
  PublicSans_600SemiBold,
  PublicSans_700Bold,
} from '@expo-google-fonts/public-sans';
import { useStore } from '@/store/store';
import { useAuthStore, useInitAuth } from '@/store/authStore';
import { useOneDriveStore, useOneDriveAuthBridge } from '@/store/oneDriveStore';
import { useGoogleCalendarStore, useGoogleCalendarAuthBridge } from '@/store/googleCalendarStore';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Archivo_700Bold,
    Archivo_800ExtraBold,
    PublicSans_400Regular,
    PublicSans_500Medium,
    PublicSans_600SemiBold,
    PublicSans_700Bold,
  });
  const authInitializing = useAuthStore((s) => s.initializing);
  const session = useAuthStore((s) => s.session);
  const loaded = useStore((s) => s.loaded);
  const fetchAll = useStore((s) => s.fetchAll);
  const subscribeRealtime = useStore((s) => s.subscribeRealtime);
  const fetchOneDriveStatus = useOneDriveStore((s) => s.fetchStatus);
  const subscribeOneDriveStatus = useOneDriveStore((s) => s.subscribeStatusRealtime);
  const fetchGoogleStatus = useGoogleCalendarStore((s) => s.fetchStatus);
  const subscribeGoogleStatus = useGoogleCalendarStore((s) => s.subscribeStatusRealtime);
  useInitAuth();
  // Mounted at the root, not in the Docs/More screen that triggers it: the
  // redirect back from Microsoft is a full top-level page reload (this app
  // has no SSR), so nothing screen-local would survive it.
  useOneDriveAuthBridge();
  // Same reasoning as useOneDriveAuthBridge — the redirect back from Google
  // is also a full top-level page reload.
  useGoogleCalendarAuthBridge();

  // Fetch the shared dataset and open realtime subscriptions once a session
  // exists — not before, since RLS has no anon access. Re-runs if the user
  // signs out and a different family member signs in on the same device.
  useEffect(() => {
    if (!session) return;
    fetchAll();
    const unsubscribe = subscribeRealtime();
    fetchOneDriveStatus();
    const unsubscribeOneDrive = subscribeOneDriveStatus();
    fetchGoogleStatus();
    const unsubscribeGoogle = subscribeGoogleStatus();
    return () => {
      unsubscribe();
      unsubscribeOneDrive();
      unsubscribeGoogle();
    };
  }, [session?.user.id]);

  const ready = fontsLoaded && !authInitializing && (!session || loaded);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="sign-in" />
      </Stack>
    </SafeAreaProvider>
  );
}
