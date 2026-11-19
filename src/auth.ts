import NextAuth, { type DefaultSession } from "next-auth";
import Discord from "next-auth/providers/discord";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/db";
import { accounts, users } from "@/db/schema";

declare module "next-auth" {
  interface Session {
    user: { id: string; discordId?: string; isAdmin: boolean } & DefaultSession["user"];
  }
}

const adminIds = new Set(
  (process.env.ADMIN_DISCORD_IDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
);

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, { usersTable: users, accountsTable: accounts }),
  providers: [Discord({ authorization: { params: { scope: "identify" } } })],
  session: { strategy: "jwt" },
  pages: { signIn: "/signin" },
  callbacks: {
    jwt({ token, account }) {
      if (account?.provider === "discord") token.discordId = account.providerAccountId;
      return token;
    },
    session({ session, token }) {
      const discordId = token.discordId as string | undefined;
      session.user.id = token.sub!;
      session.user.discordId = discordId;
      session.user.isAdmin = !!discordId && adminIds.has(discordId);
      return session;
    },
  },
});
