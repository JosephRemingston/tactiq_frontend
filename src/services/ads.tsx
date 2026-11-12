import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { useAdsConfig } from '@/api/hooks';
import type { AdSlot as ApiAdSlot, AdsConfig } from '@/api/types';
import { useTheme } from '@/theme/ThemeProvider';
import { Icon } from '@/ui/Icon';
import { T } from '@/ui/Text';
import { AdPacer, interleaveAds } from './adPositions';

/**
 * Ads adapter. The server decides who sees ads (`enabled`, `adSlots` already filtered for the
 * user, `adFreeScreens`); this hook applies the placement and frequency rules. Rendering is
 * simulated: a clearly labelled Sponsored card in the slot. Real AdMob + UMP consent replace
 * `SponsoredCard` without screen changes.
 */
export type AdScreen = 'home' | 'explore' | 'matches_list';

let pacer: AdPacer | null = null;
function getPacer(cfg: AdsConfig) {
  if (!pacer) pacer = new AdPacer(cfg.frequency);
  return pacer;
}
export function resetAdSession() {
  pacer?.reset();
}

export function useAds(screen: AdScreen, listSlots?: ApiAdSlot[]) {
  const q = useAdsConfig();
  const cfg = q.data?.ads;
  return useMemo(() => {
    if (!cfg || !cfg.enabled || cfg.adFreeScreens.includes(screen)) return { enabled: false as const, native: null, banner: null, cfg };
    const placement = cfg.placements.find((p) => p.screen === screen);
    if (!placement) return { enabled: false as const, native: null, banner: null, cfg };
    if (placement.format === 'banner') return { enabled: true as const, native: null, banner: placement, cfg };
    // Prefer the list response's slot (server-filtered for this user) for the first position.
    const fromList = listSlots?.find((s) => s.placement === placement.key);
    if (listSlots && !fromList) return { enabled: false as const, native: null, banner: null, cfg };
    const afterIndex = fromList?.afterIndex ?? (placement.position.first ?? 1) - 1;
    return {
      enabled: true as const,
      native: { placement, afterIndex, every: placement.position.every ?? 6, max: placement.maxPerSession },
      banner: null,
      cfg,
    };
  }, [cfg, screen, listSlots]);
}

export function useInterleaved<T>(items: T[], screen: AdScreen, listSlots?: ApiAdSlot[]) {
  const ads = useAds(screen, listSlots);
  const rows = useMemo(
    () => interleaveAds(items, ads.native ? { afterIndex: ads.native.afterIndex, every: ads.native.every, max: ads.native.max } : null),
    [items, ads.native],
  );
  return { rows, ads };
}

/** Native ad card: "Sponsored" label, different surface tint, never inside or beside an explanation. */
export function SponsoredCard({ id, placement, cfg, max }: { id: string; placement: string; cfg: AdsConfig; max: number }) {
  const { c } = useTheme();
  const [allowed] = useState(() => getPacer(cfg).request(id, placement, max));
  if (!allowed) return null;
  return (
    <View
      accessibilityRole="none"
      accessibilityLabel="Sponsored. Advertisement"
      style={{ borderRadius: 20, backgroundColor: c.sponsored, borderWidth: 1, borderColor: c.sponsoredLine, padding: 18, gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ paddingHorizontal: 8, height: 20, borderRadius: 6, borderWidth: 1, borderColor: c.sponsoredLine, justifyContent: 'center' }}>
          <T v="tag" color="muted" style={{ fontSize: 9.5 }}>
            Sponsored
          </T>
        </View>
        <T v="caption" color="faint">
          {cfg.testUnits ? 'Test ad' : 'Ad'}
        </T>
      </View>
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
        <View style={{ width: 56, height: 56, borderRadius: 12, backgroundColor: c.surfaceHigh, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="campaign" size={26} color={c.muted} />
        </View>
        <View style={{ flex: 1 }}>
          <T v="titleSm">Advertiser headline</T>
          <T v="bodySm" color="muted" numberOfLines={2}>
            A native ad from the network appears here for Free users.
          </T>
        </View>
      </View>
    </View>
  );
}

/** Bottom banner (matches list only). */
export function BannerAd({ cfg, placementKey, max }: { cfg: AdsConfig; placementKey: string; max: number }) {
  const { c } = useTheme();
  const [allowed] = useState(() => getPacer(cfg).request(`banner:${placementKey}`, placementKey, max));
  if (!allowed) return null;
  return (
    <View
      accessibilityLabel="Sponsored. Advertisement"
      style={{ height: 56, backgroundColor: c.sponsored, borderTopWidth: 1, borderColor: c.sponsoredLine, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 10 }}>
      <View style={{ paddingHorizontal: 8, height: 20, borderRadius: 6, borderWidth: 1, borderColor: c.sponsoredLine, justifyContent: 'center' }}>
        <T v="tag" color="muted" style={{ fontSize: 9.5 }}>
          Sponsored
        </T>
      </View>
      <T v="bodySm" color="muted" style={{ flex: 1 }} numberOfLines={1}>
        Banner ad ({cfg.testUnits ? 'test unit' : 'ad'})
      </T>
    </View>
  );
}
