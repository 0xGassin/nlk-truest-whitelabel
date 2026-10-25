import Image from "next/image";

import { cn } from "@/lib/utils";

/**
 * Truest brand marks.
 *
 * The brand ships a separate mark for light and for dark backgrounds rather
 * than one mark that can be recoloured, so both are rendered and the theme
 * variant hides one. Picking a file from a JavaScript theme value instead
 * would flash the wrong mark on first paint, because the theme class is
 * applied by an inline script before hydration.
 *
 * Only one of the pair is ever displayed, so both carry the same alt text and
 * the hidden one is dropped from the accessibility tree along with its box.
 */

const WORDMARK_RATIO = { height: 448, width: 2400 };
const ICON_RATIO = { height: 1000, width: 1000 };

interface BrandProps {
  className?: string;
  priority?: boolean;
}

/** Full horizontal lockup: icon plus "Truest". */
export function BrandWordmark({ className, priority = false }: BrandProps) {
  return (
    <>
      <Image
        alt="Truest"
        className={cn("dark:hidden", className)}
        priority={priority}
        src="/brand/truest-horizontal-light.svg"
        {...WORDMARK_RATIO}
      />
      <Image
        alt="Truest"
        className={cn("hidden dark:block", className)}
        priority={priority}
        src="/brand/truest-horizontal-dark.svg"
        {...WORDMARK_RATIO}
      />
    </>
  );
}

/** Square app mark, for tight spaces where the wordmark will not fit. */
export function BrandIcon({ className, priority = false }: BrandProps) {
  return (
    <>
      <Image
        alt="Truest"
        className={cn("dark:hidden", className)}
        priority={priority}
        src="/brand/truest-icon-light.svg"
        {...ICON_RATIO}
      />
      <Image
        alt="Truest"
        className={cn("hidden dark:block", className)}
        priority={priority}
        src="/brand/truest-icon-dark.svg"
        {...ICON_RATIO}
      />
    </>
  );
}
