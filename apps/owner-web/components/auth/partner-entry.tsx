"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { hasPartnerVisit } from "@/infrastructure/auth/partner-onboarding-storage";
import { AuthLoading } from "./auth-layout";

export function PartnerEntry({ setup = false }: { setup?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  useEffect(() => {
    const path = pathname + (params.toString() ? `?${params}` : "");
    const destination =
      !setup && hasPartnerVisit() ? "/sign-in" : "/onboarding/role";
    router.replace(`${destination}?returnTo=${encodeURIComponent(path)}`);
  }, [router, pathname, params, setup]);
  return <AuthLoading message="Opening your workspace…" fullPage />;
}
