"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError, type Me } from "./api";

/**
 * Who is signed in, and which organization they are acting for.
 *
 * Extracted because three screens now need the same four states, and they are
 * four genuinely different things that a single `loading` boolean flattens:
 *
 * - still finding out
 * - not signed in
 * - signed in, but a member of nothing (so there is nothing to show, which is
 *   not an error)
 * - signed in and acting for an organization
 *
 * Client-side rather than a server component because the bearer token lives in
 * the browser's Supabase session, and the API is what decides authority.
 */
export type OwnerSession<T> =
  | { status: "loading" }
  | { status: "signed-out"; message: string }
  | { status: "no-organization"; me: Me }
  | { status: "failed"; message: string }
  | { status: "ready"; me: Me; organizationId: string; data: T };

export function useOwnerSession<T>(
  fetcher: (organizationId: string) => Promise<T>,
): { session: OwnerSession<T>; reload: () => Promise<void> } {
  const [session, setSession] = useState<OwnerSession<T>>({ status: "loading" });

  const load = useCallback(async () => {
    try {
      const me = await api.me();

      // The organizations this person may actually act for. Capabilities are
      // organization-scoped, so one held elsewhere does not count here.
      const owned = me.capabilities
        .filter((c) => c.capability === "OWNER" || c.capability === "STAFF")
        .map((c) => c.organizationId)
        .filter((id): id is string => id !== null);

      const organizationId = owned[0];
      if (!organizationId) {
        setSession({ status: "no-organization", me });
        return;
      }

      setSession({
        status: "ready",
        me,
        organizationId,
        data: await fetcher(organizationId),
      });
    } catch (cause) {
      // 401 is not a failure to report as breakage — it is the ordinary state
      // of a browser that has not signed in yet, and it gets a form, not an
      // error message.
      if (cause instanceof ApiError && cause.status === 401) {
        setSession({ status: "signed-out", message: cause.message });
        return;
      }

      setSession({
        status: "failed",
        message:
          cause instanceof ApiError
            ? cause.message
            : "Could not reach the server. Check your connection and try again.",
      });
    }
  }, [fetcher]);

  useEffect(() => {
    // The lint rule guards against cascading renders from synchronous setState
    // in an effect. This is the documented exception: one fetch on mount, whose
    // state updates all happen after an await.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  return { session, reload: load };
}
