// Sends signed-out visitors on member-only pages straight to sign-in (a real
// 307 instead of a client-side redirect). Pages still check the session too.
import { withAuth } from "next-auth/middleware";

export default withAuth({ pages: { signIn: "/signin" } });

export const config = {
  matcher: ["/dashboard", "/leagues/new", "/leagues/join", "/join/:path*", "/leagues/:id/roster"],
};
