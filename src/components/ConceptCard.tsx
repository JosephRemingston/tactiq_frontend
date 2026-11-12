import { router } from 'expo-router';
import { View } from 'react-native';

import type { ConceptLite } from '@/api/types';
import { useTheme } from '@/theme/ThemeProvider';
import { Card } from '@/ui/Card';
import { Icon } from '@/ui/Icon';
import { T } from '@/ui/Text';

/** "Zone 14 — The central area just outside the penalty box." */
export function ConceptCard({ c: concept, learned, compact }: { c: ConceptLite; learned?: boolean; compact?: boolean }) {
  const { c } = useTheme();
  return (
    <Card
      onPress={() => router.push(`/concept/${concept.key}`)}
      accessibilityLabel={`${concept.name}. ${concept.simpleText}${learned ? '. Learned' : ''}`}
      padded={false}
      style={{ padding: compact ? 14 : 18 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
        <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: learned ? c.lime : c.surfaceHigh, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={learned ? 'check' : 'school'} size={20} color={learned ? c.onLime : c.ink} />
        </View>
        <View style={{ flex: 1 }}>
          <T v="titleSm">{concept.name}</T>
          <T v="bodySm" color="inkSecondary" style={{ marginTop: 3 }} numberOfLines={compact ? 2 : 3}>
            {concept.simpleText}
          </T>
        </View>
        <Icon name="chevron_right" size={22} color={c.muted} />
      </View>
    </Card>
  );
}
