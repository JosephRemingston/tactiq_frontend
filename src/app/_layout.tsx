import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { InterTight_600SemiBold, InterTight_700Bold, InterTight_800ExtraBold } from '@expo-google-fonts/inter-tight';
import {
  MaterialSymbolsRounded_400Regular,
  MaterialSymbolsRounded_400Regular_Filled,
} from '@expo-google-fonts/material-symbols-rounded';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AppProviders } from '@/app-shell/AppProviders';
import { boot } from '@/app-shell/boot';
import { applyWebHarness } from '@/dev/webHarness';
import { AuthRoot } from '@/services/clerk';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';

SplashScreen.preventAutoHideAsync().catch(() => {});
boot();
applyWebHarness();

function Navigator() {
  const { c, isDark } = useTheme();
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(c.bg).catch(() => {});
  }, [c.bg]);
  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: c.bg },
          // 250ms page transitions; slide matches the settle-in direction.
          animation: 'slide_from_right',
          animationDuration: 250,
        }}>
        <Stack.Screen name="paywall" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    InterTight_600SemiBold,
    InterTight_700Bold,
    InterTight_800ExtraBold,
    MaterialSymbolsRounded_400Regular,
    MaterialSymbolsRounded_400Regular_Filled,
  });

  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync().catch(() => {});
  }, [loaded, error]);

  if (!loaded && !error) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthRoot>
        <ThemeProvider>
          <AppProviders>
            <Navigator />
          </AppProviders>
        </ThemeProvider>
      </AuthRoot>
    </GestureHandlerRootView>
  );
}
