import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { View } from 'react-native';

import { useConcept, useLearning, useLearningMutation } from '@/api/hooks';
import type { Concept, Depth } from '@/api/types';
import { DepthSwitch } from '@/components/DepthSwitch';
import { QueryBoundary } from '@/components/QueryBoundary';
import { ListRow } from '@/components/rows';
import { PitchCanvas, type ZoneOverlay } from '@/pitch/PitchCanvas';
import { Arrow, Dot } from '@/pitch/layers';
import { useSignedIn } from '@/services/auth';
import { useSettings } from '@/state/settings';
import { useTheme } from '@/theme/ThemeProvider';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Divider, Row, SectionHeader, Stack } from '@/ui/bits';
import { Chip, ChipWrap } from '@/ui/Chip';
import { Icon } from '@/ui/Icon';
import { Rise, Swap } from '@/ui/motion';
import { useOverlay } from '@/ui/overlay';
import { Eyebrow } from '@/ui/Pill';
import { Screen } from '@/ui/Screen';
import { T } from '@/ui/Text';
import { TopBar } from '@/ui/TopBar';

/** Small illustrations for concepts that have a place on the pitch. */
function Illustration({ conceptKey, name }: { conceptKey: string; name: string }) {
  const k = conceptKey.toLowerCase();
  let zones: ZoneOverlay[] | null = null;
  let extra: 'press' | 'switch' | null = null;
  if (k.includes('zone-14') || k === 'zone14') zones = ['zone14', 'box'];
  else if (k.includes('half-space')) zones = ['halfSpaces', 'lanes'];
  else if (k.includes('high-press') || k.includes('ppda') || k.includes('press')) {
    zones = ['thirds'];
    extra = 'press';
  } else if (k.includes('final-third') || k.includes('progress')) zones = ['thirds'];
  else if (k.includes('switch') || k.includes('width')) {
    zones = ['lanes'];
    extra = 'switch';
  }
  if (!zones) return null;
  return (
    <PitchCanvas label={`Pitch illustration of ${name}.`} zones={zones}>
      {(s) =>
        extra === 'press' ? (
          <>
            {[
              [80, 20],
              [82, 40],
              [74, 30],
              [70, 52],
            ].map(([x, y], i) => (
              <Dot key={i} s={s} x={x} y={y} side="home" r={6} />
            ))}
            {[
              [92, 30],
              [96, 46],
            ].map(([x, y], i) => (
              <Dot key={`o${i}`} s={s} x={x} y={y} side="away" r={6} />
            ))}
            <Arrow s={s} x={80} y={20} endX={89} endY={28} side="home" />
            <Arrow s={s} x={82} y={40} endX={93} endY={44} side="home" />
          </>
        ) : extra === 'switch' ? (
          <>
            <Dot s={s} x={55} y={8} side="home" r={6} />
            <Dot s={s} x={62} y={60} side="home" r={6} />
            <Arrow s={s} x={55} y={8} endX={62} endY={60} side="home" />
          </>
        ) : null
      }
    </PitchCanvas>
  );
}

function Body({ concept }: { concept: Concept }) {
  const { c } = useTheme();
  const depth = useSettings((s) => s.depth);
  const signedIn = useSignedIn();
  const learning = useLearning();
  const m = useLearningMutation();
  const { snack, confirm } = useOverlay();
  const status = useMemo(() => learning.data?.learning.find((l) => l.conceptKey === concept.key)?.status, [learning.data, concept.key]);

  useEffect(() => {
    if (signedIn && !status) m.mutate({ key: concept.key, status: 'viewed' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signedIn, concept.key]);

  const set = (s: 'saved' | 'completed') => {
    if (!signedIn) return confirm({ title: 'Sign in to track learning', body: 'Saved concepts and progress live in your account.', confirm: 'Sign in', onConfirm: () => router.push('/sign-in') });
    m.mutate({ key: concept.key, status: s }, { onSuccess: () => snack(s === 'completed' ? 'Marked as learned' : 'Concept saved'), onError: () => snack("Couldn't save. Try again.") });
  };
  const text: Record<Depth, string | null> = { quick: concept.simpleText, explore: concept.exploreText, advanced: concept.advancedText };

  return (
    <Stack gap={22}>
      <Rise>
        <Eyebrow icon="school">{concept.category.replace(/-/g, ' ')}</Eyebrow>
        <T v="display" style={{ marginTop: 14 }}>
          {concept.name}
        </T>
      </Rise>
      <DepthSwitch />
      <Rise index={1}>
        <Card>
          <Swap swapKey={depth}>
            <T v={depth === 'quick' ? 'title' : 'body'}>{text[depth] ?? concept.simpleText}</T>
            {depth !== 'quick' ? (
              <T v="bodySm" color="muted" style={{ marginTop: 10 }}>
                In short: {concept.simpleText}
              </T>
            ) : null}
          </Swap>
        </Card>
      </Rise>
      <Illustration conceptKey={concept.key} name={concept.name} />
      {concept.misconceptions ? (
        <Card variant="tint">
          <Row gap={10} style={{ alignItems: 'flex-start' }}>
            <Icon name="lightbulb" color={c.warning} filled />
            <View style={{ flex: 1 }}>
              <T v="labelSm">Common misconception</T>
              <T v="bodySm" color="inkSecondary" style={{ marginTop: 4 }}>
                People often think: “{concept.misconceptions}” That isn't right; see the explanation above.
              </T>
            </View>
          </Row>
        </Card>
      ) : null}
      {concept.metrics.length ? (
        <View>
          <SectionHeader title="Linked metrics" />
          <Card padded={false} style={{ paddingHorizontal: 16, marginTop: 12 }}>
            {concept.metrics
              .filter((x) => x.status === 'active')
              .map((x, i) => (
                <View key={x.key}>
                  {i > 0 ? <Divider /> : null}
                  <ListRow title={x.name} sub={x.descriptionQuick} onPress={() => router.push(`/metric/${x.key}`)} />
                </View>
              ))}
          </Card>
        </View>
      ) : null}
      {concept.related.length ? (
        <View>
          <SectionHeader title="Related" />
          <View style={{ marginTop: 12 }}>
            <ChipWrap>
              {concept.related.map((r) => (
                <Chip key={r.key} label={r.name} icon="school" onPress={() => router.push(`/concept/${r.key}`)} />
              ))}
            </ChipWrap>
          </View>
        </View>
      ) : null}
      <Row gap={10}>
        <Button label={status === 'saved' || status === 'completed' ? 'Saved' : 'Save'} icon="bookmark_add" variant="secondary" chevron={false} full={false} style={{ flex: 1 }} onPress={() => set('saved')} />
        <Button label={status === 'completed' ? 'Learned' : 'Mark as learned'} icon="check" variant={status === 'completed' ? 'secondary' : 'ink'} chevron={false} full={false} style={{ flex: 1.4 }} onPress={() => set('completed')} />
      </Row>
    </Stack>
  );
}

/** Screen 30, Concept detail. */
export default function ConceptPage() {
  const { key } = useLocalSearchParams<{ key: string }>();
  const q = useConcept(key);
  return (
    <Screen header={<TopBar title={q.data?.concept.name} />}>
      <QueryBoundary query={q}>{(d) => <Body concept={d.concept} />}</QueryBoundary>
    </Screen>
  );
}
