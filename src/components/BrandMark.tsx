import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function BrandMark({
  href = "/",
  className,
  compact = false,
}: {
  href?: string;
  className?: string;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <Link href={href} className={cn("inline-flex items-center", className)}>
        <Image
          src="/brand/luxfabric-mark.svg"
          alt="LUXFABRIC"
          width={28}
          height={28}
          className="object-contain"
          priority
        />
      </Link>
    );
  }

  return (
    <Link href={href} className={cn("inline-flex items-center", className)}>
      <Image
        src="/brand/luxfabric-logo-clean.png"
        alt="LUXFABRIC TEXTILE"
        width={150}
        height={64}
        className="h-9 w-auto object-contain object-left"
        priority
      />
    </Link>
  );
}

export function BrandLogo({
  className,
  priority = false,
  onDark = false,
}: {
  className?: string;
  priority?: boolean;
  onDark?: boolean;
}) {
  return (
    <Image
      src={onDark ? "/brand/luxfabric-logo-on-dark.png" : "/brand/luxfabric-logo-clean.png"}
      alt="LUXFABRIC TEXTILE"
      width={640}
      height={640}
      className={cn("h-auto w-full object-contain", className)}
      priority={priority}
    />
  );
}
