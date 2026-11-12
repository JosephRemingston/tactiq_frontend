import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { ApiError } from '@/api/errors';
import { useAllEvents, useFilteredEvents, useIsPro, useLineups } from '@/api/hooks';
import type { MatchEvent } from '@/api/types';
import { DataSourceFooter } from '@/components/DataSourceFooter';
import { QueryBoundary } from '@/components/QueryBoundary';
import { CardsSkeleton, NoEventData } from '@/components/states';
import { PERIOD_LABEL } from '@/lib/format';
import { openPaywall, openPaywallFor } from '@/services/paywall';
import { useTheme } from '@/theme/ThemeProvider';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Row, Stack } from '@/ui/bits';
import { Chip, ChipBar } from '@/ui/Chip';
import { Icon } from '@/ui/Icon';
import { Lift } from '@/ui/motion';
import { useOverlay } from '@/ui/overlay';
import { T } from '@/ui/Text';
import { Toggle } from '@/ui/Toggle';
import { useMatchCtx } from './context';
import { EventSheet } from './EventSheet';
import { describe, EVENT_ICON, EVENT_TYPE_FILTERS, importance, nameIndex, type Importance } from './events';

const PAGE = 120;

function EventRow({ e, names, onPress }: { e: MatchEvent; names: Map<string, string>; onPress: () => void }) {
  const { c } = useTheme();
  const { sideOf, codeOf } = useMatchCtx();
  const imp = importance(e);
  const side = sideOf(e.teamId);
  const strong = imp === 'goal' || imp === 'card' || imp === 'red' || imp === 'sub' || imp === 'shift';
  const chip: Record<Importance, { bg: string; fg: string } | null> = {
    goal: { bg: c.lime, fg: c.onLime },
    card: { bg: '#f2c81b', fg: '#1a1400' },
    red: { bg: '#d92d20', fg: '#ffffff' },
    sub: { bg: c.surfaceHigh, fg: c.ink },
    shift: { bg: c.surfaceHigh, fg: c.ink },
    period: null,
    shot: null,
    normal: null,
    minor: null,
  };
  const ch = chip[imp];
  if (imp === 'period') {
    return (
      <Row gap={8} style={{ paddingVertical: 6 }}>
        <View style={{ flex: 1, height: 1, backgroundColor: c.line }} />
        <T v="caption" color="muted">
          {describe(e, names)} · {e.minute}′
        </T>
        <View style={{ flex: 1, height: 1, backgroundColor: c.line }} />
      </Row>
    );
  }
  return (
    <Lift
      kind="none"
      onPress={onPress}
      accessibilityLabel={`${e.minute} minutes. ${side ? codeOf(e.teamId) : ''} ${describe(e, names)}`}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        minHeight: strong ? 56 : 44,
        paddingHorizontal: strong ? 12 : 4,
        marginVertical: strong ? 4 : 0,
        borderRadius: 14,
        backgroundColor: strong ? c.surface : 'transparent',
        borderWidth: strong ? 1 : 0,
        borderColor: c.cardLine,
      }}>
      <T v={strong ? 'number' : 'caption'} color={strong ? 'ink' : 'muted'} style={{ width: 38, textAlign: 'right' }} num>
        {e.minute}′
      </T>
      <View style={{ width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: ch?.bg ?? 'transparent' }}>
        <Icon name={EVENT_ICON[e.type] ?? 'circle'} size={strong ? 17 : 16} color={ch?.fg ?? c.muted} filled={imp === 'goal'} />
      </View>
      {side ? (
        <View
          style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: side === 'home' ? c.home : 'transparent', borderWidth: side === 'home' ? 0 : 2, borderColor: c.away }}
        />
      ) : null}
      <T v={strong ? 'label' : 'bodySm'} color={strong || imp === 'shot' ? 'ink' : 'inkSecondary'} style={{ flex: 1 }} numberOfLines={2}>
        {describe(e, names)}
      </T>
    </Lift>
  );
}

