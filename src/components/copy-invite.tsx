"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export function CopyInvite({ code }: { code: string }) {
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);
  useEffect(() => setOrigin(window.location.origin), []);
  const link = `${origin}/join/${code}`;
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded-md bg-muted px-3 py-2 text-sm">{link}</code>
        <Button
          variant="outline"
          size="icon"
          aria-label="Copy invite link"
          onClick={async () => {
            await navigator.clipboard.writeText(link);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
        >
          {copied ? <Check /> : <Copy />}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Invite code <span className="font-mono font-semibold tracking-widest text-foreground">{code}</span>
      </p>
    </div>
  );
}
