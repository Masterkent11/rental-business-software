import { Suspense } from "react";
import { MarketingHub } from "@/components/marketing/marketing-hub";
export default function MarketingPage() {
  return (
    <Suspense fallback={<p className="p-8 text-sm">Loading Marketing Hub…</p>}>
      <MarketingHub />
    </Suspense>
  );
}
