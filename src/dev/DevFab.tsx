import { router } from 'expo-router';
import { Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/ui/Icon';
import { T } from '@/ui/Text';
import { useDev } from './devStore';

/** Development builds only: opens the dev menu. Shows the forced state when one is active. */
export function DevFab() {
  const insets = useSafeAreaInsets();
  const forced = useDev((s) => s.forced);
  if (!__DEV__) return null;
  return (
    <Pressable
      onPress={() => router.push('/dev')}
      accessibilityRole="button"
      accessibilityLabel="Open dev menu"
      style={{
        position: 'absolute',
        right: 12,
        bottom: insets.bottom + 84,
        height: 32,
        paddingHorizontal: 10,
        borderRadius: 16,
        backgroundColor: forced ? '#cdf348' : 'rgba(12,17,18,0.82)',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
      }}>
      <Icon name="build" size={15} color={forced ? '#101a05' : '#f2f5f6'} />
      <T v="caption" tint={forced ? '#101a05' : '#f2f5f6'}>
        {forced ? `Dev · ${forced}` : 'Dev'}
      </T>
    </Pressable>
  );
}
