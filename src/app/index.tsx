import { router } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';

import { useMe } from '@/api/hooks';
import { useAuth } from '@/services/auth';
import { useSettings } from '@/state/settings';
import { Glow } from '@/ui/Glow';
import { Wordmark } from '@/ui/Logo';
import { Rise } from '@/ui/motion';

/**
 * Screen 1, Splash: the wordmark on the base colour (design.md's dark card + lime glow) while
 * the session is restored, then: signed out → Welcome (or Explore when browsing);
 * signed in with nothing followed and not onboarded → Onboarding; otherwise Home.
 */
export default function Splash() {
  const hydrated = useAuth((s) => s.hydrated);
  const status = useAuth((s) => s.status);
  const browsing = useAuth((s) => s.browsing);
  const userKey = useAuth((s) => s.userKey);
  const onboarded = useAuth((s) => s.onboarded);
  const me = useMe();
  const setDepth = useSettings((s) => s.setDepth);

  useEffect(() => {
    if (!hydrated) return;
    const t = setTimeout(() => {
      if (status !== 'signedIn') {
        router.replace(browsing ? '/explore' : '/welcome');
        return;
      }
      if (me.isLoading) return;
      const u = me.data?.user;
      if (u) setDepth(u.depthPreference);
      const followsNothing = !!u && u.followingCounts.teams + u.followingCounts.competitions + u.followingCounts.players === 0;
      if (followsNothing && userKey && !onboarded.includes(userKey)) router.replace('/onboarding/follow');
      else router.replace('/home');
    }, 650);
    return () => clearTimeout(t);
  }, [hydrated, status, browsing, me.isLoading, me.data, userKey, onboarded, setDepth]);

  return (
    <View style={{ flex: 1, backgroundColor: '#0c1112', alignItems: 'center', justifyContent: 'center' }} accessibilityLabel="Tactiq is loading">
      <Glow strength={0.5} />
      <Rise>
        <Wordmark size={34} ink="#f2f5f6" />
      </Rise>
    </View>
  );
}
