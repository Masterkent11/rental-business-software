"use client";

import { useAuthDraft } from "./use-auth-draft";
import { useRef } from "react";

export function useAuthAction() {
  const pending = useRef(false);
  const [busy, setBusy] = useAuthDraft(false);
  const [error, setError] = useAuthDraft<string | null>(null);
  async function run(action: () => Promise<void>) {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (problem) {
      setError(
        problem instanceof Error ? problem.message : "Please try again.",
      );
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return { busy, error, setError, run };
}
