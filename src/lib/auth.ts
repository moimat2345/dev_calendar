import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import { prisma } from "./prisma";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    GitHub({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
      authorization: {
        params: {
          scope: "read:user repo",
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (!account || !profile) return false;

      const githubId = Number(profile.id);
      const username = (profile as any).login as string;
      const avatarUrl = (profile as any).avatar_url as string;
      const accessToken = account.access_token!;

      await prisma.user.upsert({
        where: { githubId },
        update: { accessToken, avatarUrl, username },
        create: {
          githubId,
          username,
          avatarUrl,
          accessToken,
        },
      });

      return true;
    },
    async jwt({ token, account, profile }) {
      if (account && profile) {
        const githubId = Number(profile.id);
        try {
          const dbUser = await prisma.user.findUnique({
            where: { githubId },
          });
          if (dbUser) {
            token.userId = dbUser.id;
            token.githubId = dbUser.githubId;
            token.username = dbUser.username;
            token.avatarUrl = dbUser.avatarUrl;
          }
        } catch (error) {
          console.error("JWT callback DB error:", error);
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.userId as string;
        (session.user as any).githubId = token.githubId as number;
        (session.user as any).username = token.username as string;
        (session.user as any).avatarUrl = token.avatarUrl as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
});
