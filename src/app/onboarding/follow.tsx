import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { api } from '@/api/endpoints';
import { useCompetitions, useSearch, useTeams } from '@/api/hooks';
import { TeamBadge } from '@/components/TeamChip';
import { useTheme } from '@/theme/ThemeProvider';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Row, Skeleton, Stack } from '@/ui/bits';
import { Icon } from '@/ui/Icon';
import { Lift, Rise, Swap } from '@/ui/motion';
import { useOverlay } from '@/ui/overlay';
import { Screen } from '@/ui/Screen';
import { T } from '@/ui/Text';
import { TextField } from '@/ui/TextField';
import { TopBar } from '@/ui/TopBar';

type Pick = { kind: 'teams' | 'competitions'; id: string; name: string; sub?: string };

function PickRow({ p, selected, onToggle }: { p: Pick; selected: boolean; onToggle: () => void }) {
  const { c, isDark } = useTheme();
  return (
    <Lift
      kind="none"
      onPress={onToggle}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`${p.name}${p.sub ? `, ${p.sub}` : ''}`}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        minHeight: 60,
        paddingHorizontal: 14,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: selected ? (isDark ? c.lime : c.ink) : c.cardLine,
        backgroundColor: selected ? c.limeSoft : c.surface,
      }}>
      {p.kind === 'teams' ? (
        <TeamBadge name={p.name} side="home" />
      ) : (
        <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: c.surfaceHigh, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="trophy" size={20} color={c.ink} />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <T v="titleSm" numberOfLines={1}>
          {p.name}
        </T>
        {p.sub ? (
          <T v="caption" color="muted" numberOfLines={1}>
            {p.sub}
          </T>
        ) : null}
      </View>
      <View
        style={{
          width: 26,
          height: 26,
          borderRadius: 13,
          borderWidth: selected ? 0 : 1.5,
          borderColor: c.faint,
          backgroundColor: selected ? c.ink : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        {selected ? <Icon name="check" size={18} color={c.bg} /> : null}
      </View>
    </Lift>
  );
}

/** Screen 4, Pick what you follow: competitions and clubs / national teams. Skip allowed. No ads. */
export default function OnboardingFollow() {
  const { snack } = useOverlay();
  const [q, setQ] = useState('');
  const [picked, setPicked] = useState<Map<string, Pick>>(new Map());
  const [saving, setSaving] = useState(false);
  const comps = useCompetitions();
  const wc = comps.data?.competitions.find((x) => x.name === 'FIFA World Cup');
  const teams = useTeams({ competitionId: wc?.id }, !!wc);
  const search = useSearch(q, ['competition', 'team']);

  const searching = q.trim().length >= 2;
  const compPicks: Pick[] = useMemo(() => {
    const list = searching ? (search.data?.competitions ?? []) : (comps.data?.competitions ?? []);
    const sorted = [...list].sort((a, b) => (a.name === 'FIFA World Cup' ? -1 : b.name === 'FIFA World Cup' ? 1 : 0));
    return sorted.slice(0, searching ? 8 : 6).map((x) => ({ kind: 'competitions', id: x.id, name: x.name, sub: x.countryName ?? undefined }));
  }, [searching, search.data, comps.data]);
  const teamPicks: Pick[] = useMemo(() => {
    const list = searching ? (search.data?.teams ?? []) : (teams.data?.pages.flatMap((p) => p.teams) ?? []);
    const order = ['Argentina', 'France', 'Croatia', 'Morocco'];
    const sorted = [...list].sort((a, b) => {
      const ia = order.indexOf(a.name);
      const ib = order.indexOf(b.name);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.name.localeCompare(b.name);
    });
    return sorted.slice(0, searching ? 8 : 12).map((x) => ({ kind: 'teams', id: x.id, name: x.name, sub: x.isNationalTeam ? 'National team' : (x.countryName ?? undefined) }));
  }, [searching, search.data, teams.data]);

  const toggle = (p: Pick) =>
    setPicked((m) => {
      const n = new Map(m);
      if (n.has(p.id)) n.delete(p.id);
      else n.set(p.id, p);
      return n;
    });

  const next = async () => {
    setSaving(true);
    try {
      await Promise.all([...picked.values()].map((p) => api.follow(p.kind, p.id, true)));
      router.push('/onboarding/preferences');
    } catch {
      snack("Couldn't save what you follow. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const loading = comps.isLoading || (searching && search.isLoading);

  return (
    <Screen
      header={
        <TopBar
          back={false}
          title="Step 1 of 2"
          actions={
            <Button
              label="Skip"
              variant="text"
              full={false}
              compact
              onPress={() => router.push('/onboarding/preferences')}
            />
          }
        />
      }
      footer={
        <View style={{ padding: 16, paddingBottom: 28, gap: 8 }}>
          <Swap swapKey={picked.size}>
            <T v="labelSm" color="muted" align="center" accessibilityLiveRegion="polite">
              {picked.size === 0 ? 'Pick at least one, or skip' : `${picked.size} selected`}
            </T>
          </Swap>
          <Button label="Continue" onPress={next} loading={saving} disabled={picked.size === 0} />
        </View>
      }>
      <Rise>
        <T v="display">What do you follow?</T>
        <T v="body" color="muted" style={{ marginTop: 8 }}>
          We'll build your home feed from these. You can change them any time.
        </T>
      </Rise>
      <Rise index={1} style={{ marginTop: 22 }}>
        <TextField icon="search" value={q} onChangeText={setQ} placeholder="Search teams and competitions" autoCorrect={false} returnKeyType="search" maxLength={80} />
      </Rise>
      <Stack gap={10} style={{ marginTop: 22 }}>
        <T v="eyebrow" color="muted">
          Competitions
        </T>
        {loading ? <Skeleton h={60} r={16} /> : compPicks.map((p) => <PickRow key={p.id} p={p} selected={picked.has(p.id)} onToggle={() => toggle(p)} />)}
        <T v="eyebrow" color="muted" style={{ marginTop: 14 }}>
          Clubs and national teams
        </T>
        {loading || (!searching && teams.isLoading) ? (
          <>
            <Skeleton h={60} r={16} />
            <Skeleton h={60} r={16} />
          </>
        ) : teamPicks.length ? (
          teamPicks.map((p) => <PickRow key={p.id} p={p} selected={picked.has(p.id)} onToggle={() => toggle(p)} />)
        ) : (
          <Card variant="tint">
            <Row>
              <Icon name="search_off" size={20} />
              <T v="bodySm">No teams match “{q}”.</T>
            </Row>
          </Card>
        )}
      </Stack>
    </Screen>
  );
}
