"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { LogOut, Trophy, User } from "lucide-react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function UserMenu({ name, email }: { name?: string | null; email?: string | null }) {
  const label = name ?? email ?? "Account";
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Button variant="outline" size="sm" aria-label="Account menu">
          <User />
          <span className="hidden max-w-[10rem] truncate sm:inline">{label}</span>
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          className="z-50 min-w-48 rounded-md border bg-card p-1 text-card-foreground shadow-lg"
        >
          <div className="px-2 py-1.5 text-xs text-muted-foreground">{email}</div>
          <DropdownMenu.Item asChild>
            <Link href="/dashboard" className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none data-[highlighted]:bg-muted">
              <Trophy className="size-4" /> My leagues
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Item
            onSelect={() => signOut({ callbackUrl: "/" })}
            className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none data-[highlighted]:bg-muted"
          >
            <LogOut className="size-4" /> Sign out
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
