// lib/otp.ts
import dns from "dns";
import crypto from "crypto";
import { Redis } from "@upstash/redis";
import nodemailer from "nodemailer";

// Force Node.js DNS resolver to prioritize IPv4 in cloud container environments
if (typeof dns.setDefaultResultOrder === "function") {
  dns.setDefaultResultOrder("ipv4first");
}

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function generateAndSendOTP(email: string): Promise<boolean> {
  const cleanEmail = email.trim().toLowerCase();
  const user = process.env.SMTP_EMAIL?.trim();
  const pass = process.env.SMTP_PASSWORD?.trim();

  if (!user || !pass) {
    console.error("SMTP Error: SMTP_EMAIL or SMTP_PASSWORD is not configured.");
    return false;
  }

  // Create transporter with explicit IPv4 socket binding (family: 4)
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    family: 4, // Forces IPv4 (bypasses unreachable IPv6 routes)
    auth: {
      user,
      pass,
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  } as any);

  const otp = crypto.randomInt(100000, 999999).toString();

  // Store in Redis with a 5-minute TTL (300 seconds)
  await redis.set(`otp:${cleanEmail}`, otp, { ex: 300 });

  try {
    await transporter.sendMail({
      from: `"PCK Security" <${user}>`,
      to: cleanEmail,
      subject: `Your PCK Ledger Verification Code: ${otp}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; border: 1px solid #e4e4e7; border-radius: 8px;">
          <h2 style="font-size: 18px; color: #18181b; margin-bottom: 8px;">PCK Ledger 2-Step Verification</h2>
          <p style="font-size: 14px; color: #71717a; margin-bottom: 24px;">Use the verification code below to complete your login session. This code will expire in 5 minutes.</p>
          <div style="background-color: #f4f4f5; border-radius: 6px; padding: 16px; text-align: center; margin-bottom: 24px;">
            <span style="font-family: monospace; font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #09090b;">${otp}</span>
          </div>
          <p style="font-size: 12px; color: #a1a1aa; margin: 0;">If you did not request this login attempt, please ignore this email.</p>
        </div>
      `,
    });
    return true;
  } catch (error: any) {
    console.error("Nodemailer dispatch error:", error?.message || error);
    return false;
  }
}

export async function verifyOTP(
  email: string,
  submittedOtp: string,
): Promise<boolean> {
  const cleanEmail = email.trim().toLowerCase();
  const key = `otp:${cleanEmail}`;
  const storedOtp = await redis.get(key);

  if (!storedOtp) {
    return false;
  }

  if (String(storedOtp).trim() !== String(submittedOtp).trim()) {
    return false;
  }

  // Invalidate OTP immediately after successful verification
  await redis.del(key);
  return true;
}
