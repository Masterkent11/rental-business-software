"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { Search } from "lucide-react";
import type { Workspace } from "@/domain/workspace/workspace";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PartnerSearch } from "./partner-search";

export function PartnerSearchControl({ workspace }: { workspace: Workspace }) {
  const pathname = usePathname();
  const trigger = useRef<HTMLButtonElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  const content = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const open = (event: KeyboardEvent) => {
      if (
        (event.metaKey || event.ctrlKey) &&
        !event.altKey &&
        event.key.toLowerCase() === "k" &&
        trigger.current?.getClientRects().length &&
        !document.querySelector('[aria-modal="true"]')
      ) {
        event.preventDefault();
        trigger.current.click();
      }
    };
    document.addEventListener("keydown", open);
    return () => document.removeEventListener("keydown", open);
  }, []);
  return (
    <>
      <div className="partner-inline-search">
        <PartnerSearch workspace={workspace} />
      </div>
      <Dialog key={pathname}>
        <DialogTrigger asChild>
          <button
            ref={trigger}
            type="button"
            className="partner-search-trigger focusable"
            aria-label="Open workspace search"
            aria-keyshortcuts="Meta+K Control+K"
          >
            <Search size={20} aria-hidden />
          </button>
        </DialogTrigger>
        <DialogContent
          ref={content}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            content.current?.querySelector("input")?.focus();
          }}
          className="partner-mobile-search"
          showCloseButton={false}
        >
          <div className="flex min-h-11 items-center justify-between gap-3">
            <DialogTitle>Search your workspace</DialogTitle>
            <DialogClose
              ref={close}
              className="focusable min-h-11 rounded-lg px-2 text-sm"
            >
              Cancel
            </DialogClose>
          </div>
          <DialogDescription className="sr-only">
            Find your authorized records and pages. Use arrow keys to choose a
            result.
          </DialogDescription>
          <PartnerSearch
            workspace={workspace}
            onNavigate={() => close.current?.click()}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
