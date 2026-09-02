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
  otp: z.string().optional(), // 1. OTP is now optional in schema
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
        const cleanOtp = otp?.trim();

        const user = await prisma.user.findUnique({
          where: { email: cleanEmail },
        });

        if (!user || !user.password) return null;

        // 1. Verify Password (Required for both ADMIN & CLIENT)
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) return null;

        // 2. Role-Based 2FA Check
        if (user.role === "ADMIN") {
          // Admin accounts strictly require a valid 6-digit OTP
          if (!cleanOtp || cleanOtp.length !== 6) {
            throw new Error("OTP_REQUIRED");
          }
          const isOtpValid = await verifyOTP(cleanEmail, cleanOtp);
          if (!isOtpValid) {
            throw new Error("INVALID_OTP");
          }
        }

        // CLIENT accounts skip the OTP check completely!
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          assignedProjectId: user.assignedProjectId,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role || "ADMIN";
        token.assignedProjectId = (user as any).assignedProjectId || null;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        (session.user as any).role = token.role as string;
        (session.user as any).assignedProjectId = token.assignedProjectId as string | null;
      }
      return session;
    },
  },
});