"use client";
import { useEffect, useId, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, X, LoaderCircle, Command } from "lucide-react";
import type { Workspace } from "@/domain/workspace/workspace";
import type { PartnerSearchResult } from "@/domain/workspace/partner-shell";
import { usePartnerShell } from "./partner-branding";
export function PartnerSearch({
  workspace,
  onNavigate,
}: {
  workspace: Workspace;
  onNavigate?: () => void;
}) {
  const {
    query,
    results,
    searchBusy: busy,
    searchError: error,
    searchOpen: open,
    activeResult: active,
    search,
    setSearchOpen,
    setActiveResult,
  } = usePartnerShell();
  const id = useId(),
    root = useRef<HTMLDivElement>(null),
    input = useRef<HTMLInputElement>(null),
    router = useRouter();
  const eligible = query.trim().length >= 2;
  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setSearchOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [setSearchOpen]);
  useEffect(() => {
    if (active >= 0)
      document
        .getElementById(`${id}-${active}`)
        ?.scrollIntoView({ block: "nearest" });
  }, [active, id]);
  useEffect(() => {
    const focusSearch = (event: KeyboardEvent) => {
      if (
        (event.metaKey || event.ctrlKey) &&
        !event.altKey &&
        event.key.toLowerCase() === "k" &&
        !document.querySelector('[aria-modal="true"]') &&
        input.current?.getClientRects().length
      ) {
        event.preventDefault();
        input.current?.focus();
      }
    };
    document.addEventListener("keydown", focusSearch);
    return () => document.removeEventListener("keydown", focusSearch);
  }, []);
  function choose(item: PartnerSearchResult) {
    search("");
    setSearchOpen(false);
    onNavigate?.();
    router.push(item.href);
  }
  return (
    <div
      ref={root}
      className="partner-search"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          setSearchOpen(false);
      }}
    >
      <Search size={18} aria-hidden />
      <input
        ref={input}
        aria-label="Search this workspace"
        aria-keyshortcuts="Meta+K Control+K"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open && eligible}
        aria-controls={id}
        aria-activedescendant={active >= 0 ? `${id}-${active}` : undefined}
        placeholder={
          workspace.kind === "AGENT"
            ? "Search leads, clients, viewings..."
            : "Search properties, bookings, inquiries..."
        }
        maxLength={80}
        value={query}
        onChange={(event) => search(event.target.value)}
        onFocus={() => setSearchOpen(true)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setSearchOpen(false);
            setActiveResult(-1);
          }
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            setSearchOpen(true);
            setActiveResult(
              results.length
                ? active < 0
                  ? event.key === "ArrowDown"
                    ? 0
                    : results.length - 1
                  : (active +
                      (event.key === "ArrowDown" ? 1 : -1) +
                      results.length) %
                    results.length
                : -1,
            );
          }
          if (event.key === "Enter" && open && active >= 0 && results[active]) {
            event.preventDefault();
            choose(results[active]!);
          }
        }}
      />
      {query ? (
        <button
          type="button"
          aria-label="Clear workspace search"
          onClick={() => {
            search("");
            input.current?.focus();
          }}
        >
          <X size={16} aria-hidden />
        </button>
      ) : null}
      <kbd
        className="partner-search-shortcut"
        aria-hidden
        title="Command or Control K"
      >
        <Command size={14} />K
      </kbd>
      {open && eligible ? (
        <div className="partner-search-panel">
          <p className="partner-search-summary" role="status">
            {busy ? (
              <>
                <LoaderCircle className="animate-spin" size={14} aria-hidden />
                Searching your workspace…
              </>
            ) : error ? (
              "Workspace search unavailable"
            ) : results.length ? (
              `${results.length} results`
            ) : (
              "No matches. Try another keyword."
            )}
          </p>
          {error ? (
            <p role="alert" className="partner-search-error">
              {error} Your page shortcuts are still available.{" "}
              <button
                type="button"
                className="ml-2 underline"
                onClick={() => search(query)}
              >
                Try again
              </button>
            </p>
          ) : null}
          <ul id={id} role="listbox" aria-label="Workspace search results">
            {results.map((item, index) => (
              <li
                key={item.kind + item.id}
                id={`${id}-${index}`}
                role="option"
                aria-selected={active === index}
                onPointerMove={() => setActiveResult(index)}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(item)}
              >
                <span className="partner-search-kind">
                  {item.kind === "PAGE"
                    ? "Page"
                    : item.kind === "PROPERTY"
                      ? "Property"
                      : item.kind === "INQUIRY"
                        ? "Inquiry"
                        : item.kind === "CLIENT"
                          ? "Client"
                          : "Task"}
                </span>
                <strong>{item.title}</strong>
                <small>{item.subtitle}</small>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
