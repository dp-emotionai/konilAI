"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Role } from "@/lib/roles";
import { search, type SearchResponse, MIN_QUERY_LENGTH } from "@/lib/api/search";

const DEBOUNCE_MS = 200;

export function useSearch(role: Role) {
  const [query, setQuery] = useState("");
  const [data, setData] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestIdRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const runSearch = useCallback(
    async (q: string) => {
      if (q.length < MIN_QUERY_LENGTH) {
        setData(null);
        setLoading(false);
        setError(null);
        return;
      }
      const id = ++requestIdRef.current;
      abortRef.current?.abort();
      abortRef.current = new AbortController();
      setLoading(true);
      setError(null);
      try {
        const res = await search(q, role, { signal: abortRef.current.signal });
        if (id !== requestIdRef.current) return; // dedupe: stale response
        setData(res);
      } catch (e) {
        if (id !== requestIdRef.current) return;
        const message = e instanceof Error ? e.message : "Search failed";
        if (message.includes("abort")) return;
        setError(message);
        setData(null);
      } finally {
        if (id === requestIdRef.current) setLoading(false);
      }
    },
    [role]
  );

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (query.length < MIN_QUERY_LENGTH) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }
    timerRef.current = setTimeout(() => runSearch(query), DEBOUNCE_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query, runSearch]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const setQuerySafe = useCallback((v: string) => setQuery(v.trim()), []);

  return {
    query,
    setQuery: setQuerySafe,
    data,
    loading,
    error,
    minLength: MIN_QUERY_LENGTH,
  };
}
