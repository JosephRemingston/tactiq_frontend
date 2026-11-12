import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { useEntitlement, useMatch, useMatches, useSavedMatches, useSearch } from '@/api/hooks';
import type { MatchSummary } from '@/api/types';
import { MatchCard } from '@/components/MatchCard';
import { ListRow } from '@/components/rows';
import { SignedOutCard } from '@/components/states';
import { TeamBadge } from '@/components/TeamChip';
import { fmtDate, fmtDayMonth } from '@/lib/format';
import { useSignedIn } from '@/services/auth';
import { openPaywall } from '@/services/paywall';
import { useTheme } from '@/theme/ThemeProvider';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Divider, Row, Stack } from '@/ui/bits';
import { Chip, ChipBar } from '@/ui/Chip';
import { Icon } from '@/ui/Icon';
import { Lift, Rise } from '@/ui/motion';
import { useOverlay } from '@/ui/overlay';
import { Tag } from '@/ui/Pill';
import { Screen } from '@/ui/Screen';
import { Segmented } from '@/ui/Segmented';
import { T } from '@/ui/Text';
import { TextField } from '@/ui/TextField';
import { TopBar } from '@/ui/TopBar';

function MatchPicker({ onPick, exclude }: { onPick: (m: MatchSummary) => void; exclude?: string }) {
  const [src, setSrc] = useState<'recent' | 'saved' | 'search'>('recent');
  const [q, setQ] = useState('');
  const [teamId, setTeamId] = useState<string | null>(null);
  const recent = useMatches({ analysed: true });
  const saved = useSavedMatches();
  const search = useSearch(q, ['team']);
  const teamMatches = useMatches({ teamId: teamId ?? undefined, analysed: true }, !!teamId);
  const list: MatchSummary[] =
    src === 'recent'
      ? (recent.data?.pages.flatMap((p) => p.matches) ?? [])
      : src === 'saved'
        ? (saved.data?.pages.flatMap((p) => p.savedMatches.map((s) => s.match)) ?? []).filter((m) => m.analysisStatus === 'complete')
        : (teamMatches.data?.pages.flatMap((p) => p.matches) ?? []);
  const row = (m: MatchSummary) => (
    <View key={m.id}>
      <Divider />
      <ListRow
        title={`${m.home.name} ${m.home.score ?? ''}–${m.away.score ?? ''} ${m.away.name}`}
        sub={`${m.competition.name}${m.stage ? ` · ${m.stage}` : ''} · ${fmtDate(m.kickoffAt)}`}
        onPress={() => onPick(m)}
        chevron={false}
      />
    </View>
  );
  return (
    <Stack gap={12}>
      <Segmented
        label="Source"
        size="sm"
        value={src}
        onChange={setSrc}
        options={[
          { value: 'recent', label: 'Recent' },
          { value: 'saved', label: 'Saved' },
          { value: 'search', label: 'Search' },
        ]}
      />
      {src === 'search' ? (
        <>
          <TextField icon="search" value={q} onChangeText={(t) => { setQ(t); setTeamId(null); }} placeholder="Search a team" maxLength={80} autoCorrect={false} />
          {!teamId
            ? (search.data?.teams ?? []).map((t) => (
                <ListRow key={t.id} leading={<TeamBadge name={t.name} side="home" size={34} />} title={t.name} sub={t.isNationalTeam ? 'National team' : t.countryName} onPress={() => setTeamId(t.id)} />
              ))
            : null}
        </>
      ) : null}
      <View>{list.filter((m) => m.id !== exclude && m.analysisStatus === 'complete').map(row)}</View>
      {src !== 'search' && !list.length ? (
        <T v="bodySm" color="muted">
          {src === 'saved' ? 'No analysed matches saved yet.' : 'No analysed matches yet.'}
        </T>
      ) : null}
      <T v="caption" color="muted">
        Only analysed matches can be compared.
      </T>
    </Stack>
  );
}

function Slot({ label, match, onPress }: { label: string; match?: MatchSummary; onPress: () => void }) {
  const { c } = useTheme();
  if (match)
    return (
      <View>
        <Row style={{ marginBottom: 8 }}>
          <T v="eyebrow" color="muted" style={{ flex: 1 }}>
            {label}
          </T>
          <T v="labelSm" style={{ textDecorationLine: 'underline' }} onPress={onPress} accessibilityRole="button">
            Change
          </T>
        </Row>
        <MatchCard m={match} />
      </View>
    );
  return (
    <Lift
      kind="card"
      onPress={onPress}
      accessibilityLabel={`Choose ${label}`}
      style={{ borderRadius: 20, borderWidth: 1.5, borderStyle: 'dashed', borderColor: c.faint, minHeight: 120, alignItems: 'center', justifyContent: 'center', gap: 8 }}>
      <Icon name="add_circle" size={28} color={c.ink} />
      <T v="titleSm">{label}</T>
      <T v="caption" color="muted">
        From recent, saved or search
      </T>
    </Lift>
  );
}

