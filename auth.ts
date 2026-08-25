// auth.ts
import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { verifyOTP } from "@/lib/otp";
import { z } from "zod";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  otp: z.string().length(6),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        otp: { label: "OTP", type: "text" },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password, otp } = parsed.data;
        const cleanEmail = email.trim().toLowerCase();
        const cleanOtp = otp.trim();

        const user = await prisma.user.findUnique({
          where: { email: cleanEmail },
        });

        if (!user || !user.password) return null;

        // 1. Verify Password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) return null;

        // 2. Verify 2FA OTP
        const isOtpValid = await verifyOTP(cleanEmail, cleanOtp);
        if (!isOtpValid) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        (session.user as any).role = token.role as string;
      }
      return session;
    },
  },
});
