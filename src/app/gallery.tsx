import { Redirect } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { PlanCard } from '@/components/PlanCard';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { CheckItem, Deco, Row, SectionHeader, Skeleton, Stack, Swatch } from '@/ui/bits';
import { Rise, Swap } from '@/ui/motion';
import { Eyebrow, Tag } from '@/ui/Pill';
import { Screen } from '@/ui/Screen';
import { Segmented } from '@/ui/Segmented';
import { T } from '@/ui/Text';
import { Toggle } from '@/ui/Toggle';
import { useSettings } from '@/state/settings';

/**
 * Dev gallery: the design system in both themes. Stands in for the Figma Foundations and
 * Components pages. The first block is design.md's pricing section ported as the Tactiq paywall.
 */
function PricingPort() {
  const { c } = useTheme();
  const [annual, setAnnual] = useState(true);
  return (
    <View style={{ alignItems: 'center' }}>
      <Deco width={110} style={{ position: 'absolute', left: -30, top: 0 }} />
      <Deco width={110} mirror style={{ position: 'absolute', right: -30, top: 0 }} />
      <Rise index={0} style={{ alignItems: 'center' }}>
        <Eyebrow icon="sports_soccer">Tactiq Pro</Eyebrow>
        <T v="display" align="center" style={{ marginTop: 22 }}>
          {'Understand every match\n'}
          <T v="display">with no limits</T>
        </T>
        <T v="body" color="muted" align="center" style={{ marginTop: 16, fontSize: 14.5, maxWidth: 320 }}>
          Stories, insights and the timeline stay free. Pro removes the monthly limits and the ads.
        </T>
        <View style={{ marginTop: 34 }}>
          <Toggle value={annual} onChange={setAnnual} left="Monthly" right="Annual" label="Billing period" />
        </View>
        <T v="eyebrow" tint={c.faint} style={{ marginTop: 13, opacity: annual ? 1 : 0.4, fontSize: 10.5, letterSpacing: 0.84 }}>
          (SAVE 33%)
        </T>
      </Rise>
      <Rise index={1} style={{ alignSelf: 'stretch', marginTop: 30, gap: 16 }}>
        <PlanCard
          theme="light"
          tag="Free"
          amount="£0"
          period={annual ? 'Free, every year' : 'Free, every month'}
          swapKey={annual ? 'y' : 'm'}
          featuresTitle="Always included:"
          features={[{ text: 'Match stories and insights' }, { text: '20 analysed matches a month' }, { text: '5 comparisons a month' }]}
          cta="Keep Free"
        />
        <PlanCard
          theme="dark"
          tag="Pro"
          tagIcon="bolt"
          amount={annual ? '£39.99' : '£4.99'}
          period={annual ? 'Per year, about £3.33 a month' : 'Per month, cancel any time'}
          swapKey={annual ? 'y' : 'm'}
          featuresTitle="Everything in Free, plus:"
          features={[{ text: 'Unlimited match analysis' }, { text: 'Event and possession filters' }, { text: 'No ads' }]}
          cta="Start Pro"
        />
      </Rise>
    </View>
  );
}

function Kit() {
  const { c } = useTheme();
  const [depth, setDepth] = useState<'quick' | 'explore' | 'advanced'>('quick');
  const [on, setOn] = useState(false);
  const text = {
    quick: 'Argentina kept finding players just outside the box.',
    explore: 'Argentina completed 21 passes into zone 14, the central area in front of the penalty box.',
    advanced: 'Zone 14 receptions (v1): completed passes received in x 70–87.5, y 22.7–45.3. Argentina 21.',
  }[depth];
  return (
    <Stack gap={18}>
      <SectionHeader title="Depth switch" sub="Swap: fade + 6dp rise, rewritten at 154ms" />
      <Segmented
        label="Explanation depth"
        value={depth}
        onChange={setDepth}
        options={[
          { value: 'quick', label: 'Quick' },
          { value: 'explore', label: 'Explore' },
          { value: 'advanced', label: 'Advanced' },
        ]}
      />
      <Card>
        <Swap swapKey={depth}>
          <T v="body">{text}</T>
        </Swap>
      </Card>
      <SectionHeader title="Buttons" />
      <Button label="Explore the match" />
      <Button label="Continue" variant="ink" />
      <Button label="Other ways to sign in" variant="secondary" />
      <Button label="Delete my account" variant="destructive" />
      <SectionHeader title="Pills and badges" />
      <Row wrap gap={8}>
        <Tag icon="visibility">Observed</Tag>
        <Tag icon="calculate">Calculated</Tag>
        <Tag icon="psychology" tone="inferred">
          Inferred
        </Tag>
        <Tag tone="success" icon="signal_cellular_alt">
          High
        </Tag>
        <Tag tone="warning" icon="signal_cellular_alt_2_bar">
          Medium
        </Tag>
        <Tag tone="error" icon="signal_cellular_alt_1_bar">
          Low
        </Tag>
        <Tag tone="lime" icon="check_circle">
          Analysed
        </Tag>
      </Row>
      <Row gap={10}>
        <Swatch side="home" />
        <T v="labelSm">ARG</T>
        <Swatch side="away" />
        <T v="labelSm">FRA</T>
      </Row>
      <SectionHeader title="Switch" />
      <Toggle value={on} onChange={setOn} left="Home" right="Away" label="Team" />
      <SectionHeader title="List" />
      <Card>
        <Stack gap={15}>
          <CheckItem>Score, lineups and every event</CheckItem>
          <CheckItem off>Tracking data</CheckItem>
          <CheckItem off>Video</CheckItem>
        </Stack>
      </Card>
      <SectionHeader title="Hero card" />
      <Card variant="hero">
        <T v="eyebrow" tint={c.heroMuted}>
          FIFA World Cup · Final
        </T>
        <T v="score" tint={c.heroInk} style={{ marginTop: 10 }}>
          3–3
        </T>
      </Card>
      <SectionHeader title="Skeleton" />
      <Card>
        <Stack gap={10}>
          <Skeleton w="40%" h={10} />
          <Skeleton h={18} />
          <Skeleton w="80%" h={18} />
        </Stack>
      </Card>
    </Stack>
  );
}

function Gallery() {
  const mode = useSettings((s) => s.themeMode);
  const setMode = useSettings((s) => s.setThemeMode);
  return (
    <Screen>
      <Segmented
        label="Theme"
        size="sm"
        value={mode}
        onChange={setMode}
        options={[
          { value: 'system', label: 'System' },
          { value: 'light', label: 'Light' },
          { value: 'dark', label: 'Dark' },
        ]}
        style={{ marginBottom: 24 }}
      />
      <PricingPort />
      <View style={{ height: 40 }} />
      <Kit />
    </Screen>
  );
}

export function GalleryBoth() {
  return (
    <>
      <ThemeProvider force="light">
        <Kit />
      </ThemeProvider>
      <ThemeProvider force="dark">
        <Kit />
      </ThemeProvider>
    </>
  );
}

/** Development builds only. In a release build this route does not exist: it redirects home. */
export default function GalleryRoute() {
  return __DEV__ ? <Gallery /> : <Redirect href="/" />;
}
