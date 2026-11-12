import { router } from 'expo-router';
import { Image } from 'expo-image';
import { View } from 'react-native';

import { useMe } from '@/api/hooks';
import { initials } from '@/lib/format';
import { useTheme } from '@/theme/ThemeProvider';
import { Lift } from '@/ui/motion';
import { T } from '@/ui/Text';

export function AvatarCircle({ name, url, size = 36 }: { name: string | null | undefined; url?: string | null; size?: number }) {
  const { c } = useTheme();
  if (url) return <Image source={{ uri: url }} style={{ width: size, height: size, borderRadius: size / 2 }} accessibilityIgnoresInvertColors />;
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: c.hero, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: c.lime }}>
      <T v="labelSm" tint="#f2f5f6" style={{ fontSize: size * 0.36 }} maxFontSizeMultiplier={1}>
        {initials(name)}
      </T>
    </View>
  );
}

/** Top-bar avatar: opens Profile. */
export function AvatarButton() {
  const me = useMe();
  const u = me.data?.user;
  return (
    <Lift kind="none" onPress={() => router.push('/profile')} accessibilityLabel="Profile and settings" style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}>
      <AvatarCircle name={u?.displayName ?? u?.email ?? 'You'} url={u?.avatarUrl} size={34} />
    </Lift>
  );
}
