"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormError, readError } from "./form-error";

export function JoinLeagueForm({ inviteCode, needsPasscode }: { inviteCode?: string; needsPasscode?: boolean }) {
  const router = useRouter();
  const [code, setCode] = useState(inviteCode ?? "");
  const [passcode, setPasscode] = useState("");
  const [teamName, setTeamName] = useState("");

  const join = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/leagues/join", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ inviteCode: code, passcode: passcode || undefined, teamName }),
      });
      if (!res.ok) throw await readError(res);
      return (await res.json()) as { id: string };
    },
    onSuccess: ({ id }) => {
      router.push(`/leagues/${id}`);
      router.refresh();
    },
  });
  const err = join.error as { error?: string; details?: string[] } | null;

  return (
    <Card>
      <CardContent className="pt-5">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            join.mutate();
          }}
        >
          {!inviteCode && (
            <div className="space-y-2">
              <Label htmlFor="code">Invite code</Label>
              <Input id="code" required value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="e.g. K7M2QX9P" className="font-mono uppercase tracking-widest" />
            </div>
          )}
          {(needsPasscode || !inviteCode) && (
            <div className="space-y-2">
              <Label htmlFor="passcode">Passcode{needsPasscode ? "" : " (if the league has one)"}</Label>
              <Input id="passcode" required={needsPasscode} value={passcode} onChange={(e) => setPasscode(e.target.value)} autoComplete="off" />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="team">Your team name</Label>
            <Input id="team" required minLength={2} maxLength={40} value={teamName} onChange={(e) => setTeamName(e.target.value)} />
          </div>
          <FormError error={err?.error} details={err?.details} />
          <Button type="submit" className="w-full" disabled={join.isPending}>
            {join.isPending ? "Joining…" : "Join league"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