/** Screen 17, Timeline: events by period; passes collapsed; Pro filters (Free sees a lock). */
export function TimelineTab() {
  const { match, sideOf, hasEvents } = useMatchCtx();
  const { c } = useTheme();
  const { openSheet } = useOverlay();
  const { isPro } = useIsPro();
  const all = useAllEvents(match.id, hasEvents);
  const lineups = useLineups(match.id);
  const names = useMemo(() => nameIndex(lineups.data?.lineups), [lineups.data]);
  const [showMinor, setShowMinor] = useState(false);
  const [limit, setLimit] = useState(PAGE);
  const [types, setTypes] = useState<string[]>([]);
  const [team, setTeam] = useState<string | undefined>();
  const [period, setPeriod] = useState<number | undefined>();
  const filtering = isPro && (types.length > 0 || !!team || !!period);
  const filtered = useFilteredEvents(match.id, { type: types.length ? types : undefined, teamId: team, period }, filtering);

  const source = useMemo(() => (filtering ? (filtered.data?.pages.flatMap((p) => p.events) ?? []) : (all.data ?? [])), [filtering, filtered.data, all.data]);
  const rows = useMemo(() => {
    const seen = new Set<string>();
    return source.filter((e) => {
      if (e.type === 'ball_receipt' || e.type === 'starting_xi') return false;
      // Both teams log period start/end; show each once.
      if (e.type === 'half_start' || e.type === 'half_end') {
        const k = `${e.type}:${e.period}`;
        if (seen.has(k)) return false;
        seen.add(k);
      }
      return filtering || showMinor || importance(e) !== 'minor';
    });
  }, [source, filtering, showMinor]);
  const hiddenPasses = useMemo(() => (all.data ?? []).filter((e) => importance(e) === 'minor' && e.type !== 'ball_receipt').length, [all.data]);
  const periods = useMemo(() => [...new Set((all.data ?? []).map((e) => e.period))].sort(), [all.data]);

  if (!hasEvents) return <NoEventData />;

  const lock = () => openPaywall({ context: 'event_filters' });
  const open = (e: MatchEvent) => openSheet(<EventSheet e={e} side={sideOf(e.teamId) ?? 'home'} names={names} />, { title: `${e.minute}′ · ${e.type.replace(/_/g, ' ')}` });

  const toggleType = (t: string) => (isPro ? setTypes((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t])) : lock());

  const shown = rows.slice(0, limit);

  return (
    <Stack gap={14}>
      <View>
        <Row style={{ marginBottom: 8 }}>
          <T v="eyebrow" color="muted" style={{ flex: 1 }}>
            Filters{isPro ? '' : ' · Pro'}
          </T>
          {!isPro ? (
            <Lift kind="none" onPress={lock} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 32 }}>
              <Icon name="lock" size={14} color={c.muted} />
              <T v="caption" style={{ textDecorationLine: 'underline' }}>
                See Pro
              </T>
            </Lift>
          ) : null}
        </Row>
        <ChipBar>
          {EVENT_TYPE_FILTERS.map((t) => (
            <Chip key={t.value} label={t.label} locked={!isPro} selected={types.includes(t.value)} onPress={() => toggleType(t.value)} />
          ))}
        </ChipBar>
        <ChipBar style={{ marginTop: 8 }}>
          {[match.home, match.away].map((t) => (
            <Chip key={t.id} label={t.name} locked={!isPro} selected={team === t.id} onPress={() => (isPro ? setTeam(team === t.id ? undefined : t.id) : lock())} />
          ))}
          {periods.map((p) => (
            <Chip key={p} label={PERIOD_LABEL[p]?.replace('Extra time, ', 'ET ') ?? `P${p}`} locked={!isPro} selected={period === p} onPress={() => (isPro ? setPeriod(period === p ? undefined : p) : lock())} />
          ))}
        </ChipBar>
      </View>
      {!filtering ? (
        <Card variant="tint" padded={false} style={{ padding: 12 }}>
          <Toggle value={showMinor} onChange={setShowMinor} right={showMinor ? 'Showing passes, carries and pressures' : `${hiddenPasses.toLocaleString('en-GB')} passes, carries and pressures hidden`} label="Show passes" />
        </Card>
      ) : null}
      <QueryBoundary
        query={
          filtering
            ? { data: filtered.data ? source : undefined, isLoading: filtered.isLoading, isError: filtered.isError, error: filtered.error, refetch: filtered.refetch }
            : all
        }
        skeleton={<CardsSkeleton count={4} />}
        allowForced={['loading', 'error', 'offline', 'proOnly']}
        proOnlyLine="Event filters are a Pro feature. The full timeline stays free.">
        {() => (
          <View>
            {shown.map((e, i) => {
              const header = i === 0 || shown[i - 1].period !== e.period;
              return (
                <View key={e.id}>
                  {header ? (
                    <T v="eyebrow" color="muted" style={{ marginTop: 18, marginBottom: 6 }} accessibilityRole="header">
                      {PERIOD_LABEL[e.period] ?? `Period ${e.period}`}
                    </T>
                  ) : null}
                  <EventRow e={e} names={names} onPress={() => open(e)} />
                </View>
              );
            })}
            {rows.length > limit ? (
              <Button label={`Show more (${(rows.length - limit).toLocaleString('en-GB')} left)`} variant="secondary" onPress={() => setLimit((l) => l + PAGE * 2)} style={{ marginTop: 14 }} />
            ) : null}
            {filtering && filtered.hasNextPage ? <Button label="Load more" variant="text" onPress={() => filtered.fetchNextPage()} /> : null}
          </View>
        )}
      </QueryBoundary>
      {filtered.error instanceof ApiError && filtered.error.paywall ? (
        <Button label="See Pro" onPress={() => openPaywallFor((filtered.error as ApiError).paywall!, 'event_filters')} />
      ) : null}
      <DataSourceFooter match={match} />
    </Stack>
  );
}
