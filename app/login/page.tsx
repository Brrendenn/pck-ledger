// app/login/page.tsx
"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import {
  Building2,
  Lock,
  Mail,
  KeyRound,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const [step, setStep] = useState<"CREDENTIALS" | "OTP">("CREDENTIALS");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Step 1: Check credentials & dispatch OTP for ADMIN, or sign in directly for CLIENT
  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const cleanEmail = email.trim().toLowerCase();

    try {
      const res = await fetch("/api/auth/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Invalid email or password");
        setLoading(false);
        return;
      }

      // CLIENT: Sign in immediately and bypass OTP completely
      if (!data.requiresOtp) {
        const result = await signIn("credentials", {
          email: cleanEmail,
          password,
          redirect: false,
        });

        if (result?.error) {
          setError("Failed to sign in. Please try again.");
          setLoading(false);
        } else {
          window.location.href = "/";
        }
        return;
      }

      // ADMIN: Transition to 2FA code entry screen
      setStep("OTP");
      setLoading(false);
    } catch {
      setError("An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  };

  // Step 2: Final NextAuth sign-in with 6-digit OTP (Admin only)
  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await signIn("credentials", {
      email: email.trim().toLowerCase(),
      password,
      otp: otp.trim(),
      redirect: false,
    });

    if (res?.error) {
      setError("Invalid or expired verification code.");
      setLoading(false);
    } else {
      window.location.href = "/";
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950">
      <div className="w-full max-w-sm space-y-6 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900">
            {step === "CREDENTIALS" ? (
              <Building2 className="h-6 w-6" />
            ) : (
              <KeyRound className="h-6 w-6" />
            )}
          </div>
          <h1 className="mt-4 text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            {step === "CREDENTIALS"
              ? "PCK Ledger Access"
              : "Two-Factor Verification"}
          </h1>
          <p className="mt-1 text-xs text-zinc-500">
            {step === "CREDENTIALS"
              ? "Enter your credentials to access your ledger."
              : `Enter the 6-digit code sent to ${email}`}
          </p>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-3 text-xs text-red-600 dark:bg-red-950/50 dark:text-red-400">
            {error}
          </div>
        )}

        {step === "CREDENTIALS" ? (
          <form onSubmit={handleRequestOTP} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-400" />
                <Input
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-8 text-xs"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-400" />
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-8 text-xs"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full text-xs font-semibold"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Verifying...
                </span>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOTP} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                6-Digit Code
              </label>
              <Input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="123456"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                className="text-center font-mono text-lg tracking-[0.4em]"
                required
                autoFocus
              />
            </div>

            <Button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full text-xs font-semibold"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Verifying
                  Code...
                </span>
              ) : (
                "Authenticate & Sign In"
              )}
            </Button>

            <button
              type="button"
              onClick={() => {
                setStep("CREDENTIALS");
                setOtp("");
                setError("");
              }}
              className="flex w-full items-center justify-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to login
            </button>
          </form>
        )}
      </div>
    </div>
  );
}