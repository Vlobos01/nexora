import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import Dexie, { type Table } from 'dexie';

export const QUOTA_MSG =
  'No hay espacio suficiente en el almacenamiento del navegador. Liberá espacio o eliminá presupuestos viejos.';

export interface StorageHandlers<T> {
  setValue: Dispatch<SetStateAction<T>>;
  reset: () => void;
}

interface KvRecord {
  key: string;
  value: unknown;
}

/**
 * Base de datos local del navegador (IndexedDB vía Dexie).
 * Toda la información queda en el dispositivo: nunca se envía a internet.
 */
class NexoraDB extends Dexie {
  kv!: Table<KvRecord, string>;

  constructor() {
    super('nexora');
    this.version(1).stores({ kv: 'key' });
  }
}

const db = new NexoraDB();

function channelName(key: string): string {
  return `nexora:${key}`;
}

/**
 * Estado React persistido en IndexedDB (Dexie).
 * - La carga inicial es asíncrona: expone `ready` para no renderizar datos por defecto.
 * - Migra automáticamente lo que había en localStorage (versiones anteriores) la primera vez.
 * - Se sincroniza entre pestañas con BroadcastChannel.
 * - Tolera errores de cuota/privacidad.
 */
export function useIndexedDB<T>(
  key: string,
  initial: T | (() => T),
  normalize?: (raw: T) => T,
): [T, StorageHandlers<T>, boolean, boolean] {
  const [value, setValueState] = useState<T>(() =>
    typeof initial === 'function' ? (initial as () => T)() : initial,
  );
  const [error, setError] = useState(false);
  const [ready, setReady] = useState(false);
  const keyRef = useRef(key);
  keyRef.current = key;
  const readyRef = useRef(false);
  const channelRef = useRef<BroadcastChannel | null>(null);

  // Carga inicial (asíncrona) + migración desde localStorage
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const record = await db.kv.get(keyRef.current);
        let next: T | undefined;
        if (record != null) {
          next = normalize ? normalize(record.value as T) : (record.value as T);
        } else {
          // Primera vez con IndexedDB: migrar lo que había en localStorage
          const legacy = window.localStorage.getItem(keyRef.current);
          if (legacy != null) {
            try {
              const parsed = JSON.parse(legacy) as T;
              next = normalize ? normalize(parsed) : parsed;
            } catch {
              // dato corrupto: se ignora
            }
          }
        }
        if (!cancelled) {
          if (next !== undefined) setValueState(next);
          readyRef.current = true;
          setReady(true);
        }
      } catch (e) {
        console.warn('No se pudo leer de IndexedDB:', e);
        if (!cancelled) {
          readyRef.current = true;
          setReady(true);
          setError(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Persistir cada cambio (solo después de la carga inicial)
  useEffect(() => {
    if (!readyRef.current) return;
    db.kv
      .put({ key: keyRef.current, value })
      .then(() => {
        setError(false);
        // Avisar a las otras pestañas
        channelRef.current?.postMessage({ type: 'update', value });
      })
      .catch((e) => {
        console.warn('No se pudo guardar en IndexedDB:', e);
        setError(true);
      });
  }, [value]);

  // Sincronizar entre pestañas
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;
    const bc = new BroadcastChannel(channelName(keyRef.current));
    channelRef.current = bc;
    const onMessage = (e: MessageEvent) => {
      if (e.data?.type !== 'update') return;
      try {
        const parsed = normalize ? normalize(e.data.value as T) : (e.data.value as T);
        setValueState(parsed);
      } catch {
        // dato inválido en la otra pestaña: se ignora
      }
    };
    bc.addEventListener('message', onMessage);
    return () => {
      bc.removeEventListener('message', onMessage);
      bc.close();
      channelRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setValue = useCallback<Dispatch<SetStateAction<T>>>((action) => {
    setValueState((prev) =>
      typeof action === 'function' ? (action as (p: T) => T)(prev) : action,
    );
  }, []);

  const reset = useCallback(() => {
    setValue(typeof initial === 'function' ? (initial as () => T)() : initial);
  }, [initial]);

  return [value, { setValue, reset }, error, ready];
}
