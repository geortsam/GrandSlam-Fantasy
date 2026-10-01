import { cn } from "@/lib/utils";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-4", className)}>
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.16em] text-primary">{eyebrow}</p>
        )}
        <h1 className="font-display text-4xl font-extrabold uppercase leading-none tracking-tight md:text-5xl">
          {title}
        </h1>
        {description && <div className="mt-2 text-muted-foreground">{description}</div>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function StatTile({
  label,
  value,
  sub,
  tone = "default",
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  tone?: "default" | "primary";
}) {
  return (
    <div
      className={cn(
        "rounded-xl border p-4 edge-glow",
        tone === "primary" ? "border-primary/40 bg-primary/10" : "bg-card",
      )}
    >
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-3xl font-extrabold tabular-nums leading-none">{value}</p>
      {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

export function SectionTitle({ children, aside }: { children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h2 className="flex items-center gap-3 font-display text-2xl font-extrabold uppercase tracking-tight">
        <span className="h-6 w-1.5 rounded-full bg-primary" aria-hidden="true" />
        {children}
      </h2>
      {aside}
    </div>
  );
}
