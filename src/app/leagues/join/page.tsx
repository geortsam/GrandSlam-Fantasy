import { JoinLeagueForm } from "@/components/join-league-form";
import { requireUser } from "@/lib/auth";

export const metadata = { title: "Join a league" };

export default async function JoinPage() {
  await requireUser("/leagues/join");
  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-6 font-display text-3xl font-bold uppercase">Join a league</h1>
      <JoinLeagueForm />
    </div>
  );
}
