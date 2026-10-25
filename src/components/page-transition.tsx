"use client";

interface PageTransitionProps {
  children: React.ReactNode;
}

export function PageTransition({ children }: PageTransitionProps) {
  return <div className="flex min-h-0 flex-1 flex-col">{children}</div>;
}
