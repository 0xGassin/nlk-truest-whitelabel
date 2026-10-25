"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const items = [
  {
    href: "/assets/domains",
    title: "Domains",
  },
  {
    href: "/assets/lookalikes",
    title: "Lookalikes",
  },
  {
    href: "/assets/emails",
    title: "Emails",
  },
];

export function AssetsNav({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
  const pathname = usePathname();

  return (
    <nav className={cn("w-full border-b", className)} {...props}>
      <div className="flex items-center gap-6 px-6">
        {items.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              className={cn(
                "relative py-3 text-sm font-normal tracking-[-0.01em] transition-colors hover:text-foreground",
                isActive ? "text-primary" : "text-muted-foreground",
              )}
              href={item.href}
              key={item.href}
            >
              {item.title}
              {isActive ? (
                <motion.div
                  className="absolute inset-x-0 bottom-0 -mb-[1px] h-[2px] bg-primary"
                  layoutId="assets-nav-underline"
                  transition={{ bounce: 0.2, duration: 0.6, type: "spring" }}
                />
              ) : null}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
