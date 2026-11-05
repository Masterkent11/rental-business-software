import Image, { type ImageProps } from "next/image";
import { cn } from "@/lib/utils";

export function Photo({
  src,
  alt,
  className,
  sizes = "200px",
  priority = false,
  onError,
}: {
  src: string;
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
  onError?: ImageProps["onError"];
}) {
  return (
    <span className={cn("relative block overflow-hidden", className)}>
      <Image src={src} alt={alt} fill sizes={sizes} unoptimized priority={priority} className="object-cover" onError={onError} />
    </span>
  );
}
