import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role || "ADMIN";
        token.assignedProjectId = (user as any).assignedProjectId || null;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        (session.user as any).role = token.role as string;
        (session.user as any).assignedProjectId = token.assignedProjectId as string | null;
      }
      return session;
    },
  },
  providers: [],
} satisfies NextAuthConfig;