"use client";

import { Menu } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { BrandWordmark } from "@/components/brand";
import { Button } from "@/components/ui/button";

interface AuthLayoutProps {
  children: React.ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="relative min-h-screen w-full bg-background text-foreground">
      <div className="grid min-h-screen w-full lg:grid-cols-2">
        {/* Left Side: Form */}
        <div className="relative flex flex-col p-6 sm:px-12 lg:px-16 xl:px-24">
          {/* Header */}
          <div className="flex items-center justify-between">
            <Link className="flex items-center gap-2" href="/">
              <BrandWordmark className="h-6 w-auto" priority />
            </Link>
            <Button aria-label="Menu" className="lg:hidden" size="icon-sm" variant="ghost">
              <Menu className="size-5" />
            </Button>
          </div>

          {/* Form Content */}
          <div className="flex flex-1 flex-col items-center justify-center py-8">
            <div className="animate-in fade-in slide-in-from-bottom-2 w-full max-w-[380px] duration-500">
              {children}
            </div>
          </div>
        </div>

        {/* Right Side: Decorative Image */}
        <div className="relative hidden overflow-hidden rounded-l-2xl lg:block">
          <Image alt="" className="absolute inset-0 size-full object-cover" fill priority sizes="50vw" src="/login-hero.png" />
        </div>
      </div>
    </div>
  );
}
