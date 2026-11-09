import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "../api";

export function useApiResource<T>(path: string, refreshIntervalMs = 30_000) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [requestNumber, setRequestNumber] = useState(0);

  useEffect(() => {
    let active = true;
    let requestPending = false;
    const load = (initial: boolean) => {
      if (requestPending) return;
      requestPending = true;
      if (initial) setLoading(true);
      if (initial) setError(false);
      apiRequest<T>(path)
        .then((result) => {
          if (active) {
            setData(result);
            setError(false);
          }
        })
        .catch(() => {
          if (active) setError(true);
        })
        .finally(() => {
          requestPending = false;
          if (active && initial) setLoading(false);
        });
    };
    load(true);
    const timer =
      refreshIntervalMs > 0 ? window.setInterval(() => load(false), refreshIntervalMs) : undefined;

    return () => {
      active = false;
      if (timer !== undefined) window.clearInterval(timer);
    };
  }, [path, refreshIntervalMs, requestNumber]);

  const reload = useCallback(() => setRequestNumber((number) => number + 1), []);
  return { data, loading, error, reload };
}
