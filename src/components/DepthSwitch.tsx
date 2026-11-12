import type { StyleProp, ViewStyle } from 'react-native';

import type { Depth } from '@/api/types';
import { useSettings } from '@/state/settings';
import { Segmented } from '@/ui/Segmented';

export const DEPTHS: { value: Depth; label: string }[] = [
  { value: 'quick', label: 'Quick' },
  { value: 'explore', label: 'Explore' },
  { value: 'advanced', label: 'Advanced' },
];

/** Quick / Explore / Advanced. Without `value` it reads and writes the user's default. */
export function DepthSwitch({ value, onChange, size, style }: { value?: Depth; onChange?: (d: Depth) => void; size?: 'sm' | 'md'; style?: StyleProp<ViewStyle> }) {
  const global = useSettings((s) => s.depth);
  const setGlobal = useSettings((s) => s.setDepth);
  return <Segmented label="Explanation depth" options={DEPTHS} value={value ?? global} onChange={onChange ?? setGlobal} size={size} style={style} />;
}
