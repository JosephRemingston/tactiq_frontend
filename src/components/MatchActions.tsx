import { router } from 'expo-router';
import { Share, View } from 'react-native';

import { ApiError } from '@/api/errors';
import { useSaveInsightMutation, useSaveMatchMutation, useSavedIds } from '@/api/hooks';
import type { MatchSummary } from '@/api/types';
import { useSignedIn } from '@/services/auth';
import { openPaywallFor } from '@/services/paywall';
import { useTheme } from '@/theme/ThemeProvider';
import { Icon } from '@/ui/Icon';
import { Lift } from '@/ui/motion';
import { useOverlay } from '@/ui/overlay';
import { T } from '@/ui/Text';
import { AddToCollectionSheet } from './CollectionSheet';

export function SheetAction({ icon, label, sub, onPress, danger }: { icon: string; label: string; sub?: string; onPress: () => void; danger?: boolean }) {
  const { c } = useTheme();
  return (
    <Lift kind="none" onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 16, minHeight: 56 }} accessibilityLabel={label}>
      <Icon name={icon} color={danger ? c.error : c.ink} />
      <View style={{ flex: 1 }}>
        <T v="titleSm" tint={danger ? c.error : undefined}>
          {label}
        </T>
        {sub ? (
          <T v="caption" color="muted">
            {sub}
          </T>
        ) : null}
      </View>
    </Lift>
  );
}

/** Save / unsave with the saved-items limit handled (paywall on 403). */
export function useSaveToggle() {
  const signedIn = useSignedIn();
  const saved = useSavedIds();
  const sm = useSaveMatchMutation();
  const si = useSaveInsightMutation();
  const { snack, confirm } = useOverlay();

  const needSignIn = () =>
    confirm({ title: 'Sign in to save', body: 'Saved matches and insights live in your Library.', confirm: 'Sign in', onConfirm: () => router.push('/sign-in') });

  const onErr = (e: unknown) => {
    if (e instanceof ApiError && e.paywall) openPaywallFor(e.paywall);
    else snack("Couldn't save. Try again.");
  };

  return {
    isMatchSaved: (id: string) => !!saved.data?.matches.has(id),
    isInsightSaved: (id: string) => !!saved.data?.insights.has(id),
    toggleMatch: (id: string) => {
      if (!signedIn) return needSignIn();
      const on = !saved.data?.matches.has(id);
      sm.mutate({ id, on }, { onSuccess: () => snack(on ? 'Match saved' : 'Removed from saved'), onError: onErr });
    },
    toggleInsight: (id: string) => {
      if (!signedIn) return needSignIn();
      const on = !saved.data?.insights.has(id);
      si.mutate({ id, on }, { onSuccess: () => snack(on ? 'Insight saved' : 'Removed from saved'), onError: onErr });
    },
  };
}

export function shareMatch(m: Pick<MatchSummary, 'id' | 'home' | 'away' | 'competition'>) {
  const score = m.home.score !== null && m.away.score !== null ? ` ${m.home.score}–${m.away.score}` : '';
  Share.share({ message: `${m.home.name}${score} ${m.away.name} · ${m.competition.name}\ntactiq://match/${m.id}` }).catch(() => {});
}

/** The match overflow menu (card ⋮ / long press, match centre header). */
export function useMatchActions(m: MatchSummary) {
  const { openSheet, closeSheet, confirm } = useOverlay();
  const signedIn = useSignedIn();
  const save = useSaveToggle();

  const requireSignIn = (then: () => void) => {
    if (signedIn) return then();
    closeSheet();
    confirm({ title: 'Sign in first', body: 'Collections, notes and comparisons need an account.', confirm: 'Sign in', onConfirm: () => router.push('/sign-in') });
  };

  const open = () =>
    openSheet(
      <View>
        <SheetAction
          icon="compare_arrows"
          label="Compare"
          sub="Put this match next to another"
          onPress={() => requireSignIn(() => {
            closeSheet();
            router.push({ pathname: '/compare', params: { a: m.id } });
          })}
        />
        <SheetAction
          icon={save.isMatchSaved(m.id) ? 'bookmark_remove' : 'bookmark_add'}
          label={save.isMatchSaved(m.id) ? 'Remove from saved' : 'Save'}
          onPress={() => {
            closeSheet();
            save.toggleMatch(m.id);
          }}
        />
        <SheetAction
          icon="create_new_folder"
          label="Add to collection"
          onPress={() => requireSignIn(() => {
            closeSheet();
            setTimeout(() => openSheet(<AddToCollectionSheet itemType="match" itemId={m.id} />, { title: 'Add to collection' }), 380);
          })}
        />
        <SheetAction
          icon="edit_note"
          label="Add note"
          onPress={() => requireSignIn(() => {
            closeSheet();
            router.push({ pathname: '/note/[id]', params: { id: 'new', subjectType: 'match', subjectId: m.id } });
          })}
        />
        <SheetAction
          icon="share"
          label="Share"
          onPress={() => {
            closeSheet();
            shareMatch(m);
          }}
        />
      </View>,
      { title: `${m.home.name} v ${m.away.name}` },
    );

  return { open };
}
