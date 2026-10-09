"use client";

import { Eye, EyeOff } from "lucide-react";
import { useSessionStore } from "@/stores/use-session-store";
import { BrandMark } from "./brand";
import { Btn, Field, InlineError, TextInput } from "./ui";

export function SignIn() {
  const {
    signInEmail,
    signInPassword,
    showPassword,
    signInProblem,
    signInBusy,
    setSignInEmail,
    setSignInPassword,
    toggleShowPassword,
    submitSignIn,
  } = useSessionStore();

  return (
    <div className="grid min-h-dvh bg-background lg:grid-cols-[1fr_1.05fr]">
      <div className="flex flex-col px-6 py-10 sm:px-12">
        <div className="flex items-center gap-2.5">
          <BrandMark className="size-9" />
          <span className="text-[15px] font-bold tracking-tight">Westayplace</span>
        </div>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-12">
          <h1 className="text-[30px] font-bold tracking-tight">Welcome back</h1>
          <p className="mt-2 text-[14px] leading-relaxed text-muted">
            Sign in to manage properties, inquiries, viewings and client messages.
          </p>
          <form
            className="mt-8 flex flex-col gap-4"
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              void submitSignIn();
            }}
          >
            <Field label="Email" htmlFor="email">
              <TextInput
                id="email"
                type="email"
                inputMode="email"
                autoComplete="username"
                placeholder="you@company.com"
                value={signInEmail}
                onChange={(event) => setSignInEmail(event.target.value)}
                autoFocus
                required
              />
            </Field>
            <Field label="Password" htmlFor="password">
              <div className="relative">
                <TextInput
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Your password"
                  value={signInPassword}
                  onChange={(event) => setSignInPassword(event.target.value)}
                  className="pr-11"
                  required
                />
                <button
                  type="button"
                  onClick={toggleShowPassword}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="focusable absolute right-1.5 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
                </button>
              </div>
            </Field>
            <InlineError message={signInProblem} />
            <Btn type="submit" size="lg" busy={signInBusy} className="mt-2 w-full">
              {signInBusy ? "Signing in…" : "Sign in"}
            </Btn>
          </form>
          <p className="mt-6 text-[12.5px] leading-relaxed text-muted">
            Owners and agents use the same sign-in. After signing in you choose your workspace. Customers use the Westayplace mobile app.
          </p>
        </div>
        <p className="text-[12px] text-muted/80">© {new Date().getFullYear()} Westayplace</p>
      </div>
      <div className="relative hidden overflow-hidden bg-[#0A0F1D] lg:block">
        <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_85%_100%,#33202A_0%,transparent_55%),linear-gradient(140deg,#1E293B_0%,#0E1526_55%,#0A0F1D_100%)]" />
        <div className="relative flex h-full flex-col justify-end p-14 text-[#FAF7F2]">
          <BrandMark className="mb-10 size-20 opacity-95" />
          <p className="max-w-md text-[28px] font-semibold leading-tight tracking-tight">
            Publish a place in minutes. Answer guests the moment they write.
          </p>
          <p className="mt-4 max-w-md text-[14.5px] leading-relaxed text-[#FAF7F2]/70">
            Listings, photos, availability, bookings and conversations — one workspace, live with the customer app.
          </p>
        </div>
      </div>
    </div>
  );
}
