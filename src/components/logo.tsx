export function Logo() {
  return (
    <span className="flex items-center gap-2">
      <svg viewBox="0 0 32 32" className="size-8 drop-shadow-[0_0_10px_hsl(var(--primary)/0.45)]" aria-hidden="true">
        <circle cx="16" cy="16" r="15" className="fill-primary" />
        <path
          d="M5 8c6 4 6 12 0 16M27 8c-6 4-6 12 0 16"
          className="stroke-primary-foreground"
          strokeWidth="2.2"
          fill="none"
          strokeLinecap="round"
        />
      </svg>
      <span className="font-display text-xl font-extrabold uppercase italic leading-none tracking-tight">
        GrandSlam<span className="text-primary"> Fantasy</span>
      </span>
    </span>
  );
}
