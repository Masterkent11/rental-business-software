"use client";

import { useAuthDraft } from "./use-auth-draft";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Check, Eye, EyeOff, Loader2 } from "lucide-react";
import {
  useEffect,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import { Btn } from "@/components/owner/ui";
import { useSessionStore } from "@/stores/use-session-store";

export const roleAssets = "/assets/Westayplace_1to1_Role_Selection_Assets%202";
export function AuthBrand({ light = false }: { light?: boolean }) {
  return (
    <Link
      href="/"
      className={`auth-brand${light ? " auth-brand-light" : ""}`}
      aria-label="Westayplace home"
    >
      <Image
        src="/assets/auth/westayplace-mark.svg"
        width={48}
        height={42}
        alt=""
        priority
      />
      <span>Westayplace</span>
    </Link>
  );
}
export function AuthSession({ children }: { children: ReactNode }) {
  const initialize = useSessionStore((s) => s.initialize);
  useEffect(() => {
    void initialize();
  }, [initialize]);
  return children;
}
export function AuthFrame({
  title,
  description,
  children,
  step,
  back,
}: {
  title: string;
  description: string;
  children: ReactNode;
  step?: number;
  back?: string;
}) {
  return (
    <main className="auth-screen">
      <div className="auth-photo" aria-hidden="true" />
      <section className="auth-panel">
        <div className="auth-top">
          <AuthBrand />
          <Link className="auth-top-link" href="/sign-in">
            Already have an account? <strong>Sign in</strong>
          </Link>
        </div>
        <div className="auth-mobile-heading">
          {back && (
            <Link className="auth-back" href={back} aria-label="Go back">
              <ArrowLeft />
            </Link>
          )}
          <AuthBrand light />
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        <div className="auth-form-surface">
          <div className="auth-desktop-heading">
            {step && <ProgressSteps step={step} />}
            <h1>{title}</h1>
            <p>{description}</p>
          </div>
          {children}
        </div>
      </section>
      <aside className="auth-promo" aria-label="Partner workspace">
        <div className="auth-promo-copy">
          <AuthBrand light />
          <h2>
            Publish a place
            <br />
            in minutes.
          </h2>
          <p>Answer guests the moment they write.</p>
          <div className="auth-promo-rule" />
          <p className="auth-promo-detail">
            Listings, photos, availability, bookings and conversations in one
            workspace.
          </p>
        </div>
        <div className="auth-property-preview" aria-hidden="true">
          <div />
          <strong>Modern villa</strong>
          <span>Property preview</span>
        </div>
      </aside>
    </main>
  );
}
export function ProgressSteps({ step }: { step: number }) {
  return (
    <div className="auth-progress" aria-label={`Step ${step} of 3`}>
      <span>{String(step).padStart(2, "0")} / 03</span>
      <div>
        {[1, 2, 3].map((n) => (
          <span key={n} className={n <= step ? "is-complete" : ""} />
        ))}
      </div>
    </div>
  );
}
export function AuthField({
  label,
  icon,
  error,
  labelAction,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  icon: ReactNode;
  error?: string;
  labelAction?: ReactNode;
}) {
  const generated = useId();
  const id = props.id ?? generated;
  const [visible, setVisible] = useAuthDraft(false);
  const password = props.type === "password";
  return (
    <div className="auth-field">
      <div className="auth-field-label">
        <label htmlFor={id}>{label}</label>
        {labelAction}
      </div>
      <div className="auth-input-wrap">
        <span className="auth-input-icon" aria-hidden="true">
          {icon}
        </span>
        <input
          {...props}
          id={id}
          type={password && visible ? "text" : props.type}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : props["aria-describedby"]}
        />
        {password && (
          <button
            type="button"
            className="auth-visibility"
            aria-label={visible ? "Hide password" : "Show password"}
            aria-pressed={visible}
            onClick={() => setVisible(!visible)}
          >
            {visible ? <EyeOff size={22} /> : <Eye size={22} />}
          </button>
        )}
      </div>
      {error && (
        <p className="auth-field-error" id={`${id}-error`}>
          {error}
        </p>
      )}
    </div>
  );
}
export function AuthSubmit({
  children,
  busy,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { busy?: boolean }) {
  return (
    <Btn {...props} type="submit" busy={busy} className="auth-submit">
      {children}
    </Btn>
  );
}
export function AuthError({ message }: { message: string | null }) {
  return message ? (
    <p className="auth-error" role="alert">
      {message}
    </p>
  ) : null;
}
export function AuthLoading({
  message = "Restoring your session…",
}: {
  message?: string;
}) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background px-6 text-center text-[14px] text-muted" role="status">
      <Loader2 className="animate-spin" size={24} />
      <p>{message}</p>
    </div>
  );
}
export function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" width="25" height="25" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2v5.1h6.6c3.8-3.5 6.1-8.7 6.1-15Z"
      />
      <path
        fill="#34A853"
        d="M24 44c5.5 0 10.1-1.8 13.5-4.9l-6.6-5.1c-1.8 1.2-4.1 1.9-6.9 1.9-5.3 0-9.8-3.6-11.4-8.4H5.8v5.3A20.4 20.4 0 0 0 24 44Z"
      />
      <path
        fill="#FBBC05"
        d="M12.6 27.5a12.2 12.2 0 0 1 0-7V15H5.8a20.3 20.3 0 0 0 0 18l6.8-5.5Z"
      />
      <path
        fill="#EA4335"
        d="M24 12.1c3 0 5.7 1 7.8 3.1l5.8-5.8A19.5 19.5 0 0 0 24 4 20.4 20.4 0 0 0 5.8 15l6.8 5.5c1.6-4.8 6.1-8.4 11.4-8.4Z"
      />
    </svg>
  );
}
export function SuccessMessage({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="auth-success">
      <span className="auth-success-icon">
        <Check />
      </span>
      <h2>{title}</h2>
      {children}
    </div>
  );
}
