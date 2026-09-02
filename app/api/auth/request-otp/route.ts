// app/api/auth/request-otp/route.ts
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { generateAndSendOTP } from "@/lib/otp";
import { z } from "zod";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = schema.parse(body);

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user || !user.password) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 },
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 },
      );
    }

    // Bypass OTP for CLIENT accounts
    if (user.role === "CLIENT") {
      return NextResponse.json({
        success: true,
        requiresOtp: false,
        message: "Authentication verified",
      });
    }

    // Require OTP for ADMIN accounts
    const sent = await generateAndSendOTP(user.email);
    if (!sent) {
      return NextResponse.json(
        { error: "Failed to dispatch verification email. Please try again." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      requiresOtp: true,
      message: "OTP sent to email",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    console.error("OTP request failed:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}