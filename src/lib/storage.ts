import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';

export const QUOTA_MSG =
  'No hay espacio suficiente en el almacenamiento del navegador. Liberá espacio o eliminá presupuestos viejos.';

export interface StorageHandlers<T> {
  setValue: Dispatch<SetStateAction<T>>;
  reset: () => void;
}

/**
 * Estado React persistido en localStorage.
 * - Valida la forma de los datos leídos (evita crashes con datos viejos/corruptos).
 * - Se sincroniza entre pestañas con el evento `storage`.
 * - Tolera errores de cuota/privacidad.
 */
export function useLocalStorage<T>(
  key: string,
  initial: T | (() => T),
  normalize?: (raw: T) => T,
): [T, StorageHandlers<T>, boolean] {
  const [value, setValueState] = useState<T>(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw != null) {
        const parsed = JSON.parse(raw) as T;
        return normalize ? normalize(parsed) : parsed;
      }
    } catch {
      // datos corruptos o acceso denegado: se ignoran
    }
    return typeof initial === 'function' ? (initial as () => T)() : initial;
  });

  const [quotaError, setQuotaError] = useState(false);
  const keyRef = useRef(key);
  keyRef.current = key;

  // Persistir cada cambio
  useEffect(() => {
    try {
      window.localStorage.setItem(keyRef.current, JSON.stringify(value));
      setQuotaError(false);
    } catch (e) {
      console.warn('No se pudo guardar en localStorage:', e);
      setQuotaError(true);
    }
  }, [value]);

  // Sincronizar entre pestañas
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== keyRef.current || e.newValue == null) return;
      try {
        const parsed = JSON.parse(e.newValue) as T;
        setValueState(normalize ? normalize(parsed) : parsed);
      } catch {
        // dato inválido en la otra pestaña: se ignora
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
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

  return [value, { setValue, reset }, quotaError];
}
