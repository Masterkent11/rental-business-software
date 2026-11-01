"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
export function SearchResultFocus() {
  const pathname = usePathname();
  useEffect(() => {
    let observer: MutationObserver | undefined;
    const focus = () => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      if (!/^search-(client|task)-[a-f0-9-]+$/.test(id)) return true;
      const target = document.getElementById(id);
      if (!target) return false;
      target.scrollIntoView({ block: "center" });
      target.setAttribute("tabindex", "-1");
      target.focus({ preventScroll: true });
      return true;
    };
    const check = () => {
      if (focus()) observer?.disconnect();
    };
    if (!focus()) {
      observer = new MutationObserver(check);
      observer.observe(document.body, { childList: true, subtree: true });
    }
    window.addEventListener("hashchange", check);
    const timer = setTimeout(() => observer?.disconnect(), 20000);
    return () => {
      observer?.disconnect();
      clearTimeout(timer);
      window.removeEventListener("hashchange", check);
    };
  }, [pathname]);
  return null;
}
