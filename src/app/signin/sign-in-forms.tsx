"use client";

import { Mail } from "lucide-react";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ProviderInfo {
  id: string;
  name: string;
  type: string;
}

const ERRORS: Record<string, string> = {
  CredentialsSignin: "Enter a valid email address.",
  OAuthAccountNotLinked: "That email is already linked to another sign-in method.",
  Default: "Sign-in failed. Please try again.",
};

export function SignInForms({
  providers,
  callbackUrl,
  demo,
  error,
}: {
  providers: ProviderInfo[];
  callbackUrl: string;
  demo: boolean;
  error?: string;
}) {
  const [email, setEmail] = useState("");
  const [demoEmail, setDemoEmail] = useState("demo@grandslam.local");
  const [pending, setPending] = useState(false);
  const oauth = providers.filter((p) => p.type === "oauth");
  const hasEmail = providers.some((p) => p.id === "email");

  return (
    <div className="space-y-6">
      {error && (
        <p role="alert" className="rounded-md border border-destructive/40 p-3 text-sm text-negative">
          {ERRORS[error] ?? ERRORS.Default}
        </p>
      )}

      {oauth.length > 0 && (
        <div className="grid gap-2">
          {oauth.map((p) => (
            <Button key={p.id} variant="outline" onClick={() => signIn(p.id, { callbackUrl })}>
              {p.id === "github" ? <GitHubMark /> : <GoogleMark />}
              Continue with {p.name}
            </Button>
          ))}
        </div>
      )}

      {hasEmail && (
        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            setPending(true);
            signIn("email", { email, callbackUrl });
          }}
        >
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          <Button type="submit" className="w-full" disabled={pending}>
            <Mail /> Email me a sign-in link
          </Button>
        </form>
      )}

      {demo && (
        <form
          className="space-y-2 rounded-md border border-dashed p-4"
          onSubmit={(e) => {
            e.preventDefault();
            setPending(true);
            signIn("demo", { email: demoEmail, callbackUrl });
          }}
        >
          <Label htmlFor="demo-email">Demo account</Label>
          <p className="text-xs text-muted-foreground">
            For local development. Any email works; demo@grandslam.local comes with seeded leagues.
          </p>
          <Input id="demo-email" type="email" required value={demoEmail} onChange={(e) => setDemoEmail(e.target.value)} />
          <Button type="submit" variant="secondary" className="w-full" disabled={pending}>
            Continue with demo account
          </Button>
        </form>
      )}

      {oauth.length === 0 && !hasEmail && !demo && (
        <p className="text-sm text-muted-foreground">
          No sign-in methods are configured. Set GitHub, Google or email credentials in the environment.
        </p>
      )}
    </div>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M21.35 11.1H12v2.98h5.35c-.23 1.5-1.68 4.4-5.35 4.4a5.98 5.98 0 0 1 0-11.96c1.84 0 3.07.78 3.78 1.46l2.58-2.49C16.72 3.98 14.6 3 12 3a9 9 0 1 0 0 18c5.2 0 8.64-3.65 8.64-8.8 0-.6-.07-1.05-.15-1.5z" />
    </svg>
  );
}

function GitHubMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.9 1.52 2.34 1.08 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02a9.56 9.56 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85v2.74c0 .27.18.58.69.48A10 10 0 0 0 12 2z" />
    </svg>
  );
}
