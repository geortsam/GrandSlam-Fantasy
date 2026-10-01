import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { authOptions, demoLoginEnabled, getCurrentUser } from "@/lib/auth";
import { SignInForms } from "./sign-in-forms";

export const metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string; "check-email"?: string }>;
}) {
  const params = await searchParams;
  const callbackUrl = params.callbackUrl?.startsWith("/") ? params.callbackUrl : "/dashboard";
  if (await getCurrentUser()) redirect(callbackUrl);
  const providers = authOptions.providers.map((p) => ({ id: p.id, name: p.name, type: p.type }));

  return (
    <div className="mx-auto max-w-md">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Sign in</CardTitle>
          <CardDescription>Join leagues, draft players and track your rosters.</CardDescription>
        </CardHeader>
        <CardContent>
          {params["check-email"] ? (
            <p role="status" className="rounded-md bg-muted p-3 text-sm">
              Check your inbox for a sign-in link.
            </p>
          ) : (
            <SignInForms
              providers={providers}
              callbackUrl={callbackUrl}
              demo={demoLoginEnabled()}
              error={params.error}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
