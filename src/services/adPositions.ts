// Pure ad-placement maths (no React Native imports; tested with node --test).

export type ListRow<T> = { kind: 'item'; item: T; index: number } | { kind: 'ad'; slot: number };

/**
 * Interleaves native ad rows into a list. The first ad goes after item `afterIndex`
 * (0-based, so 3 = after the 4th item), then one after every `every` further items, up to `max`.
 * An ad never ends the list: it needs at least one item after it.
 */
export function interleaveAds<T>(items: T[], opts: { afterIndex: number; every: number; max: number } | null): ListRow<T>[] {
  const rows: ListRow<T>[] = [];
  const positions = new Set<number>();
  if (opts && opts.max > 0 && opts.every > 0 && opts.afterIndex >= 0) {
    for (let i = opts.afterIndex, n = 0; i < items.length - 1 && n < opts.max; i += opts.every, n++) positions.add(i);
  }
  let slot = 0;
  items.forEach((item, index) => {
    rows.push({ kind: 'item', item, index });
    if (positions.has(index)) rows.push({ kind: 'ad', slot: slot++ });
  });
  return rows;
}

/** Session frequency rules from /v1/ads/config: min seconds between ads, max per session overall and per placement. */
export class AdPacer {
  private total = 0;
  private perPlacement = new Map<string, number>();
  private last = -Infinity;
  private shown = new Set<string>();
  private readonly rules: { minSecondsBetweenAds: number; maxPerSession: number };
  private readonly now: () => number;

  constructor(rules: { minSecondsBetweenAds: number; maxPerSession: number }, now: () => number = () => Date.now()) {
    this.rules = rules;
    this.now = now;
  }

  /** Asks to show the ad identified by `id` (stable per list position). Records the impression when allowed. */
  request(id: string, placement: string, placementMax: number): boolean {
    if (this.shown.has(id)) return true; // already on screen: re-renders keep it
    const t = this.now();
    if (this.total >= this.rules.maxPerSession) return false;
    if ((this.perPlacement.get(placement) ?? 0) >= placementMax) return false;
    if (t - this.last < this.rules.minSecondsBetweenAds * 1000) return false;
    this.total++;
    this.perPlacement.set(placement, (this.perPlacement.get(placement) ?? 0) + 1);
    this.last = t;
    this.shown.add(id);
    return true;
  }

  reset() {
    this.total = 0;
    this.perPlacement.clear();
    this.last = -Infinity;
    this.shown.clear();
  }
}
