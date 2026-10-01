"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/leagues", label: "Leagues" },
  { href: "/players", label: "Players" },
  { href: "/tournaments", label: "Tournaments" },
];

function useActive() {
  const pathname = usePathname();
  return (href: string) => pathname === href || pathname.startsWith(`${href}/`);
}

export function NavLinks() {
  const isActive = useActive();
  return (
    <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
      {LINKS.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          aria-current={isActive(l.href) ? "page" : undefined}
          className={cn(
            "rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
            isActive(l.href) && "bg-muted text-foreground",
          )}
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );
}

/** Bottom-of-header scrolling tab bar for small screens. */
export function MobileNav() {
  const isActive = useActive();
  return (
    <nav className="flex gap-1 overflow-x-auto border-t px-2 py-1.5 md:hidden" aria-label="Main">
      {LINKS.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          aria-current={isActive(l.href) ? "page" : undefined}
          className={cn(
            "shrink-0 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground",
            isActive(l.href) && "bg-muted text-foreground",
          )}
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
