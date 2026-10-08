import Image from "next/image";
import { cn } from "@/lib/utils";

export function BrandMark({ className, title = "Westayplace" }: { className?: string; title?: string }) {
  return (
    <Image
      src="/brand/westayplace-mark.png"
      alt={title}
      width={80}
      height={80}
      className={cn("shrink-0 rounded-xl object-contain", className)}
      priority
    />
  );
}
