import { flagEmoji, initials } from "@/lib/flags";
import { cn } from "@/lib/utils";

const SIZES = {
  sm: "size-8 text-[11px]",
  md: "size-10 text-xs",
  lg: "size-14 text-base",
  xl: "size-16 text-lg",
} as const;

/** Initials avatar tinted by tour, with the player's flag as a corner badge. */
export function PlayerAvatar({
  name,
  tour,
  country,
  size = "md",
  className,
}: {
  name: string;
  tour: string;
  country?: string;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const flag = country ? flagEmoji(country) : null;
  return (
    <span className={cn("relative inline-flex shrink-0", className)}>
      <span
        aria-hidden="true"
        className={cn(
          "inline-flex items-center justify-center rounded-full font-display font-bold tracking-wide ring-2",
          tour === "ATP"
            ? "bg-gradient-to-br from-atp/35 to-atp/10 text-atp ring-atp/40"
            : "bg-gradient-to-br from-wta/35 to-wta/10 text-wta ring-wta/40",
          SIZES[size],
        )}
      >
        {initials(name)}
      </span>
      {flag && (
        <span aria-hidden="true" className="absolute -bottom-0.5 -right-1 text-[0.9em] leading-none drop-shadow">
          {flag}
        </span>
      )}
    </span>
  );
}
