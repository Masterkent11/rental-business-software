import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Photography with an honest failure mode, mirroring the Flutter `AppImage`.
 *
 * The shell has no media pipeline yet, so images are remote. A warm tonal panel
 * sits underneath every one of them, which means a failed load degrades to
 * something intentional rather than to a broken-image glyph.
 */
export function Photo({
  src,
  alt,
  className,
  priority,
  sizes = "100vw",
}: {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
  sizes?: string;
}) {
  return (
    <div className={cn("relative overflow-hidden bg-secondary", className)}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        className="object-cover"
        unoptimized
      />
    </div>
  );
}
