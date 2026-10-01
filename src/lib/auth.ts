import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { getServerSession, type NextAuthOptions } from "next-auth";
import type { Provider } from "next-auth/providers/index";
import CredentialsProvider from "next-auth/providers/credentials";
import EmailProvider from "next-auth/providers/email";
import GitHubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";
import { redirect } from "next/navigation";
import { prisma } from "./db";

export function demoLoginEnabled(): boolean {
  return process.env.ENABLE_DEMO_LOGIN === "true";
}

function providers(): Provider[] {
  const list: Provider[] = [];
  if (process.env.GITHUB_ID && process.env.GITHUB_SECRET) {
    list.push(GitHubProvider({ clientId: process.env.GITHUB_ID, clientSecret: process.env.GITHUB_SECRET }));
  }
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    list.push(
      GoogleProvider({
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      }),
    );
  }
  if (process.env.EMAIL_SERVER && process.env.EMAIL_FROM) {
    list.push(EmailProvider({ server: process.env.EMAIL_SERVER, from: process.env.EMAIL_FROM }));
  }
  if (demoLoginEnabled()) {
    // Local development and demos only: signs in by email without a password.
    list.push(
      CredentialsProvider({
        id: "demo",
        name: "Demo account",
        credentials: { email: { label: "Email", type: "email" }, name: { label: "Name", type: "text" } },
        async authorize(credentials) {
          const email = credentials?.email?.trim().toLowerCase();
          if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return null;
          const name = credentials?.name?.trim() || email.split("@")[0];
          const user = await prisma.user.upsert({
            where: { email },
            create: { email, name },
            update: {},
          });
          return { id: user.id, email: user.email, name: user.name, image: user.image };
        },
      }),
    );
  }
  return list;
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  // JWT sessions let OAuth, email and demo credentials share one session model.
  session: { strategy: "jwt" },
  providers: providers(),
  pages: { signIn: "/signin", verifyRequest: "/signin?check-email=1" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.uid = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.uid) session.user.id = token.uid as string;
      return session;
    },
  },
};

export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  return session?.user?.id ? session.user : null;
}

/** For server components: sends signed-out visitors to sign in. */
export async function requireUser(callbackUrl = "/dashboard") {
  const user = await getCurrentUser();
  if (!user) redirect(`/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  return user;
}
