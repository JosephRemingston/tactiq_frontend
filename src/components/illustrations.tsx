import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';

import { useTheme } from '@/theme/ThemeProvider';

/** Small flat illustrations: thin lines, one lime accent, no gradients. */
export function StoryArt({ size = 72 }: { size?: number }) {
  const { c } = useTheme();
  return (
    <Svg width={size} height={size} viewBox="0 0 72 72" fill="none">
      <Rect x="10" y="12" width="52" height="48" rx="10" stroke={c.ink} strokeWidth={1.6} />
      <Rect x="18" y="21" width="24" height="5" rx="2.5" fill={c.lime} />
      <Line x1="18" y1="33" x2="54" y2="33" stroke={c.ink} strokeWidth={1.6} strokeLinecap="round" opacity={0.7} />
      <Line x1="18" y1="40" x2="50" y2="40" stroke={c.ink} strokeWidth={1.6} strokeLinecap="round" opacity={0.45} />
      <Line x1="18" y1="47" x2="42" y2="47" stroke={c.ink} strokeWidth={1.6} strokeLinecap="round" opacity={0.3} />
    </Svg>
  );
}

export function PitchArt({ size = 72 }: { size?: number }) {
  const { c } = useTheme();
  return (
    <Svg width={size} height={size} viewBox="0 0 72 72" fill="none">
      <Rect x="8" y="16" width="56" height="40" rx="4" stroke={c.ink} strokeWidth={1.6} />
      <Line x1="36" y1="16" x2="36" y2="56" stroke={c.ink} strokeWidth={1.2} opacity={0.5} />
      <Circle cx="36" cy="36" r="6" stroke={c.ink} strokeWidth={1.2} opacity={0.5} />
      <Line x1="20" y1="44" x2="32" y2="28" stroke={c.ink} strokeWidth={1.6} opacity={0.8} />
      <Line x1="32" y1="28" x2="50" y2="34" stroke={c.ink} strokeWidth={2.4} />
      <Line x1="20" y1="44" x2="50" y2="34" stroke={c.ink} strokeWidth={1} opacity={0.5} />
      <Circle cx="20" cy="44" r="3.4" fill={c.ink} />
      <Circle cx="32" cy="28" r="3.4" fill={c.ink} />
      <Circle cx="50" cy="34" r="4.2" fill={c.lime} stroke={c.ink} strokeWidth={1.2} />
    </Svg>
  );
}

export function GlossaryArt({ size = 72 }: { size?: number }) {
  const { c } = useTheme();
  return (
    <Svg width={size} height={size} viewBox="0 0 72 72" fill="none">
      <Path d="M14 18h20a6 6 0 0 1 6 6v32a5 5 0 0 0-5-5H14z" stroke={c.ink} strokeWidth={1.6} strokeLinejoin="round" />
      <Path d="M58 18H44a6 6 0 0 0-4 1.6V56a5 5 0 0 1 5-5h13z" stroke={c.ink} strokeWidth={1.6} strokeLinejoin="round" />
      <Rect x="45" y="26" width="8" height="8" rx="2" fill={c.lime} />
      <Line x1="19" y1="28" x2="33" y2="28" stroke={c.ink} strokeWidth={1.4} strokeLinecap="round" opacity={0.6} />
      <Line x1="19" y1="35" x2="30" y2="35" stroke={c.ink} strokeWidth={1.4} strokeLinecap="round" opacity={0.4} />
    </Svg>
  );
}
