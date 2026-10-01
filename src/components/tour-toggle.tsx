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
    <div role="group" aria-label="Tour" className="inline-flex rounded-md bg-muted p-1">
      {OPTIONS.map((o) => (
        <Link
          key={o.value}
          href={href(o.value)}
          scroll={false}
          aria-pressed={value === o.value}
          className={cn(
            "rounded-sm px-3 py-1.5 text-sm font-semibold text-muted-foreground transition-colors",
            value === o.value && "bg-card text-foreground shadow-sm",
          )}
        >
          {o.label}
        </Link>
      ))}
    </div>
  );
}
