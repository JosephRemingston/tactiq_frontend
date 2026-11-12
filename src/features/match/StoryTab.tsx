import { router } from 'expo-router';
import { View } from 'react-native';

import { useStory } from '@/api/hooks';
import type { Story } from '@/api/types';
import { DataSourceFooter } from '@/components/DataSourceFooter';
import { DepthSwitch } from '@/components/DepthSwitch';
import { QueryBoundary } from '@/components/QueryBoundary';
import { NoEventData, StateBlock } from '@/components/states';
import { TeamChip } from '@/components/TeamChip';
import { useSettings } from '@/state/settings';
import { useTheme } from '@/theme/ThemeProvider';
import { Banner } from '@/ui/Banner';
import { Card } from '@/ui/Card';
import { Divider, Row, SectionHeader, Skeleton, Stack } from '@/ui/bits';
import { Icon } from '@/ui/Icon';
import { Rise, Swap } from '@/ui/motion';
import { Tag } from '@/ui/Pill';
import { T } from '@/ui/Text';
import { useMatchCtx } from './context';
import { InsightCard } from './InsightCard';

function StorySkeleton() {
  return (
    <Stack gap={14}>
      <Skeleton h={42} r={21} />
      <Skeleton h={20} />
      <Skeleton h={20} w="80%" />
      <Card>
        <Stack gap={10}>
          <Skeleton w="30%" h={12} />
          <Skeleton h={16} />
          <Skeleton w="70%" h={16} />
        </Stack>
      </Card>
    </Stack>
  );
}

function FullStory({ story }: { story: Story }) {
  const { c } = useTheme();
  const { sideOf, nameOf, match } = useMatchCtx();
  const depth = story.depth ?? 'quick';
  return (
    <Stack gap={28}>
      {story.status === 'recap' ? (
        <Banner tone="info" title="Basic recap">
          This match has limited data, so this is a short recap rather than a full story.
        </Banner>
      ) : null}
      <Rise>
        <T v="eyebrow" color="muted">
          The short version
        </T>
        <Swap swapKey={`${depth}:sv`} style={{ marginTop: 8 }}>
          <T v="headline" style={{ fontSize: 22, lineHeight: 29 }}>
            {story.shortVersion}
          </T>
        </Swap>
      </Rise>

      {story.teamApproaches?.length ? (
        <Rise index={1}>
          <SectionHeader title="How each team played" />
          <Stack gap={12} style={{ marginTop: 12 }}>
            {story.teamApproaches.map((t) => {
              const side = sideOf(t.teamId) ?? 'home';
              return (
                <Card key={t.teamId}>
                  <Row>
                    <TeamChip name={t.teamName} side={side} />
                    <View style={{ flex: 1 }} />
                    {t.formation ? (
                      <T v="number" color="muted">
                        {t.formation}
                      </T>
                    ) : null}
                  </Row>
                  <Swap swapKey={`${depth}:${t.teamId}`} style={{ marginTop: 12 }}>
                    <T v="body">{t.summary}</T>
                  </Swap>
                  {t.labels.length ? (
                    <Row wrap gap={8} style={{ marginTop: 12 }}>
                      {t.labels.map((l) => (
                        <Tag key={l} size="sm" tone={side}>
                          {l}
                        </Tag>
                      ))}
                    </Row>
                  ) : null}
                </Card>
              );
            })}
          </Stack>
        </Rise>
      ) : null}

      {story.keyPatterns?.length ? (
        <Rise index={2}>
          <SectionHeader title="Key patterns" />
          <Stack gap={12} style={{ marginTop: 12 }}>
            {story.keyPatterns.map((p) => (
              <InsightCard key={p.id} insight={{ ...p, depth: { quick: p.explanation, explore: p.explanation, advanced: p.explanation } }} depth={depth} />
            ))}
          </Stack>
        </Rise>
      ) : null}

      {story.whatChanged?.length ? (
        <Rise index={3}>
          <SectionHeader title="What changed" />
          <Card padded={false} style={{ paddingHorizontal: 16, paddingVertical: 6, marginTop: 12 }}>
            {story.whatChanged.map((w, i) => (
              <View key={`${w.minute}:${i}`}>
                {i > 0 ? <Divider inset={56} /> : null}
                <Row gap={12} style={{ minHeight: 50, paddingVertical: 8 }}>
                  <T v="number" style={{ width: 44, textAlign: 'right' }}>
                    {w.minute}′
                  </T>
                  <Icon
                    name={w.kind === 'goal' ? 'sports_soccer' : w.kind === 'substitution' ? 'swap_vert' : w.kind === 'shape' ? 'grid_view' : 'trending_up'}
                    size={18}
                    color={w.kind === 'goal' ? c.ink : c.muted}
                    filled={w.kind === 'goal'}
                  />
                  <T v="bodySm" style={{ flex: 1 }} color={w.kind === 'goal' ? 'ink' : 'inkSecondary'}>
                    {w.text}
                  </T>
                </Row>
              </View>
            ))}
          </Card>
        </Rise>
      ) : null}

      {story.keyPlayers?.length ? (
        <Rise index={4}>
          <SectionHeader title="Key players" />
          <Stack gap={10} style={{ marginTop: 12 }}>
            {story.keyPlayers.map((p) => {
              const side = sideOf(p.teamId);
              return (
                <Card
                  key={p.playerId}
                  onPress={() => router.push({ pathname: '/match/[matchId]/player/[playerId]', params: { matchId: match.id, playerId: p.playerId } })}
                  accessibilityLabel={`${p.playerName}, ${nameOf(p.teamId)}. ${p.text}`}>
                  <Row>
                    <T v="titleSm" style={{ flex: 1 }}>
                      {p.playerName}
                    </T>
                    {side ? <TeamChip name={nameOf(p.teamId)} side={side} showName={false} /> : null}
                  </Row>
                  {p.role ? (
                    <Tag size="sm" tone="inferred" icon="psychology" style={{ marginTop: 8 }}>
                      {p.role}
                    </Tag>
                  ) : null}
                  <T v="bodySm" color="inkSecondary" style={{ marginTop: 8 }}>
                    {p.text}
                  </T>
                </Card>
              );
            })}
          </Stack>
        </Rise>
      ) : null}
    </Stack>
  );
}

/** Screen 15, Story: always free. full / recap / unavailable / pending_analysis. */
export function StoryTab() {
  const { match } = useMatchCtx();
  const depth = useSettings((s) => s.depth);
  const q = useStory(match.id, depth);
  return (
    <Stack gap={20}>
      <DepthSwitch />
      <QueryBoundary query={q} skeleton={<StorySkeleton />}>
        {({ story }) => (
          <Stack gap={24}>
            {story.status === 'unavailable' ? (
              <NoEventData />
            ) : story.status === 'pending_analysis' ? (
              <StateBlock icon="hourglass_top" tone="lime" title="We have the event data; analysis is on its way" body="The story appears here once the match is analysed. This usually takes up to an hour." />
            ) : (
              <FullStory story={story} />
            )}
            <Card variant="tint">
              <Row gap={10} style={{ alignItems: 'flex-start' }}>
                <Icon name="info" size={20} />
                <T v="bodySm" color="inkSecondary" style={{ flex: 1 }}>
                  {story.coverageStatement}
                </T>
              </Row>
            </Card>
            <DataSourceFooter match={match} coverageStatement={story.coverageStatement} />
          </Stack>
        )}
      </QueryBoundary>
    </Stack>
  );
}
