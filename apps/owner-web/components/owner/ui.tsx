"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle, Inbox, Loader2, RotateCw } from "lucide-react";
import { cn } from "@/lib/utils";

export function Btn({
  children,
  variant = "primary",
  size = "md",
  busy = false,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "outline";
  size?: "sm" | "md" | "lg";
  busy?: boolean;
}) {
  return (
    <button
      {...props}
      disabled={props.disabled || busy}
      aria-busy={busy || undefined}
      className={cn(
        "focusable inline-flex items-center justify-center gap-1.5 rounded-xl font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary" && "bg-foreground text-white hover:bg-foreground/85",
        variant === "secondary" && "bg-surface-secondary text-foreground hover:bg-surface-tertiary",
        variant === "outline" && "border border-border bg-surface text-foreground hover:bg-surface-secondary",
        variant === "ghost" && "text-foreground hover:bg-surface-secondary",
        variant === "danger" && "bg-danger-soft text-danger hover:bg-danger/15",
        size === "sm" && "h-8 px-3 text-[12.5px]",
        size === "md" && "h-10 px-4 text-[13.5px]",
        size === "lg" && "h-11 px-5 text-[14.5px]",
        className,
      )}
    >
      {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
      {children}
    </button>
  );
}

export function LinkBtn({
  href,
  children,
  variant = "primary",
  size = "md",
  className,
}: {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "focusable inline-flex items-center justify-center gap-1.5 rounded-xl font-medium transition-colors",
        variant === "primary" && "bg-foreground text-white hover:bg-foreground/85",
        variant === "secondary" && "bg-surface-secondary text-foreground hover:bg-surface-tertiary",
        variant === "outline" && "border border-border bg-surface text-foreground hover:bg-surface-secondary",
        variant === "ghost" && "text-foreground hover:bg-surface-secondary",
        size === "sm" && "h-8 px-3 text-[12.5px]",
        size === "md" && "h-10 px-4 text-[13.5px]",
        size === "lg" && "h-11 px-5 text-[14.5px]",
        className,
      )}
    >
      {children}
    </Link>
  );
}

export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("rounded-2xl border border-border bg-surface", className)}>{children}</div>;
}

