import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const SURFACE = {
  HARD: { label: "Hard", variant: "hard" },
  CLAY: { label: "Clay", variant: "clay" },
  GRASS: { label: "Grass", variant: "grass" },
} as const;

export function SurfaceBadge({ surface }: { surface: string }) {
  const s = SURFACE[surface as keyof typeof SURFACE] ?? SURFACE.HARD;
  return <Badge variant={s.variant}>{s.label}</Badge>;
}

export function TourBadge({ tour }: { tour: string }) {
  return (
    <span
      className={cn(
        "inline-flex rounded border px-1.5 text-[11px] font-bold leading-5 tracking-wide",
        tour === "ATP" ? "border-atp/40 text-atp" : "border-wta/40 text-wta",
      )}
    >
      {tour}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  if (status === "LIVE") return <LiveBadge />;
  if (status === "COMPLETED") return <Badge variant="muted">Completed</Badge>;
  return <Badge variant="outline">Upcoming</Badge>;
}

export function LiveBadge({ label = "Live" }: { label?: string }) {
  return (
    <Badge variant="live">
      <span className="size-1.5 animate-pulse-dot rounded-full bg-live-foreground" aria-hidden="true" />
      {label}
    </Badge>
  );
}

export function CategoryLabel({ category }: { category: string }) {
  return (
    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {category === "GRAND_SLAM" ? "Grand Slam" : "Masters 1000"}
    </span>
  );
}

export function FormGuide({ form }: { form: string }) {
  if (!form) return <span className="text-xs text-muted-foreground">No matches</span>;
  return (
    <span className="inline-flex gap-0.5" aria-label={`Recent form ${form}`}>
      {[...form.slice(0, 5)].map((r, i) => (
        <span
          key={i}
          className={cn(
            "inline-flex size-5 items-center justify-center rounded text-[10px] font-bold",
            r === "W" ? "bg-grass text-grass-foreground" : "bg-muted text-muted-foreground",
          )}
        >
          {r}
        </span>
      ))}
    </span>
  );
}
