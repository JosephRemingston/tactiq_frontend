import { router } from 'expo-router';

import { useFollowMutation, useIsFollowing } from '@/api/hooks';
import type { FollowKind } from '@/api/types';
import { useSignedIn } from '@/services/auth';
import { Button } from '@/ui/Button';
import { useOverlay } from '@/ui/overlay';

/** Follow toggle for competitions, teams and players. Signed out: asks to sign in. */
export function FollowButton({ kind, id, name, onHero }: { kind: FollowKind; id: string; name: string; onHero?: boolean }) {
  const signedIn = useSignedIn();
  const following = useIsFollowing(kind, id);
  const m = useFollowMutation();
  const { confirm, snack } = useOverlay();
  const on = m.isPending ? !!m.variables?.on : following;
  return (
    <Button
      label={on ? 'Following' : 'Follow'}
      icon={on ? 'check' : 'add'}
      variant={on ? (onHero ? 'onHero' : 'secondary') : 'primary'}
      chevron={false}
      compact
      full={false}
      accessibilityHint={on ? `Stop following ${name}` : `Follow ${name} on your home feed`}
      onPress={() => {
        if (!signedIn)
          return confirm({
            title: `Follow ${name}`,
            body: 'Sign in to follow teams, competitions and players and build your home feed.',
            confirm: 'Sign in',
            onConfirm: () => router.push('/sign-in'),
          });
        m.mutate({ kind, id, on: !following }, { onError: () => snack("Couldn't update. Try again.") });
      }}
    />
  );
}
