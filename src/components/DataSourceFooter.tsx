import { View } from 'react-native';

import type { MatchDetail } from '@/api/types';
import { useTheme } from '@/theme/ThemeProvider';
import { Icon } from '@/ui/Icon';
import { useOverlay } from '@/ui/overlay';
import { T } from '@/ui/Text';

/** "Data: StatsBomb Open Data (Hudl StatsBomb)" + coverage statement link. On every match screen. */
export function DataSourceFooter({ match, coverageStatement }: { match: MatchDetail; coverageStatement?: string }) {
  const { c } = useTheme();
  const { openSheet } = useOverlay();
  const attribution = match.licence?.attribution ?? 'Data: StatsBomb Open Data (Hudl StatsBomb)';
  const unavailable = match.coverage.unavailable ?? [];
  return (
    <View style={{ borderTopWidth: 1, borderColor: c.line, paddingTop: 14, marginTop: 8, gap: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Icon name="database" size={16} color={c.muted} />
        <T v="caption" color="muted" style={{ flex: 1 }}>
          {attribution}
        </T>
      </View>
      <T
        v="caption"
        style={{ textDecorationLine: 'underline', paddingVertical: 6 }}
        accessibilityRole="link"
        onPress={() =>
          openSheet(
            <View style={{ gap: 12 }}>
              {coverageStatement ? <T v="body">{coverageStatement}</T> : null}
              <T v="bodySm" color="inkSecondary">
                {match.coverage.eventsCount ? `${match.coverage.eventsCount.toLocaleString('en-GB')} events from ${match.coverage.eventProvider ?? 'the provider'}. ` : ''}
                {match.coverage.hasFreezeFrames ? 'Freeze frames (player positions) exist for selected moments such as shots. ' : ''}
                Tracking data and video are not available{unavailable.length ? ', so team shape, off-ball runs and physical load are not assessed' : ''}.
              </T>
              {match.coverage.dataQuality?.notes.length ? (
                <T v="caption" color="muted">
                  {match.coverage.dataQuality.notes.join(' ')}
                </T>
              ) : null}
              <T v="caption" color="muted">
                {attribution}. {match.licence && !match.licence.commercialUseAllowed ? 'Licensed for non-commercial use.' : ''}
              </T>
            </View>,
            { title: 'Coverage statement' },
          )
        }>
        How much data this match has
      </T>
    </View>
  );
}
