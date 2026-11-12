import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { useConcepts, useLearning } from '@/api/hooks';
import { AvatarButton } from '@/components/Avatar';
import { ConceptCard } from '@/components/ConceptCard';
import { QueryBoundary } from '@/components/QueryBoundary';
import { CardsSkeleton, EmptyState } from '@/components/states';
import { useSignedIn } from '@/services/auth';
import { useTheme } from '@/theme/ThemeProvider';
import { Card } from '@/ui/Card';
import { Row, Stack } from '@/ui/bits';
import { Chip, ChipBar } from '@/ui/Chip';
import { Rise } from '@/ui/motion';
import { Screen } from '@/ui/Screen';
import { T } from '@/ui/Text';
import { TextField } from '@/ui/TextField';

const CATEGORY: Record<string, string> = {
  metric: 'Metrics',
  'in-possession': 'With the ball',
  'out-of-possession': 'Without the ball',
  transition: 'Transitions',
  shape: 'Shape',
  space: 'Space',
  roles: 'Roles',
  'set-pieces': 'Set pieces',
  context: 'Context',
};

function Progress({ done, total }: { done: number; total: number }) {
  const { c } = useTheme();
  const pct = total ? done / total : 0;
  return (
    <Card variant="hero" glow={0.45} padded={false} style={{ padding: 18 }}>
      <Row>
        <T v="eyebrow" tint={c.heroMuted} style={{ flex: 1 }}>
          Your progress
        </T>
        <T v="labelSm" tint={c.lime} num>
          {Math.round(pct * 100)}%
        </T>
      </Row>
      <T v="title" tint={c.heroInk} style={{ marginTop: 8 }} num>
        {done} of {total} concepts completed
      </T>
      <View style={{ height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.12)', marginTop: 12, overflow: 'hidden' }} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: total, now: done }}>
        <View style={{ width: `${pct * 100}%`, height: 8, borderRadius: 4, backgroundColor: c.lime }} />
      </View>
    </Card>
  );
}

/** Screen 29, Learn hub: search, category filter, concepts with a one-line explanation. Free for everyone. */
export default function Learn() {
  const signedIn = useSignedIn();
  const [cat, setCat] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const concepts = useConcepts();
  const learning = useLearning();
  const done = useMemo(() => new Set((learning.data?.learning ?? []).filter((l) => l.status === 'completed').map((l) => l.conceptKey)), [learning.data]);
  const cats = useMemo(() => [...new Set((concepts.data?.concepts ?? []).map((c) => c.category).filter(Boolean))] as string[], [concepts.data]);
  return (
    <Screen bottomInset={false} refreshing={concepts.isRefetching} onRefresh={() => concepts.refetch()}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
        <T v="display" style={{ flex: 1 }} accessibilityRole="header">
          Learn
        </T>
        {signedIn ? <AvatarButton /> : null}
      </View>
      <T v="body" color="muted" style={{ marginBottom: 18 }}>
        Tactical words, explained in ten seconds.
      </T>
      <Stack gap={16}>
        {signedIn && concepts.data ? (
          <Rise>
            <Progress done={done.size} total={concepts.data.concepts.length} />
          </Rise>
        ) : null}
        <TextField icon="search" value={q} onChangeText={setQ} placeholder="Search concepts" maxLength={80} autoCorrect={false} />
        <ChipBar>
          <Chip label="All" selected={!cat} onPress={() => setCat(null)} />
          {cats.map((c) => (
            <Chip key={c} label={CATEGORY[c] ?? c} selected={cat === c} onPress={() => setCat(cat === c ? null : c)} />
          ))}
        </ChipBar>
        <QueryBoundary query={concepts} skeleton={<CardsSkeleton count={4} />}>
          {(d) => {
            const t = q.trim().toLowerCase();
            const list = d.concepts.filter((c) => (!cat || c.category === cat) && (!t || c.name.toLowerCase().includes(t) || c.simpleText.toLowerCase().includes(t)));
            if (!list.length) return <EmptyState icon="search_off" title="No concepts match" body="Try another word or category." />;
            return (
              <Stack gap={10}>
                {list.map((c, i) => (
                  <Rise key={c.key} index={Math.min(i, 6)}>
                    <ConceptCard c={c} learned={done.has(c.key)} />
                  </Rise>
                ))}
              </Stack>
            );
          }}
        </QueryBoundary>
      </Stack>
    </Screen>
  );
}
