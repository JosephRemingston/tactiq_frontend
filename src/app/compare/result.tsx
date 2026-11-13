import { guardParams } from '@/components/ParamGuard';
import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { useCompare, useMetricDefinitions } from '@/api/hooks';
import type { Comparison } from '@/api/types';
import { MetricSheet, PairedBar, better, withUnit } from '@/components/MetricTile';
import { QueryBoundary } from '@/components/QueryBoundary';
import { CardsSkeleton } from '@/components/states';
import { TeamBadge } from '@/components/TeamChip';
import { fmtDate } from '@/lib/format';
import { useTheme } from '@/theme/ThemeProvider';
import { Card } from '@/ui/Card';
import { Divider, Row, Stack } from '@/ui/bits';
import { Lift, Rise } from '@/ui/motion';
import { useOverlay } from '@/ui/overlay';
import { Screen } from '@/ui/Screen';
import { T } from '@/ui/Text';
import { TopBar } from '@/ui/TopBar';

type Col = { label: string; sub: string; metrics: Record<string, number | null>; teamName: string };

function columns(c: Comparison, teamId?: string): Col[] {
  return c.matches.map((m) => {
    const t = m.teams.find((x) => x.teamId === teamId) ?? m.teams[0];
    const teamName = t?.teamId === m.home.id ? m.home.name : t?.teamId === m.away.id ? m.away.name : 'Both teams';
    const stage = `${m.competition.name} · ${new Date(m.kickoffAt).getUTCFullYear()}`;
    return { label: `${m.home.name} ${m.home.score ?? ''}–${m.away.score ?? ''} ${m.away.name}`, sub: stage, metrics: t?.metrics ?? {}, teamName };
  });
}

function summary(cols: Col[], dirOf: (k: string) => 'higher_better' | 'lower_better' | 'neutral') {
  if (cols.length < 2) return '';
  const [A, B] = cols;
  const parts: string[] = [];
  const ppda = better(A.metrics['pressing.ppda'] ?? null, B.metrics['pressing.ppda'] ?? null, dirOf('pressing.ppda'));
  const xg = better(A.metrics['shooting.xg'] ?? null, B.metrics['shooting.xg'] ?? null, 'higher_better');
  if (ppda) parts.push(`pressed more`);
  if (xg) parts.push(`created more`);
  const who = A.teamName === B.teamName ? A.teamName : null;
  if (!parts.length) return 'The two matches look similar on the main measures.';
  // When both point the same way, one sentence; otherwise split.
  if (ppda && xg && ppda === xg) {
    const where = ppda === 'home' ? A.sub : B.sub;
    const other = ppda === 'home' ? B.sub : A.sub;
    return `${who ?? 'The team'} pressed more and created more in ${where} than in ${other}.`;
  }
  const s: string[] = [];
  if (ppda) s.push(`pressed more in ${ppda === 'home' ? A.sub : B.sub}`);
  if (xg) s.push(`created more in ${xg === 'home' ? A.sub : B.sub}`);
  return `${who ?? 'The team'} ${s.join(' but ')}.`;
}

/** Screen 28, Compare result: two headers, a summary, one row per metric with a paired bar. Metered. */
function CompareResult() {
  const { a, b, teamId } = useLocalSearchParams<{ a: string; b: string; teamId?: string }>();
  const { c } = useTheme();
  const defs = useMetricDefinitions();
  const { openSheet } = useOverlay();
  const q = useCompare(a, b, teamId, true);
  const dirOf = (k: string) => defs.byKey.get(k)?.direction ?? 'neutral';
  return (
    <Screen header={<TopBar title="Comparison" />}>
      <QueryBoundary query={q} skeleton={<CardsSkeleton count={3} />} paywallHint="compare_limit">
        {(cmp) => {
          const cols = columns(cmp, teamId);
          return (
            <Stack gap={18}>
              <Rise>
                <Row gap={10} style={{ alignItems: 'stretch' }}>
                  {cmp.matches.map((m, i) => (
                    <Card key={m.matchId} variant={i === 0 ? 'hero' : 'light'} glow={0.3} padded={false} style={{ flex: 1, padding: 14, minHeight: 130 }}>
                      <T v="eyebrow" tint={i === 0 ? c.heroMuted : c.muted}>
                        Match {i === 0 ? 'A' : 'B'}
                      </T>
                      <Row gap={6} style={{ marginTop: 10 }}>
                        <TeamBadge name={m.home.name} side="home" size={26} onHero={i === 0} />
                        <T v="title" tint={i === 0 ? c.heroInk : c.ink} num>
                          {m.home.score}–{m.away.score}
                        </T>
                        <TeamBadge name={m.away.name} side="away" size={26} onHero={i === 0} />
                      </Row>
                      <T v="caption" tint={i === 0 ? c.heroMuted : c.muted} style={{ marginTop: 8 }} numberOfLines={2}>
                        {m.competition.name} · {fmtDate(m.kickoffAt)}
                      </T>
                      <T v="labelSm" tint={i === 0 ? c.lime : c.ink} style={{ marginTop: 6 }} numberOfLines={1}>
                        {cols[i].teamName}
                      </T>
                    </Card>
                  ))}
                </Row>
              </Rise>
              <Rise index={1}>
                <T v="title">{summary(cols, dirOf)}</T>
              </Rise>
              <Rise index={2}>
                <Card padded={false} style={{ paddingHorizontal: 16, paddingVertical: 4 }}>
                  <Row style={{ paddingVertical: 10 }}>
                    <T v="caption" color="muted" style={{ width: 70 }}>
                      Match A
                    </T>
                    <View style={{ flex: 1 }} />
                    <T v="caption" color="muted" style={{ width: 70, textAlign: 'right' }}>
                      Match B
                    </T>
                  </Row>
                  {cmp.keys.map((k) => {
                    const d = defs.byKey.get(k);
                    const va = cols[0]?.metrics[k] ?? null;
                    const vb = cols[1]?.metrics[k] ?? null;
                    const win = better(va, vb, d?.direction ?? 'neutral');
                    return (
                      <View key={k}>
                        <Divider />
                        <Lift
                          kind="none"
                          onPress={() => openSheet(<MetricSheet metricKey={k} />, { title: d?.name ?? k })}
                          accessibilityLabel={`${d?.name ?? k}: match A ${withUnit(va, d?.unit)}, match B ${withUnit(vb, d?.unit)}${win ? `, better in match ${win === 'home' ? 'A' : 'B'}` : ''}`}
                          style={{ paddingVertical: 12, gap: 8 }}>
                          <Row>
                            <T v="number" style={{ width: 70, opacity: win === 'away' ? 0.55 : 1 }}>
                              {withUnit(va, d?.unit)}
                            </T>
                            <T v="labelSm" align="center" style={{ flex: 1 }}>
                              {d?.name ?? k}
                            </T>
                            <T v="number" style={{ width: 70, textAlign: 'right', opacity: win === 'home' ? 0.55 : 1 }}>
                              {withUnit(vb, d?.unit)}
                            </T>
                          </Row>
                          <PairedBar home={va} away={vb} highlight={win} />
                        </Lift>
                      </View>
                    );
                  })}
                </Card>
              </Rise>
              <T v="caption" color="muted">
                Solid bar is match A, hatched is match B. The faded value is the weaker one where the metric has a better direction. Tap a row for what it means.
              </T>
            </Stack>
          );
        }}
      </QueryBoundary>
    </Screen>
  );
}

// Ids from the route are validated before the screen mounts (deep links are untrusted).
export default guardParams({ a: 'uuid', b: 'uuid', teamId: 'uuid?' }, CompareResult);
