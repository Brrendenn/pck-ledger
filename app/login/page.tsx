// app/login/page.tsx
"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Building2, Lock, Mail, UserPlus, LogIn } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const router = useRouter();
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (isRegisterMode) {
      const res = await fetch("/api/auth/register-initial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to setup admin account");
        setLoading(false);
        return;
      }
    }

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (res?.error) {
      setError("Invalid email or password.");
      setLoading(false);
    } else {
      router.push("/");
      router.refresh();
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950">
      <div className="w-full max-w-sm space-y-6 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900">
            <Building2 className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            {isRegisterMode
              ? "Setup Initial Admin"
              : "PCK Ledger Authentication"}
          </h1>
          <p className="mt-1 text-xs text-zinc-500">
            {isRegisterMode
              ? "Initialize the first workspace administrator."
              : "Enter your account credentials to access workbooks."}
          </p>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-3 text-xs text-red-600 dark:bg-red-950/50 dark:text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          {isRegisterMode && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Name
              </label>
              <Input
                placeholder="Admin Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-400" />
              <Input
                type="email"
                placeholder="admin@pck.co.id"
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

          <Button type="submit" disabled={loading} className="w-full text-xs">
            {loading ? (
              "Authenticating..."
            ) : isRegisterMode ? (
              <span className="flex items-center gap-2">
                <UserPlus className="h-3.5 w-3.5" /> Initialize Account
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <LogIn className="h-3.5 w-3.5" /> Sign In
              </span>
            )}
          </Button>
        </form>

        <div className="border-t border-zinc-100 pt-4 text-center dark:border-zinc-800">
          <button
            type="button"
            onClick={() => {
              setIsRegisterMode(!isRegisterMode);
              setError("");
            }}
            className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300"
          >
            {isRegisterMode
              ? "Already have an account? Sign in"
              : "First time setup? Create Admin"}
          </button>
        </div>
      </div>
    </div>
  );
}