export function Field({
  label,
  hint,
  error,
  htmlFor,
  children,
  className,
}: {
  label: string;
  hint?: string;
  error?: string | undefined;
  htmlFor: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-[12.5px] font-semibold text-foreground">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} className="text-[12px] text-danger">
          {error}
        </p>
      ) : hint ? (
        <p className="text-[12px] text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

const inputClass =
  "focusable w-full rounded-xl border border-border bg-surface px-3.5 text-[14px] text-foreground placeholder:text-muted/70 transition-colors hover:border-foreground/25 aria-[invalid=true]:border-danger";

export function TextInput({
  id,
  error,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { id: string; error?: string | undefined }) {
  return (
    <input
      id={id}
      aria-invalid={error ? true : undefined}
      aria-describedby={error ? `${id}-error` : undefined}
      {...props}
      className={cn(inputClass, "h-11", className)}
    />
  );
}

export function TextArea({
  id,
  error,
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { id: string; error?: string | undefined }) {
  return (
    <textarea
      id={id}
      aria-invalid={error ? true : undefined}
      aria-describedby={error ? `${id}-error` : undefined}
      {...props}
      className={cn(inputClass, "min-h-28 py-3 leading-relaxed", className)}
    />
  );
}

export function Select({
  id,
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { id: string }) {
  return (
    <select id={id} {...props} className={cn(inputClass, "h-11 appearance-none pr-8", className)}>
      {children}
    </select>
  );
}

export function Badge({
  tone = "neutral",
  children,
  className,
}: {
  tone?: "neutral" | "ok" | "bad" | "pending" | "info" | "dark";
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11.5px] font-semibold",
        tone === "neutral" && "bg-surface-secondary text-muted",
        tone === "ok" && "bg-success-soft text-success",
        tone === "bad" && "bg-danger-soft text-danger",
        tone === "pending" && "bg-warning-soft text-warning",
        tone === "info" && "bg-[#eef4ff] text-[#1d4ed8]",
        tone === "dark" && "bg-foreground text-white",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="partner-empty-state flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-surface-secondary text-muted">
        {icon ?? <Inbox className="size-5" aria-hidden />}
      </div>
      <h3 className="text-[15px] font-semibold text-foreground">{title}</h3>
      <p className="mt-1 max-w-sm text-[13px] leading-relaxed text-muted">{body}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="partner-error-state flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className="mb-3 flex size-11 items-center justify-center rounded-2xl bg-danger-soft text-danger">
        <AlertTriangle className="size-5" aria-hidden />
      </div>
      <p className="max-w-sm text-[13.5px] text-foreground">{message}</p>
      {onRetry ? (
        <Btn variant="outline" size="sm" className="mt-4" onClick={onRetry}>
          <RotateCw className="size-3.5" aria-hidden /> Try again
        </Btn>
      ) : null}
    </div>
  );
}

export function InlineError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div role="alert" className="flex items-start gap-2 rounded-xl bg-danger-soft px-3.5 py-2.5 text-[13px] text-danger">
      <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>{message}</span>
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-surface-secondary", className)} />;
}

export function SkeletonRows({ rows = 5 }: { rows?: number }) {
  return (
    <div className="divide-y divide-border" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-4">
          <Skeleton className="size-12 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function Stat({
  label,
  value,
  hint,
  href,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  href?: string;
}) {
  const content = (
    <>
      <p className="text-[12px] font-medium text-muted">{label}</p>
      <p className="tabular mt-1.5 text-[26px] font-semibold tracking-tight text-foreground">{value}</p>
      {hint ? <p className="mt-1 text-[12px] text-muted">{hint}</p> : null}
    </>
  );
  return href ? (
    <Link href={href} className="focusable block rounded-2xl border border-border bg-surface p-5 transition-colors hover:border-foreground/20">
      {content}
    </Link>
  ) : (
    <div className="rounded-2xl border border-border bg-surface p-5">{content}</div>
  );
}

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  tone = "primary",
  busy,
  error,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  tone?: "primary" | "danger";
  busy?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-4 backdrop-blur-[2px] sm:items-center" role="presentation" onClick={onCancel}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key === "Escape") onCancel();
        }}
      >
        <h2 id="confirm-title" className="text-[16px] font-semibold text-foreground">
          {title}
        </h2>
        <p className="mt-2 text-[13.5px] leading-relaxed text-muted">{body}</p>
        {error ? <div className="mt-4"><InlineError message={error} /></div> : null}
        <div className="mt-6 flex justify-end gap-2">
          <Btn variant="ghost" onClick={onCancel} autoFocus>
            Cancel
          </Btn>
          <Btn variant={tone === "danger" ? "danger" : "primary"} busy={busy ?? false} onClick={onConfirm}>
            {confirmLabel}
          </Btn>
        </div>
      </div>
    </div>
  );
}

export function SegmentedTabs<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: readonly { value: T; label: string; count?: number }[];
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div role="tablist" aria-label={label} className="partner-tabs flex flex-wrap gap-1 rounded-xl bg-surface-secondary p-1">
      {options.map((option) => (
        <button
          key={option.value}
          role="tab"
          aria-selected={value === option.value}
          tabIndex={value === option.value ? 0 : -1}
          onKeyDown={(event) => {
            const index = options.indexOf(option);
            const next = event.key === "ArrowRight" ? (index + 1) % options.length
              : event.key === "ArrowLeft" ? (index - 1 + options.length) % options.length
              : event.key === "Home" ? 0 : event.key === "End" ? options.length - 1 : null;
            if (next === null) return;
            event.preventDefault();
            const target = event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>("[role=tab]")[next];
            target?.focus();
            target?.scrollIntoView({ block: "nearest", inline: "nearest" });
            onChange(options[next]!.value);
          }}
          onClick={() => onChange(option.value)}
          className={cn(
            "focusable rounded-lg px-3 py-1.5 text-[12.5px] font-medium transition-colors",
            value === option.value ? "bg-surface text-foreground shadow-xs" : "text-muted hover:text-foreground",
          )}
        >
          {option.label}
          {option.count !== undefined ? <span className="ml-1.5 tabular text-muted">{option.count}</span> : null}
        </button>
      ))}
    </div>
  );
}
