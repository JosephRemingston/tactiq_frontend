import { useLocalSearchParams } from 'expo-router';
import type { ComponentType } from 'react';

import { isSlugKey, isUuid } from '@/security/validate';
import { Screen } from '@/ui/Screen';
import { TopBar } from '@/ui/TopBar';
import { NotFound } from './states';

/** `uuid?` and `key?` are optional: fine when absent, rejected when present and malformed. */
export type ParamKind = 'uuid' | 'uuid?' | 'key' | 'key?' | 'uuidOrNew';

function ok(kind: ParamKind, raw: string | string[] | undefined) {
  if (Array.isArray(raw)) return false; // repeated parameter: not something the app ever produces
  const optional = kind.endsWith('?');
  if (raw === undefined || raw === '') return optional;
  if (kind === 'uuidOrNew') return raw === 'new' || isUuid(raw);
  return kind.startsWith('uuid') ? isUuid(raw) : isSlugKey(raw);
}

/**
 * Wraps a route so its ids are checked before the screen mounts. Deep links are untrusted
 * input: with a malformed id the screen never renders, no hook runs and no request is sent;
 * the user sees the standard "This isn't available" state.
 */
export function guardParams<P extends object>(spec: Record<string, ParamKind>, Inner: ComponentType<P>) {
  function Guarded(props: P) {
    const params = useLocalSearchParams<Record<string, string | string[]>>();
    const valid = Object.entries(spec).every(([name, kind]) => ok(kind, params[name]));
    if (!valid)
      return (
        <Screen header={<TopBar />}>
          <NotFound />
        </Screen>
      );
    return <Inner {...props} />;
  }
  Guarded.displayName = `Guarded(${Inner.displayName ?? Inner.name ?? 'Screen'})`;
  return Guarded;
}
