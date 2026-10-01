export function Logo() {
  return (
    <span className="flex items-center gap-2">
      <svg viewBox="0 0 32 32" className="size-7" aria-hidden="true">
        <circle cx="16" cy="16" r="15" className="fill-primary" />
        <path
          d="M5 8c6 4 6 12 0 16M27 8c-6 4-6 12 0 16"
          className="stroke-primary-foreground"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />
      </svg>
      <span className="font-display text-lg font-bold uppercase tracking-wide">
        GrandSlam<span className="text-accent"> Fantasy</span>
      </span>
    </span>
  );
}
