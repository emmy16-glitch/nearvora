"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/client/api";

export function useApi<T>(url: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(Boolean(url));
  const requestId = useRef(0);

  const load = useCallback(
    async (options?: { quiet?: boolean }) => {
      if (!url) return;
      const current = ++requestId.current;
      if (!options?.quiet) setLoading(true);
      setError(null);
      try {
        const result = await apiFetch<T>(url);
        if (current === requestId.current) setData(result);
      } catch (caught) {
        if (current === requestId.current) {
          setError(caught instanceof Error ? caught : new Error("Request failed"));
        }
      } finally {
        if (current === requestId.current) setLoading(false);
      }
    },
    [url],
  );

  useEffect(() => {
    void load();
    return () => {
      requestId.current += 1;
    };
  }, [load]);

  return { data, error, loading, refetch: load, setData };
}
