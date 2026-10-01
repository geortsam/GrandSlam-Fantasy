import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";
import { isDemoData } from "@/lib/tennis";
import { Logo } from "./logo";
import { MobileNav, NavLinks } from "./nav-links";
import { ThemeToggle } from "./theme-toggle";
import { UserMenu } from "./user-menu";

export async function SiteHeader() {
  const user = await getCurrentUser();
  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75">
      <div className="container flex h-14 items-center gap-4">
        <Link href={user ? "/dashboard" : "/"} className="flex items-center gap-2" aria-label="GrandSlam Fantasy home">
          <Logo />
        </Link>
        <NavLinks />
        <div className="ml-auto flex items-center gap-1.5">
          {isDemoData() && (
            <span className="hidden rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground md:inline">
              Demo data
            </span>
          )}
          <ThemeToggle />
          {user ? (
            <UserMenu name={user.name} email={user.email} />
          ) : (
            <Button asChild size="sm">
              <Link href="/signin">Sign in</Link>
            </Button>
          )}
        </div>
      </div>
      <MobileNav />
    </header>
  );
}
