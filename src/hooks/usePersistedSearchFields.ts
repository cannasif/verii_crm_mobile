import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useState } from 'react';

const PREFIX = 'paged-search-fields';

export function usePersistedSearchFields(
  key: string,
  availableFields: readonly string[],
  defaultFields: readonly string[],
): readonly [string[], (fields: string[]) => void] {
  const availableKey = availableFields.join('|');
  const defaultsKey = defaultFields.join('|');
  const allowed = useMemo(() => new Set(availableFields), [availableKey]);
  const fallback = useMemo(() => {
    const values = [...new Set(defaultFields.filter((field) => allowed.has(field)))];
    return values.length ? values : [...availableFields];
  }, [allowed, availableKey, defaultsKey]);
  const storageKey = `${PREFIX}:${key}`;
  const [selected, setSelected] = useState<string[]>(fallback);

  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(storageKey).then((raw) => {
      if (!active || !raw) return;
      try {
        const parsed: unknown = JSON.parse(raw);
        if (!Array.isArray(parsed)) return;
        const valid = [...new Set(parsed.filter((field): field is string => typeof field === 'string' && allowed.has(field)))];
        if (valid.length) setSelected(valid);
      } catch {
        // Invalid local preference falls back to fields visible in the picker row.
      }
    });
    return () => { active = false; };
  }, [allowed, storageKey]);

  const update = useCallback((fields: string[]) => {
    const valid = [...new Set(fields.filter((field) => allowed.has(field)))];
    const safe = valid.length ? valid : fallback;
    setSelected(safe);
    void AsyncStorage.setItem(storageKey, JSON.stringify(safe));
  }, [allowed, fallback, storageKey]);

  return [selected, update] as const;
}
