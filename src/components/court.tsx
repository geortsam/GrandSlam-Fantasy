import { cn } from "@/lib/utils";

const SURFACE_FILL: Record<string, { court: string; apron: string }> = {
  HARD: { court: "hsl(214 70% 38%)", apron: "hsl(214 60% 24%)" },
  CLAY: { court: "hsl(18 70% 42%)", apron: "hsl(18 60% 30%)" },
  GRASS: { court: "hsl(140 45% 32%)", apron: "hsl(140 40% 22%)" },
};

/**
 * Top-down tennis court drawn to scale (doubles court 36ft x 78ft, rotated so
 * the net runs vertically). Children are laid over it.
 */
export function Court({
  surface = "HARD",
  className,
  children,
}: {
  surface?: string;
  className?: string;
  children?: React.ReactNode;
}) {
  const fill = SURFACE_FILL[surface] ?? SURFACE_FILL.HARD;
  return (
    <div className={cn("relative overflow-hidden rounded-2xl", className)}>
      <svg
        viewBox="0 0 100 52"
        preserveAspectRatio="none"
        className="absolute inset-0 size-full"
        aria-hidden="true"
      >
        <rect width="100" height="52" fill={fill.apron} />
        {/* Mowing / brush stripes */}
        {Array.from({ length: 10 }).map((_, i) => (
          <rect key={i} x={i * 10} y="0" width="5" height="52" fill="white" opacity="0.025" />
        ))}
        <rect x="8" y="4" width="84" height="44" fill={fill.court} />
        <g stroke="white" strokeOpacity="0.85" strokeWidth="0.45" fill="none">
          <rect x="8" y="4" width="84" height="44" />
          {/* Singles sidelines */}
          <line x1="8" y1="9.5" x2="92" y2="9.5" />
          <line x1="8" y1="42.5" x2="92" y2="42.5" />
          {/* Service lines and centre service line */}
          <line x1="30" y1="9.5" x2="30" y2="42.5" />
          <line x1="70" y1="9.5" x2="70" y2="42.5" />
          <line x1="30" y1="26" x2="70" y2="26" />
          {/* Centre marks */}
          <line x1="8" y1="26" x2="9.2" y2="26" />
          <line x1="90.8" y1="26" x2="92" y2="26" />
        </g>
        {/* Net */}
        <line x1="50" y1="2.5" x2="50" y2="49.5" stroke="white" strokeWidth="0.9" />
        <line x1="50" y1="2.5" x2="50" y2="49.5" stroke="black" strokeOpacity="0.35" strokeWidth="0.3" strokeDasharray="0.6 0.6" />
      </svg>
      <div className="relative">{children}</div>
    </div>
  );
}

/** Decorative perspective court for hero banners. */
export function CourtPerspective({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 600 320" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="cp-fade" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="white" stopOpacity="0" />
          <stop offset="1" stopColor="white" stopOpacity="0.55" />
        </linearGradient>
      </defs>
      <g stroke="url(#cp-fade)" strokeWidth="2" fill="none">
        <polygon points="170,40 430,40 590,310 10,310" />
        <line x1="205" y1="40" x2="70" y2="310" />
        <line x1="395" y1="40" x2="530" y2="310" />
        <line x1="190" y1="110" x2="410" y2="110" />
        <line x1="120" y1="230" x2="480" y2="230" />
        <line x1="300" y1="110" x2="300" y2="230" />
        <line x1="150" y1="165" x2="450" y2="165" strokeWidth="4" />
      </g>
    </svg>
  );
}
