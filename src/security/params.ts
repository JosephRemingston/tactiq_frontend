import { useLocalSearchParams } from 'expo-router';

import { isSlugKey, isUuid } from './validate';

/**
 * Reads an id from the route and checks its shape before anything uses it. Deep links are
 * untrusted input: an id that is not a UUID (or not a glossary key) never reaches the API.
 * Returns '' when invalid, which the query hooks treat as "disabled".
 */
export function useIdParam(name: string, kind: 'uuid' | 'key' = 'uuid'): { id: string; valid: boolean } {
  const raw = useLocalSearchParams<Record<string, string | string[]>>()[name];
  const v = Array.isArray(raw) ? raw[0] : raw;
  const valid = kind === 'uuid' ? isUuid(v) : isSlugKey(v);
  return { id: valid ? (v as string) : '', valid };
}

/** An optional UUID route parameter: undefined when absent or malformed. */
export function useOptionalUuid(name: string): string | undefined {
  const raw = useLocalSearchParams<Record<string, string | string[]>>()[name];
  const v = Array.isArray(raw) ? raw[0] : raw;
  return isUuid(v) ? v : undefined;
}
