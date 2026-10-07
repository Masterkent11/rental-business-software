import Image from "next/image";
import { cn } from "@/lib/utils";

export function Photo({
  src,
  alt,
  className,
  sizes = "200px",
  priority = false,
}: {
  src: string;
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
}) {
  return (
    <span className={cn("relative block overflow-hidden", className)}>
      <Image src={src} alt={alt} fill sizes={sizes} unoptimized priority={priority} className="object-cover" />
    </span>
  );
}
