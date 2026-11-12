/**
 * Nominal pitch spots (metres, team attacking +x, y = 0 on the left touchline) for StatsBomb
 * position names. Used to draw formation diagrams; real average positions come from the
 * passing network instead.
 */
export const POSITION_SPOT: Record<string, { x: number; y: number }> = {
  Goalkeeper: { x: 6, y: 34 },
  'Right Back': { x: 26, y: 60 },
  'Right Center Back': { x: 19, y: 46 },
  'Center Back': { x: 19, y: 34 },
  'Left Center Back': { x: 19, y: 22 },
  'Left Back': { x: 26, y: 8 },
  'Right Wing Back': { x: 40, y: 62 },
  'Left Wing Back': { x: 40, y: 6 },
  'Right Defensive Midfield': { x: 37, y: 44 },
  'Center Defensive Midfield': { x: 37, y: 34 },
  'Left Defensive Midfield': { x: 37, y: 24 },
  'Right Midfield': { x: 56, y: 60 },
  'Right Center Midfield': { x: 52, y: 46 },
  'Center Midfield': { x: 52, y: 34 },
  'Left Center Midfield': { x: 52, y: 22 },
  'Left Midfield': { x: 56, y: 8 },
  'Right Attacking Midfield': { x: 68, y: 48 },
  'Center Attacking Midfield': { x: 68, y: 34 },
  'Left Attacking Midfield': { x: 68, y: 20 },
  'Right Wing': { x: 78, y: 60 },
  'Left Wing': { x: 78, y: 8 },
  'Right Center Forward': { x: 86, y: 44 },
  'Center Forward': { x: 88, y: 34 },
  'Left Center Forward': { x: 86, y: 24 },
  'Secondary Striker': { x: 80, y: 34 },
};

export function spotFor(positionName: string | null | undefined, fallbackIndex: number) {
  if (positionName && POSITION_SPOT[positionName]) return POSITION_SPOT[positionName];
  return { x: 30 + (fallbackIndex % 4) * 15, y: 10 + Math.floor(fallbackIndex / 4) * 16 };
}
