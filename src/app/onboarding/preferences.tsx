import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { useUpdateMe } from '@/api/hooks';
import type { Depth, Interest } from '@/api/types';
import { authActions } from '@/services/auth';
import { useSettings } from '@/state/settings';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Stack } from '@/ui/bits';
import { Chip, ChipWrap } from '@/ui/Chip';
import { Rise, Swap } from '@/ui/motion';
import { useOverlay } from '@/ui/overlay';
import { Tag } from '@/ui/Pill';
import { Screen } from '@/ui/Screen';
import { Segmented } from '@/ui/Segmented';
import { T } from '@/ui/Text';
import { TopBar } from '@/ui/TopBar';

const INTERESTS: { value: Interest; label: string; icon: string }[] = [
  { value: 'match_explanations', label: 'Match explanations', icon: 'article' },
  { value: 'tactics', label: 'Tactics', icon: 'strategy' },
  { value: 'players', label: 'Players', icon: 'person' },
  { value: 'learning', label: 'Learning', icon: 'school' },
  { value: 'detailed_stats', label: 'Detailed stats', icon: 'monitoring' },
];

export const DEPTH_EXAMPLE: Record<Depth, { text: string; extra?: string }> = {
  quick: { text: 'Argentina kept finding players just outside the box.' },
  explore: { text: 'Argentina completed 21 passes into zone 14, the central area in front of the penalty box.' },
  advanced: {
    text: 'Argentina completed 21 passes into zone 14, the central area in front of the penalty box.',
    extra: 'Zone 14 receptions (v1): completed passes received between 70 and 87.5 m up the pitch, in the central third of its width. Calculated from event data.',
  },
};

export const DEPTH_HELP: Record<Depth, string> = {
  quick: 'One plain sentence. No jargon.',
  explore: 'What happened and why it matters, with numbers.',
  advanced: 'Adds metric definitions, versions and caveats.',
};

/** Screen 5, How you like it explained: interests (up to 5) and the default depth. No ads. */
export default function OnboardingPreferences() {
  const { snack } = useOverlay();
  const setLocalDepth = useSettings((s) => s.setDepth);
  const [interests, setInterests] = useState<Interest[]>(['match_explanations']);
  const [depth, setDepth] = useState<Depth>('quick');
  const update = useUpdateMe();

  const finish = (save: boolean) => {
    const done = () => {
      setLocalDepth(depth);
      authActions.markOnboarded();
      router.replace('/home');
    };
    if (!save) return done();
    update.mutate(
      { interests, depthPreference: depth },
      {
        onSuccess: done,
        onError: () => snack("Couldn't save your preferences. Try again."),
      },
    );
  };

  return (
    <Screen
      header={<TopBar title="Step 2 of 2" actions={<Button label="Skip" variant="text" full={false} compact onPress={() => finish(false)} />} />}
      footer={
        <View style={{ padding: 16, paddingBottom: 28 }}>
          <Button label="Show my feed" onPress={() => finish(true)} loading={update.isPending} />
        </View>
      }>
      <Rise>
        <T v="display">How do you like it explained?</T>
        <T v="body" color="muted" style={{ marginTop: 8 }}>
          You can switch depth on any explanation later.
        </T>
      </Rise>
      <Rise index={1} style={{ marginTop: 26 }}>
        <Stack gap={12}>
          <T v="titleSm">What are you here for?</T>
          <ChipWrap>
            {INTERESTS.map((i) => {
              const on = interests.includes(i.value);
              return (
                <Chip
                  key={i.value}
                  label={i.label}
                  icon={i.icon}
                  selected={on}
                  onPress={() => setInterests((cur) => (on ? cur.filter((x) => x !== i.value) : cur.length >= 5 ? cur : [...cur, i.value]))}
                />
              );
            })}
          </ChipWrap>
          <T v="caption" color="muted">
            Up to 5 · {interests.length} selected
          </T>
        </Stack>
      </Rise>
      <Rise index={2} style={{ marginTop: 28 }}>
        <Stack gap={12}>
          <T v="titleSm">Default depth</T>
          <Segmented
            label="Default explanation depth"
            value={depth}
            onChange={setDepth}
            options={[
              { value: 'quick', label: 'Quick' },
              { value: 'explore', label: 'Explore' },
              { value: 'advanced', label: 'Advanced' },
            ]}
          />
          <Swap swapKey={depth}>
            <T v="caption" color="muted">
              {DEPTH_HELP[depth]}
            </T>
          </Swap>
          <Card>
            <Tag tone="home" icon="insights">
              Example insight
            </Tag>
            <Swap swapKey={depth} style={{ marginTop: 14 }}>
              <T v={depth === 'quick' ? 'title' : 'body'}>{DEPTH_EXAMPLE[depth].text}</T>
              {DEPTH_EXAMPLE[depth].extra ? (
                <T v="bodySm" color="muted" style={{ marginTop: 10 }}>
                  {DEPTH_EXAMPLE[depth].extra}
                </T>
              ) : null}
            </Swap>
          </Card>
        </Stack>
      </Rise>
    </Screen>
  );
}
