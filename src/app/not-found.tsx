import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <p className="font-display text-6xl font-bold text-accent">Out!</p>
      <h1 className="mt-2 text-xl font-semibold">That page is outside the lines.</h1>
      <Button asChild className="mt-6">
        <Link href="/">Back to the court</Link>
      </Button>
    </div>
  );
}
