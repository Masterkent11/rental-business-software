"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Page, Panel, TopBar } from "@/components/owner/shell";
import { Pill } from "@/components/owner/status";
import { api, ApiError, type Me, type OwnerApplication } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { formatDate, formatDateTime, peso } from "@/lib/money";

/**
 * Applications.
 *
 * Two rules from the product shape this screen, and both are stated on it
 * rather than assumed:
 *
 *   * **Applying reserves nothing.** Several people may apply for one unit.
 *     Approving one is what places the hold and takes it off the market — so
 *     competing applications are grouped, not hidden.
 *   * **The platform does not screen anyone.** It carries the documents; the
 *     owner judges them. No score, no credit check, permanently.
 *
 * The organization is not chosen here. It comes from the owner's memberships,
 * which the API resolves per request — this screen never asserts which
 * organization it is acting for beyond echoing back what it was told.
 */
export default function ApplicationsPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [applications, setApplications] = useState<OwnerApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  /**
   * Fetch the queue.
   *
   * Deliberately does not flip `loading` on entry: React refuses a synchronous
   * state update inside an effect, and the initial state is already `true`. The
   * retry button sets it itself, where that is allowed.
   */
  const load = useCallback(async () => {
    try {
      const profile = await api.me();
      setMe(profile);

      // The organizations this person may actually decide for. An owner with
      // none is signed in but has nothing to do here, which is a different
      // thing from an error.
      const owned = profile.capabilities
        .filter((c) => c.capability === "OWNER" || c.capability === "STAFF")
        .map((c) => c.organizationId)
        .filter((id): id is string => id !== null);

      if (owned.length === 0) {
        setOrganizationId(null);
        setApplications([]);
        setError(null);
        return;
      }

      const org = owned[0]!;
      setOrganizationId(org);
      setApplications((await api.applications(org)).applications);
      // Clear any previous failure only once this one has succeeded — a stale
      // error sitting above fresh data tells the owner the screen is broken
      // when it is working.
      setError(null);
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.message
          : "Could not reach the server. Check your connection and try again.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // The rule guards against cascading renders from synchronous setState in an
    // effect. This is the documented exception: one fetch on mount, whose state
    // updates all happen after an await.
    //
    // It has to be client-side rather than a server component, because the
    // bearer token lives in the browser's Supabase session — the API is what
    // decides authority, and it needs that token to do it.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const decide = async (
    application: OwnerApplication,
    decision: "APPROVED" | "REJECTED",
  ) => {
    if (!organizationId) return;

    // A rejection must carry a reason: the applicant reads it, and a refusal
    // with no explanation is what customers complain about most.
    let reason: string | undefined;
    if (decision === "REJECTED") {
      const entered = window.prompt(
        "Why are you turning this down? The applicant will see this.",
      );
      if (!entered || entered.trim().length < 3) return;
      reason = entered.trim();
    }

    setBusy(application.id);
    setError(null);
    setLoading(true);

    try {
      await api.decide(organizationId, application.id, decision, reason);
      await load();
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? // 409 means the term collides with an existing booking or lease.
            // Said plainly, at decision time, rather than discovered later.
            cause.message
          : "Could not record that decision.",
      );
      // Reload anyway. A refused decision still leaves a queue the owner needs
      // to see — stranding them on a spinner with the reason above it is worse
      // than the refusal itself.
      await load();
    } finally {
      setBusy(null);
    }
  };

  const waiting = applications.filter(
    (a) => a.state === "SUBMITTED" || a.state === "UNDER_REVIEW",
  );

  // How many other people are waiting on the same place.
  const contested = new Map<string, number>();
  for (const a of waiting) {
    contested.set(a.listingTitle, (contested.get(a.listingTitle) ?? 0) + 1);
  }

  return (
    <>
      <TopBar
        title="Applications"
        caption={
          loading
            ? "Loading…"
            : `${waiting.length} waiting on your decision`
        }
      />

      <Page>
        <Panel tone="pending" className="mb-5 p-5">
          <p className="text-[14px] font-semibold">
            Approving an application places the hold
          </p>
          <p className="text-muted-foreground mt-1.5 max-w-3xl text-[13px] leading-relaxed">
            Until you approve someone, the resource stays on the market and
            anyone else can apply. Once you approve, it is held for 72 hours
            while they pay the advance and deposit — and if the term you approve
            overlaps an existing booking or lease, the approval is refused with
            the conflict shown.
          </p>
        </Panel>

        {error ? (
          <Panel tone="bad" className="mb-5 p-5">
            <p className="text-[14px] font-semibold">{error}</p>
            <Button
              size="sm"
              variant="outline"
              className="mt-3 rounded-full"
              onClick={() => {
                setLoading(true);
                setError(null);
                void load();
              }}
            >
              Try again
            </Button>
          </Panel>
        ) : null}

        {loading ? (
          <Panel className="p-5">
            <p className="text-muted-foreground text-[13.5px]">
              Loading applications…
            </p>
          </Panel>
        ) : !me ? (
          <SignIn onSignedIn={() => void load()} />
        ) : !organizationId ? (
          <Panel className="p-5">
            <p className="text-[14px] font-semibold">
              This account owns no properties
            </p>
            <p className="text-muted-foreground mt-1.5 text-[13px]">
              Signed in as {me.displayName}. Ask an owner to add you to their
              organization.
            </p>
          </Panel>
        ) : applications.length === 0 ? (
          <Panel className="p-5">
            <p className="text-[14px] font-semibold">No applications yet</p>
            <p className="text-muted-foreground mt-1.5 text-[13px]">
              They appear here the moment somebody applies.
            </p>
          </Panel>
        ) : (
          <div className="space-y-4">
            {applications.map((a) => {
              const rivals = (contested.get(a.listingTitle) ?? 0) - 1;
              const pending =
                a.state === "SUBMITTED" || a.state === "UNDER_REVIEW";

              return (
                <Panel key={a.id} className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex min-w-0 items-start gap-3.5">
                      <span className="bg-secondary text-foreground grid size-10 shrink-0 place-items-center rounded-full text-[13px] font-semibold">
                        {a.reference.slice(0, 2)}
                      </span>
                      <div className="min-w-0">
                        <p className="text-[15px] font-semibold">
                          {a.listingTitle}
                        </p>
                        <p className="text-muted-foreground mt-0.5 text-[13px]">
                          {a.propertyName} · {a.areaLabel}
                          {a.cityLabel ? `, ${a.cityLabel}` : ""}
                        </p>
                        <p className="text-muted-foreground mt-0.5 font-mono text-[11.5px]">
                          {a.reference} · submitted {formatDateTime(a.createdAt)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {a.state === "APPROVED" ? (
                        <Pill variant="ok">Approved · held</Pill>
                      ) : a.state === "REJECTED" ? (
                        <Pill variant="bad">Rejected</Pill>
                      ) : a.state === "WITHDRAWN" ? (
                        <Pill variant="bad">Withdrawn</Pill>
                      ) : (
                        <Pill variant="pending">Awaiting your decision</Pill>
                      )}
                    </div>
                  </div>

                  <dl className="mt-4 grid gap-4 sm:grid-cols-4">
                    <div>
                      <dt className="label-caps text-muted-foreground">
                        Move-in
                      </dt>
                      <dd className="mt-1 text-[13.5px]">
                        {formatDate(a.desiredMoveIn)} · {a.desiredTermMonths} mo
                      </dd>
                    </div>
                    <div>
                      <dt className="label-caps text-muted-foreground">Rent</dt>
                      <dd className="mt-1 text-[13.5px]">
                        {peso(a.monthlyRentCentavos)}/mo
                      </dd>
                    </div>
                    <div>
                      <dt className="label-caps text-muted-foreground">
                        Documents
                      </dt>
                      <dd className="mt-1 flex items-center gap-1.5 text-[13.5px]">
                        <FileText className="text-muted-foreground size-3.5" />
                        {a.documentCount} attached
                      </dd>
                    </div>
                    <div>
                      <dt className="label-caps text-muted-foreground">
                        {a.reservation ? "Reservation" : "Competing"}
                      </dt>
                      <dd className="mt-1 text-[13.5px]">
                        {a.reservation ? (
                          <span className="text-money font-medium">
                            {peso(a.reservation.feeCentavos)} ·{" "}
                            {a.reservation.state.toLowerCase()}
                          </span>
                        ) : rivals > 0 ? (
                          <span className="text-money font-medium">
                            {rivals} other applicant{rivals === 1 ? "" : "s"}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">None</span>
                        )}
                      </dd>
                    </div>
                  </dl>

                  {a.decisionReason ? (
                    <p className="text-muted-foreground mt-3 text-[13px]">
                      Reason given: {a.decisionReason}
                    </p>
                  ) : null}

                  {a.holdExpiresAt ? (
                    <p className="mt-3 text-[13px]">
                      Held until {formatDateTime(a.holdExpiresAt)}
                    </p>
                  ) : null}

                  {pending ? (
                    <div className="border-border mt-4 flex flex-wrap gap-2 border-t pt-4">
                      <Button
                        size="sm"
                        className="rounded-full"
                        disabled={busy === a.id}
                        onClick={() => void decide(a, "APPROVED")}
                      >
                        <Check className="size-3.5" /> Approve and hold
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-bad hover:text-bad rounded-full"
                        disabled={busy === a.id}
                        onClick={() => void decide(a, "REJECTED")}
                      >
                        <X className="size-3.5" /> Reject with a reason
                      </Button>
                    </div>
                  ) : null}
                </Panel>
              );
            })}
          </div>
        )}
      </Page>
    </>
  );
}

/** Minimal sign-in. Identity is Supabase's; authority is the API's. */
function SignIn({ onSignedIn }: { onSignedIn: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    setProblem(null);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setBusy(false);
    if (error) {
      setProblem(error.message);
      return;
    }
    onSignedIn();
  };

  return (
    <Panel className="max-w-md p-5">
      <p className="text-[14px] font-semibold">Sign in</p>
      <p className="text-muted-foreground mt-1.5 text-[13px]">
        The same account you use everywhere else on the platform.
      </p>

      <div className="mt-4 space-y-2">
        <input
          className="border-border w-full rounded-md border px-3 py-2 text-[13.5px]"
          placeholder="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="border-border w-full rounded-md border px-3 py-2 text-[13.5px]"
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      {problem ? (
        <p className="text-bad mt-3 text-[13px]">{problem}</p>
      ) : null}

      <Button
        className="mt-4 rounded-full"
        size="sm"
        disabled={busy}
        onClick={() => void submit()}
      >
        Sign in
      </Button>
    </Panel>
  );
}
