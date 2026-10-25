import Link from "next/link";

import { BrandIcon } from "@/components/brand";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-center bg-background px-6 text-center text-foreground">
      <div aria-label="404" className="flex items-center gap-[clamp(1rem,3vw,2.5rem)]" role="img">
        <span className="font-sans text-[clamp(8rem,24vw,16rem)] leading-none font-medium tracking-[-0.12em]">4</span>
        <BrandIcon
          className="size-[clamp(7rem,18vw,12rem)] rounded-[22%] object-contain motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95 motion-safe:duration-500 motion-reduce:animate-none"
          priority
        />
        <span className="-translate-x-1 font-sans text-[clamp(8rem,24vw,16rem)] leading-none font-medium tracking-[-0.12em]">
          4
        </span>
      </div>
      <p className="motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:delay-150 motion-safe:duration-500 mt-5 text-sm text-muted-foreground">
        The page you are looking for doesn&apos;t exist.
      </p>
      <Button
        asChild
        className="motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:delay-300 motion-safe:duration-500 mt-6"
        variant="outline"
      >
        <Link href="/">Go back</Link>
      </Button>
    </main>
  );
}
