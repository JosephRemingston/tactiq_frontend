import { View } from 'react-native';

import { useAllEvents, useInsights, useLineups, useStory } from '@/api/hooks';
import type { MatchDetail, MatchEvent, Story } from '@/api/types';
import { DataSourceFooter } from '@/components/DataSourceFooter';
import { QueryBoundary } from '@/components/QueryBoundary';
import { CardsSkeleton } from '@/components/states';
import { useSettings } from '@/state/settings';
import { useTheme } from '@/theme/ThemeProvider';
import { Card } from '@/ui/Card';
import { CheckItem, Divider, Row, SectionHeader, Stack } from '@/ui/bits';
import { Icon } from '@/ui/Icon';
import { Rise } from '@/ui/motion';
import { T } from '@/ui/Text';
import { useMatchCtx } from './context';
import { cardOf, nameIndex } from './events';
import { InsightCard } from './InsightCard';

const UNAVAILABLE: Record<string, string> = {
  tracking: 'Where every player was at every moment (tracking)',
  team_shape: 'Team shape and distances between players',
  off_ball_runs: 'Runs made without the ball',
  physical_load: 'Distance covered and sprints',
  video: 'Video',
};

function Fact({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <Row style={{ minHeight: 40 }}>
      <T v="bodySm" color="muted" style={{ width: 110 }}>
        {label}
      </T>
      <T v="bodySm" style={{ flex: 1 }}>
        {value}
      </T>
    </Row>
  );
}

type Moment = { minute: number; icon: string; text: string; side: 'home' | 'away' | null; tone?: 'goal' | 'card' | 'red' | 'sub' };

/**
 * Goals and substitutions come from the story; cards come from the events. (The lineups
 * endpoint reports card minutes within the period for extra time and penalties, e.g. 11′ for a
 * 113′ booking, so it is not used here.)
 */
function moments(story: Story | undefined, events: MatchEvent[] | undefined, names: Map<string, string>, sideOf: (id: string | null | undefined) => 'home' | 'away' | null): Moment[] {
  const out: Moment[] = [];
  (story?.whatChanged ?? []).forEach((w) => {
    if (w.kind === 'goal') out.push({ minute: w.minute, icon: 'sports_soccer', text: w.text, side: null, tone: 'goal' });
    else if (w.kind === 'substitution') out.push({ minute: w.minute, icon: 'swap_vert', text: w.text, side: null, tone: 'sub' });
  });
  (events ?? []).forEach((e) => {
    const card = cardOf(e);
    if (!card) return;
    const red = /red/.test(card);
    const who = (e.playerId && names.get(e.playerId)) || e.playerName || '';
    out.push({ minute: e.minute, icon: 'style', text: `${red ? 'Red' : 'Yellow'} card · ${who}${e.period === 5 ? ' (shoot-out)' : ''}`, side: sideOf(e.teamId), tone: red ? 'red' : 'card' });
  });
  return out.sort((a, b) => a.minute - b.minute);
}

function KeyMoments({ items }: { items: Moment[] }) {
  const { c } = useTheme();
  if (!items.length) return null;
  return (
    <Card padded={false} style={{ paddingHorizontal: 16, paddingVertical: 6 }}>
      {items.map((m, i) => (
        <View key={`${m.minute}:${i}`}>
          {i > 0 ? <Divider inset={64} /> : null}
          <Row gap={12} style={{ minHeight: 48 }}>
            <T v="number" style={{ width: 40, textAlign: 'right' }}>
              {m.minute}′
            </T>
            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: m.tone === 'goal' ? c.lime : m.tone === 'card' ? '#f2c81b' : m.tone === 'red' ? '#d92d20' : c.surfaceHigh,
              }}>
              <Icon name={m.icon} size={16} color={m.tone === 'goal' ? c.onLime : m.tone === 'card' ? '#1a1400' : m.tone === 'red' ? '#ffffff' : c.ink} />
            </View>
            <T v="bodySm" style={{ flex: 1 }}>
              {m.text}
            </T>
          </Row>
        </View>
      ))}
    </Card>
  );
}

export function CanAndCant({ match }: { match: MatchDetail }) {
  const cov = match.coverage;
  return (
    <Card>
      <T v="titleSm">What we can and can't show</T>
      <Stack gap={13} style={{ marginTop: 14 }}>
        <CheckItem>Score, date and lineups</CheckItem>
        {cov.hasEvents ? <CheckItem>{`Every on-ball event (${cov.eventsCount.toLocaleString('en-GB')} for this match)`}</CheckItem> : <CheckItem off>On-ball events</CheckItem>}
        {cov.hasFreezeFrames ? <CheckItem>Player positions at shots (freeze frames)</CheckItem> : <CheckItem off>Player positions at shots</CheckItem>}
        {(cov.unavailable ?? []).map((u) => (
          <CheckItem key={u} off>
            {UNAVAILABLE[u] ?? u.replace(/_/g, ' ')}
          </CheckItem>
        ))}
      </Stack>
    </Card>
  );
}

/** Screen 14, Match centre: Overview. */
export function Overview() {
  const { match, sideOf, hasEvents } = useMatchCtx();
  const depth = useSettings((s) => s.depth);
  const story = useStory(match.id, 'explore');
  const insights = useInsights(match.id, depth, hasEvents);
  const lineups = useLineups(match.id, match.coverage.hasLineups);
  const events = useAllEvents(match.id, hasEvents);
  const items = moments(story.data?.story, events.data, nameIndex(lineups.data?.lineups), sideOf);
  return (
    <Stack gap={24}>
      <Rise>
        <Card>
          <Fact label="Home manager" value={match.home.manager} />
          <Fact label="Away manager" value={match.away.manager} />
          <Fact label="Referee" value={match.refereeName} />
          <Fact label="Stadium" value={match.stadiumName} />
          <Fact label="Match week" value={match.matchWeek} />
        </Card>
      </Rise>
      {story.data?.story.shortVersion ? (
        <Rise index={1}>
          <SectionHeader title="The short version" />
          <T v="body" style={{ marginTop: 10 }}>
            {story.data.story.shortVersion}
          </T>
        </Rise>
      ) : null}
      {hasEvents ? (
        <Rise index={2}>
          <SectionHeader title="Top insights" />
          <View style={{ height: 12 }} />
          <QueryBoundary query={insights} skeleton={<CardsSkeleton count={2} />} isEmpty={(d) => !d.insights.length} empty={<View />} allowForced={[]}>
            {(d) => (
              <Stack gap={12}>
                {d.insights.slice(0, 3).map((i) => (
                  <InsightCard key={i.id} insight={i} depth={depth} rank={i.rank} />
                ))}
              </Stack>
            )}
          </QueryBoundary>
        </Rise>
      ) : null}
      {items.length ? (
        <Rise index={3}>
          <SectionHeader title="Key moments" />
          <View style={{ height: 12 }} />
          <KeyMoments items={items} />
        </Rise>
      ) : null}
      <Rise index={4}>
        <CanAndCant match={match} />
      </Rise>
      <DataSourceFooter match={match} coverageStatement={story.data?.story.coverageStatement} />
    </Stack>
  );
}
