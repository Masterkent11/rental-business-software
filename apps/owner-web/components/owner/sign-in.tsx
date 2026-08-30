"use client";

import { Button } from "@/components/ui/button";
import { useSessionStore } from "@/stores/use-session-store";
import { Building2, ArrowRight, Loader2, AlertCircle } from "lucide-react";

/**
 * Sign-in component.
 *
 * Rules:
 * - NO direct @supabase/supabase-js call in UI.
 * - Dispatches to useSessionStore.submitSignIn() which delegates through Application Use Cases.
 */
export function SignIn({ onSignedIn }: { onSignedIn?: () => void }) {
  const {
    signInEmail,
    signInPassword,
    signInProblem,
    signInBusy,
    setSignInEmail,
    setSignInPassword,
    submitSignIn,
  } = useSessionStore();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitSignIn(onSignedIn);
  };

  return (
    <div className="w-full max-w-[400px] animate-in fade-in zoom-in-95 duration-500">
      <div className="flex flex-col items-center mb-8">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-accent to-accent-soft text-white shadow-xl shadow-accent/20 mb-4">
          <Building2 className="h-8 w-8" strokeWidth={1.5} />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Welcome back
        </h1>
        <p className="text-sm text-muted-foreground mt-2 text-center">
          Sign in to your owner workspace to manage properties, listings, and tenants.
        </p>
      </div>

      <div className="rounded-3xl border border-border/60 bg-surface/80 p-6 md:p-8 shadow-2xl backdrop-blur-xl">
        <form onSubmit={submit} className="flex flex-col gap-5">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground/80 ml-1">
                Email Address
              </label>
              <input
                className="flex h-11 w-full rounded-xl border border-border/80 bg-surface-secondary/50 px-4 py-2 text-sm text-foreground transition-colors placeholder:text-muted-foreground/60 focus-visible:border-accent focus-visible:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/20"
                placeholder="owner@example.com"
                type="email"
                value={signInEmail}
                autoComplete="email"
                onChange={(e) => setSignInEmail(e.target.value)}
                disabled={signInBusy}
              />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground/80 ml-1">
                Password
              </label>
              <input
                className="flex h-11 w-full rounded-xl border border-border/80 bg-surface-secondary/50 px-4 py-2 text-sm text-foreground transition-colors placeholder:text-muted-foreground/60 focus-visible:border-accent focus-visible:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/20"
                placeholder="••••••••"
                type="password"
                value={signInPassword}
                autoComplete="current-password"
                onChange={(e) => setSignInPassword(e.target.value)}
                disabled={signInBusy}
              />
            </div>
          </div>

          {signInProblem ? (
            <div className="flex items-center gap-2 rounded-xl bg-rose-500/10 p-3 text-sm text-rose-500 animate-in slide-in-from-top-2 duration-300">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <p>{signInProblem}</p>
            </div>
          ) : null}

          <Button
            type="submit"
            disabled={signInBusy}
            className="mt-2 h-11 w-full rounded-xl bg-accent text-white hover:bg-accent/90 shadow-md shadow-accent/20 group transition-all"
          >
            {signInBusy ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              <>
                Sign in to Workspace
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
