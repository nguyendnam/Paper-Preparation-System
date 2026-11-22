import { useCallback, useEffect, useState } from 'react';
import { api, errorMessage } from '../api/client';

interface State<T> {
  path: string;
  data?: T;
  error?: string;
}

/**
 * GET a resource and expose `reload()` so pages can refresh after a mutation.
 * While reloading the same path the previous data stays visible (no flicker);
 * when the path changes the state starts from "loading" again (unless `keepPrevious`).
 */
export function useResource<T>(path: string | null, options: { keepPrevious?: boolean } = {}) {
  const [state, setState] = useState<State<T> | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (path === null) return;
    const controller = new AbortController();

    api
      .get<T>(path, controller.signal)
      .then((data) => setState({ path, data }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setState((prev) => ({
          path,
          data: prev?.path === path ? prev.data : undefined,
          error: errorMessage(error),
        }));
      });

    return () => controller.abort();
  }, [path, tick]);

  const reload = useCallback(() => setTick((n) => n + 1), []);

  // `keepPrevious` shows the last result while a changed path (e.g. a filter) is loading.
  const current = state && (state.path === path || options.keepPrevious) ? state : null;

  return {
    data: current?.data,
    error: current?.error,
    loading: path !== null && current === null,
    reload,
  };
}
