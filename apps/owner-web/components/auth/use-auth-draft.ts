"use client";

import { useCallback, useMemo } from "react";
import { useStore } from "zustand";
import { createStore } from "zustand/vanilla";

type DraftUpdate<T> = T | ((current: T) => T);

export function useAuthDraft<T>(
  initial: T,
): [T, (update: DraftUpdate<T>) => void] {
  const store = useMemo(
    () => createStore(() => ({ value: initial })),
    [initial],
  );
  const value = useStore(store, (state) => state.value);
  const update = useCallback(
    (next: DraftUpdate<T>) => {
      store.setState({
        value:
          typeof next === "function"
            ? (next as (current: T) => T)(store.getState().value)
            : next,
      });
    },
    [store],
  );
  return [value, update];
}
