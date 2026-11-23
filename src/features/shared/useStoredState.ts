"use client";

import { useCallback, useEffect, useState } from "react";
import type { z } from "zod";
import { readStored, writeStored } from "./storage";

/**
 * `useState` backed by validated `localStorage`. The first render uses `fallback` (so server and client
 * markup match); the stored value is loaded in an effect. `hydrated` turns true once it has been read.
 */
export function useStoredState<S extends z.ZodType>(name: string, schema: S, fallback: z.infer<S>) {
  const [value, setValue] = useState<z.infer<S>>(fallback);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setValue(readStored(name, schema, fallback));
    setHydrated(true);
    // fallback and schema are stable module-level values at every call site
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name]);

  const update = useCallback(
    (next: z.infer<S> | ((prev: z.infer<S>) => z.infer<S>)) => {
      setValue((prev: z.infer<S>) => {
        const resolved = typeof next === "function" ? (next as (p: z.infer<S>) => z.infer<S>)(prev) : next;
        writeStored(name, resolved);
        return resolved;
      });
    },
    [name],
  );

  return [value, update, hydrated] as const;
}
