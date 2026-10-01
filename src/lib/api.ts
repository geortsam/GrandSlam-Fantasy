import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getCurrentUser } from "./auth";
import { ServiceError } from "./leagues";

export async function requireApiUser() {
  const user = await getCurrentUser();
  if (!user) throw new ServiceError("Sign in to continue.", 401);
  return user;
}

/** Wraps a route handler so service and validation errors become JSON responses. */
export function handle<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (err) {
      if (err instanceof ServiceError) {
        return NextResponse.json({ error: err.message, details: err.details }, { status: err.status });
      }
      if (err instanceof ZodError) {
        return NextResponse.json(
          { error: "Check the highlighted fields.", details: err.issues.map((i) => `${i.path.join(".")}: ${i.message}`) },
          { status: 400 },
        );
      }
      console.error(err);
      return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
    }
  };
}

/** Cron routes accept "Authorization: Bearer $CRON_SECRET" (what Vercel Cron sends). */
export function isAuthorizedCron(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  return req.headers.get("authorization") === `Bearer ${secret}`;
}
