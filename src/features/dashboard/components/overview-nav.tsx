"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const items = [
  {
    href: "/findings",
    title: "Overview",
  },
  {
    href: "/dashboard",
    title: "Dashboard",
  },
  {
    href: "#",
    title: "Checks",
  },
];

export function OverviewNav({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
  const pathname = usePathname();

  return (
    <nav className={cn("w-full border-b", className)} {...props}>
      <div className="flex items-center gap-6 px-6">
        {items.map((item) => {
          const isActive = pathname === item.href || (item.href !== "#" && pathname.startsWith(`${item.href}/`));

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
                  layoutId="overview-nav-underline"
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
