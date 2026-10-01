"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: "ATP", label: "ATP" },
  { value: "WTA", label: "WTA" },
  { value: "ALL", label: "Mixed" },
];

/** Segmented ATP / WTA / Mixed switch that keeps the rest of the query string. */
export function TourToggle({ value }: { value: string }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const href = (tour: string) => {
    const next = new URLSearchParams(params.toString());
    next.set("tour", tour);
    return `${pathname}?${next.toString()}`;
  };
  return (
    <div role="group" aria-label="Tour" className="inline-flex rounded-full border bg-card p-1">
      {OPTIONS.map((o) => (
        <Link
          key={o.value}
          href={href(o.value)}
          scroll={false}
          aria-pressed={value === o.value}
          className={cn(
            "rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground",
            value === o.value && "bg-primary text-primary-foreground hover:text-primary-foreground",
          )}
        >
          {o.label}
        </Link>
      ))}
    </div>
  );
}
