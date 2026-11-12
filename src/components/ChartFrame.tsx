import { useState, type ReactNode } from 'react';
import { View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Card } from '@/ui/Card';
import { Divider, Row } from '@/ui/bits';
import { Icon } from '@/ui/Icon';
import { Lift, Swap } from '@/ui/motion';
import { T } from '@/ui/Text';

/**
 * Every chart: a one-sentence takeaway above it, the chart, and a "View as table" toggle so
 * screen-reader and colour-blind users get the same information as text.
 */
export function ChartFrame({
  takeaway,
  children,
  table,
  footer,
  swapKey,
}: {
  takeaway: string;
  children: ReactNode;
  table?: { columns: string[]; rows: (string | number)[][] };
  footer?: ReactNode;
  swapKey?: string;
}) {
  const { c } = useTheme();
  const [asTable, setAsTable] = useState(false);
  return (
    <Card padded={false} style={{ padding: 16, gap: 14 }}>
      <Swap swapKey={swapKey ?? takeaway}>
        <T v="titleSm" accessibilityRole="header">
          {takeaway}
        </T>
      </Swap>
      {asTable && table ? (
        <View accessibilityRole="list">
          <Row style={{ paddingVertical: 6 }}>
            {table.columns.map((col, i) => (
              <T key={col} v="caption" color="muted" style={{ flex: i === 0 ? 2 : 1, textAlign: i === 0 ? 'left' : 'right' }}>
                {col}
              </T>
            ))}
          </Row>
          {table.rows.map((r, ri) => (
            <View key={ri}>
              <Divider />
              <Row style={{ minHeight: 40 }} >
                {r.map((cell, i) => (
                  <T key={i} v={i === 0 ? 'bodySm' : 'number'} style={{ flex: i === 0 ? 2 : 1, textAlign: i === 0 ? 'left' : 'right', fontSize: 14 }} numberOfLines={2}>
                    {cell}
                  </T>
                ))}
              </Row>
            </View>
          ))}
        </View>
      ) : (
        children
      )}
      {footer}
      {table ? (
        <Lift kind="none" onPress={() => setAsTable((v) => !v)} accessibilityRole="button" style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 40 }}>
          <Icon name={asTable ? 'scatter_plot' : 'table_rows'} size={18} color={c.ink} />
          <T v="labelSm" style={{ textDecorationLine: 'underline' }}>
            {asTable ? 'View as chart' : 'View as table'}
          </T>
        </Lift>
      ) : null}
    </Card>
  );
}
