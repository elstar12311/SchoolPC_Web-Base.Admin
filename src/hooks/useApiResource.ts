import { useCallback, useEffect, useRef, useState } from "react";
import { apiRequest } from "../api";

export function useApiResource<T>(path: string, refreshIntervalMs = 30_000) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [requestNumber, setRequestNumber] = useState(0);
  const hasData = useRef(false);

  useEffect(() => {
    let active = true;
    let requestPending = false;
    const load = (initial: boolean) => {
      if (requestPending) return;
      requestPending = true;
      if (initial && !hasData.current) setLoading(true);
      if (initial) setError(false);
      apiRequest<T>(path)
        .then((result) => {
          if (active) {
            hasData.current = true;
            setData(result);
            setError(false);
            setUpdatedAt(new Date());
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
  return { data, loading, error, updatedAt, reload };
}
