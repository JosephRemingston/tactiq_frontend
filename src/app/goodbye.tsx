import { router } from 'expo-router';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme/ThemeProvider';
import { Button } from '@/ui/Button';
import { Deco } from '@/ui/bits';
import { Wordmark } from '@/ui/Logo';
import { Rise } from '@/ui/motion';
import { T } from '@/ui/Text';

/** After account deletion. */
export default function Goodbye() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: c.bg, padding: 16, paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 }}>
      <Deco width={120} style={{ position: 'absolute', right: -30, top: insets.top + 30 }} mirror />
      <Rise>
        <Wordmark size={22} />
        <T v="display" style={{ marginTop: 40 }}>
          Your account is deleted
        </T>
        <T v="body" color="muted" style={{ marginTop: 12 }}>
          Thanks for watching with us. You can still browse matches without an account, or start again any time.
        </T>
      </Rise>
      <View style={{ flex: 1 }} />
      <Rise index={1} style={{ gap: 10 }}>
        <Button label="Browse matches" onPress={() => router.replace('/explore')} />
        <Button label="Back to start" variant="text" onPress={() => router.replace('/welcome')} />
      </Rise>
    </View>
  );
}
