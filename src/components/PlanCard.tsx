import { View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { CheckItem } from '@/ui/bits';
import { Swap } from '@/ui/motion';
import { Tag } from '@/ui/Pill';
import { T } from '@/ui/Text';

export type PlanCardProps = {
  theme: 'light' | 'dark';
  tag: string;
  tagIcon?: string;
  amount: string;
  period: string;
  /** Changing this cross-fades amount and period (design.md price swap). */
  swapKey: string;
  featuresTitle: string;
  features: { text: string; off?: boolean }[];
  cta?: string;
  onCta?: () => void;
  ctaLoading?: boolean;
  ctaDisabled?: boolean;
  footnote?: string;
};

/**
 * design.md `.card` at phone width (≤640px step): pad 24, radius 20, columns stacked with a 24
 * gap, price 36/800/-.036em (lime with a soft text glow on the dark card), period 14,
 * feature title 16/600, list gap 15, 24 spacer, 50-high CTA.
 */
export function PlanCard(p: PlanCardProps) {
  const { c } = useTheme();
  const dark = p.theme === 'dark';
  return (
    <Card variant={dark ? 'hero' : 'light'} style={{ paddingTop: 18, paddingBottom: 14 }}>
      <View style={{ gap: 24 }}>
        <View>
          <Tag onHero={dark} icon={p.tagIcon}>
            {p.tag}
          </Tag>
          <Swap swapKey={p.swapKey} style={{ marginTop: 20 }}>
            <T
              v="score"
              tint={dark ? c.lime : c.ink}
              style={[
                { fontSize: 36, lineHeight: 38 },
                dark && { textShadowColor: 'rgba(205,243,72,0.3)', textShadowRadius: 18, textShadowOffset: { width: 0, height: 0 } },
              ]}>
              {p.amount}
            </T>
            <T v="bodySm" tint={dark ? c.heroMuted : c.muted} style={{ marginTop: 12 }}>
              {p.period}
            </T>
          </Swap>
        </View>
        <View>
          <T v="titleSm" tint={dark ? c.heroInk : c.ink}>
            {p.featuresTitle}
          </T>
          <View style={{ marginTop: 15, gap: 15 }}>
            {p.features.map((f) => (
              <CheckItem key={f.text} onHero={dark} off={f.off}>
                {f.text}
              </CheckItem>
            ))}
          </View>
        </View>
      </View>
      {p.cta ? (
        <>
          <View style={{ height: 24 }} />
          <Button
            label={p.cta}
            variant={dark ? 'primary' : 'ink'}
            chevron={dark}
            onPress={p.onCta}
            loading={p.ctaLoading}
            disabled={p.ctaDisabled}
          />
        </>
      ) : null}
      {p.footnote ? (
        <T v="caption" tint={dark ? c.heroMuted : c.muted} style={{ marginTop: 12 }} align="center">
          {p.footnote}
        </T>
      ) : null}
    </Card>
  );
}
