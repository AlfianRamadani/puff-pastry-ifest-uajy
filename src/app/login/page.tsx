"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState<"magic" | "google" | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard");
    }
  }, [loading, router, user]);

  const handleMagicLink = async (event: FormEvent) => {
    event.preventDefault();
    setFeedback(null);
    setErrorMessage(null);
    setSubmitting("magic");

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
      },
    });

    if (error) {
      setErrorMessage(error.message);
      setSubmitting(null);
      return;
    }

    setFeedback("Check your email for the magic link.");
    setSubmitting(null);
  };

  const handleGoogle = async () => {
    setFeedback(null);
    setErrorMessage(null);
    setSubmitting("google");

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    });

    if (error) {
      setErrorMessage(error.message);
      setSubmitting(null);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FFF9F0] px-4">
      <div className="w-full max-w-md border-[3px] border-black bg-white p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <h1 className="mb-2 text-2xl font-black uppercase tracking-wider text-black">Login</h1>
        <p className="mb-6 text-sm font-bold text-black/60">
          Sign in to continue to your dashboard.
        </p>

        <form onSubmit={handleMagicLink} className="space-y-4">
          <label className="block text-xs font-black uppercase tracking-wider text-black/60" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            className="w-full border-[3px] border-black bg-[#FFFDF7] px-3 py-2 font-bold text-black outline-none focus:translate-x-[1px] focus:translate-y-[1px] focus:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
          />

          <button
            type="submit"
            disabled={submitting !== null}
            className="w-full border-[3px] border-black bg-[#FFC107] px-4 py-3 text-sm font-black uppercase tracking-wide text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all enabled:hover:translate-x-[1px] enabled:hover:translate-y-[1px] enabled:hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting === "magic" ? "Sending..." : "Send Magic Link"}
          </button>
        </form>

        <div className="my-4 text-center text-xs font-black uppercase tracking-widest text-black/40">or</div>

        <button
          type="button"
          onClick={handleGoogle}
          disabled={submitting !== null}
          className="w-full border-[3px] border-black bg-[#B3D4FF] px-4 py-3 text-sm font-black uppercase tracking-wide text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all enabled:hover:translate-x-[1px] enabled:hover:translate-y-[1px] enabled:hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting === "google" ? "Redirecting..." : "Continue with Google"}
        </button>

        {feedback && (
          <p className="mt-4 border-[3px] border-black bg-[#B3FFB3] px-3 py-2 text-xs font-black uppercase tracking-wide text-black">
            {feedback}
          </p>
        )}

        {errorMessage && (
          <p className="mt-4 border-[3px] border-black bg-[#FFB3C1] px-3 py-2 text-xs font-black uppercase tracking-wide text-black">
            {errorMessage}
          </p>
        )}

        <Link href="/" className="mt-6 block text-center text-xs font-black uppercase tracking-wide text-black/60 hover:text-black">
          Back to landing
        </Link>
      </div>
    </div>
  );
}