/** Screen 27, Compare: pick two matches (and optionally a team). Shows remaining comparisons. */
export default function ComparePick() {
  const p = useLocalSearchParams<{ a?: string; b?: string }>();
  const signedIn = useSignedIn();
  const { openSheet, closeSheet } = useOverlay();
  const ent = useEntitlement('comparisons.per_month');
  const preA = useMatch(p.a ?? '');
  const preB = useMatch(p.b ?? '');
  const [pickedA, setA] = useState<MatchSummary | undefined>();
  const [pickedB, setB] = useState<MatchSummary | undefined>();
  // undefined = default (the team that played both), null = whole match.
  const [teamChoice, setTeamId] = useState<string | null | undefined>();
  const a = pickedA ?? preA.data?.match;
  const b = pickedB ?? preB.data?.match;
  const teams = useMemo(() => {
    const list = [a?.home, a?.away, b?.home, b?.away].filter(Boolean) as { id: string; name: string }[];
    const uniq = [...new Map(list.map((t) => [t.id, t])).values()];
    const common = uniq.filter((t) => [a?.home.id, a?.away.id].includes(t.id) && [b?.home.id, b?.away.id].includes(t.id));
    return { uniq, common };
  }, [a, b]);
  const teamId = teamChoice === undefined ? teams.common[0]?.id : (teamChoice ?? undefined);

  const pick = (slot: 'A' | 'B') =>
    openSheet(
      <MatchPicker
        exclude={slot === 'A' ? b?.id : a?.id}
        onPick={(m) => {
          closeSheet();
          if (slot === 'A') setA(m);
          else setB(m);
          setTeamId(undefined);
        }}
      />,
      { title: `Choose match ${slot}`, full: true },
    );

  if (!signedIn)
    return (
      <Screen header={<TopBar title="Compare" />}>
        <SignedOutCard body="Comparisons need an account. Free includes 5 a month." />
      </Screen>
    );

  const e = ent.ent;
  const exhausted = e && e.limitValue !== null && (e.remaining ?? 0) <= 0;
  return (
    <Screen
      header={<TopBar title="Compare" sub="Two matches side by side" />}
      footer={
        <View style={{ padding: 16, paddingBottom: 28, gap: 8 }}>
          {e ? (
            <T v="caption" color="muted" align="center">
              {e.limitValue === null ? 'Unlimited comparisons' : `${e.remaining} of ${e.limitValue} comparisons left this month · resets ${fmtDayMonth(e.resetsAt)}`}
            </T>
          ) : null}
          <Button
            label={exhausted ? 'See Pro' : 'Compare'}
            disabled={!exhausted && (!a || !b)}
            onPress={() =>
              exhausted
                ? openPaywall({ context: 'compare_limit', resetsAt: e?.resetsAt, limit: e?.limitValue })
                : router.push({ pathname: '/compare/result', params: { a: a!.id, b: b!.id, ...(teamId ? { teamId } : {}) } })
            }
          />
        </View>
      }>
      <Stack gap={18}>
        <Rise>
          <Slot label="Match A" match={a} onPress={() => pick('A')} />
        </Rise>
        <Rise index={1}>
          <Slot label="Match B" match={b} onPress={() => pick('B')} />
        </Rise>
        {a && b ? (
          <Rise index={2}>
            <Card>
              <T v="titleSm">Which team?</T>
              <T v="caption" color="muted" style={{ marginTop: 4, marginBottom: 12 }}>
                {teams.common.length ? `Compare ${teams.common[0].name} in both matches, or pick another.` : 'No team played in both, so pick one or compare the matches as a whole.'}
              </T>
              <ChipBar>
                <Chip label="Whole match" selected={!teamId} onPress={() => setTeamId(null)} />
                {teams.uniq.map((t) => (
                  <Chip key={t.id} label={t.name} selected={teamId === t.id} onPress={() => setTeamId(t.id)} />
                ))}
              </ChipBar>
            </Card>
          </Rise>
        ) : null}
        {e && e.limitValue !== null ? (
          <Tag icon="data_usage" tone={exhausted ? 'warning' : 'neutral'}>
            {`Running this uses 1 of ${e.remaining} comparisons`}
          </Tag>
        ) : null}
      </Stack>
    </Screen>
  );
}
