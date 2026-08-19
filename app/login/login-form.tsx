"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LockKeyhole, Mail, ArrowRight } from "lucide-react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { APP } from "@/lib/config";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Logo } from "@/components/logo";

const ALLOWED_DOMAIN = "wfyi.ai";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
      <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z" />
    </svg>
  );
}

type Mode = "signin" | "signup";

const container: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07, delayChildren: 0.1 } },
};
const item: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 260, damping: 24 } },
};

export function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState<"google" | "email" | null>(null);

  async function establishSession(accessToken: string): Promise<boolean> {
    const res = await fetch("/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessToken }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Sign-in failed.");
      await getBrowserSupabase().auth.signOut().catch(() => {});
      return false;
    }
    return true;
  }

  async function googleSignIn() {
    setError("");
    setInfo("");
    setLoading("google");
    const supabase = getBrowserSupabase();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { hd: ALLOWED_DOMAIN, prompt: "select_account" },
      },
    });
    if (error) {
      setError(error.message);
      setLoading(null);
    }
  }

  async function emailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");

    const addr = email.trim().toLowerCase();
    if (!addr.endsWith("@" + ALLOWED_DOMAIN)) {
      setError(`Only @${ALLOWED_DOMAIN} company accounts are allowed.`);
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading("email");
    const supabase = getBrowserSupabase();
    try {
      const { data, error } =
        mode === "signup"
          ? await supabase.auth.signUp({ email: addr, password })
          : await supabase.auth.signInWithPassword({ email: addr, password });

      if (error) {
        setError(error.message);
        setLoading(null);
        return;
      }
      const token = data.session?.access_token;
      if (!token) {
        setInfo("Account created. Please sign in.");
        setMode("signin");
        setLoading(null);
        return;
      }
      const ok = await establishSession(token);
      if (!ok) {
        setLoading(null);
        return;
      }
      router.replace("/dashboard");
    } catch {
      setError("Something went wrong. Try again.");
      setLoading(null);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-4">
      {/* Animated ambient background */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <motion.div
          className="absolute -left-24 top-[-10%] size-[38rem] rounded-full bg-primary/25 blur-[120px]"
          animate={{ x: [0, 60, 0], y: [0, 40, 0], scale: [1, 1.12, 1] }}
          transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -right-24 bottom-[-10%] size-[34rem] rounded-full bg-fuchsia-500/20 blur-[120px]"
          animate={{ x: [0, -50, 0], y: [0, -30, 0], scale: [1, 1.15, 1] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        />
        <motion.div
          className="absolute left-1/2 top-1/3 size-[26rem] -translate-x-1/2 rounded-full bg-cyan-400/15 blur-[120px]"
          animate={{ y: [0, 50, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,hsl(var(--primary)/0.08),transparent_60%)]" />
      </div>

      {/* Theme toggle */}
      <div className="absolute right-4 top-4 z-10">
        <ThemeToggle />
      </div>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="glass-strong w-full max-w-md rounded-3xl p-8 shadow-2xl ring-1 ring-white/5"
      >
        <motion.div variants={item} className="mb-7 flex flex-col items-center text-center">
          <div className="relative mb-4 grid size-16 place-items-center">
            <motion.span
              className="absolute size-14 rounded-2xl bg-primary/20 blur-md"
              animate={{ scale: [1, 1.45], opacity: [0.5, 0] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: "easeOut" }}
            />
            <motion.div
              whileHover={{ rotate: -6, scale: 1.06 }}
              transition={{ type: "spring", stiffness: 300, damping: 15 }}
              className="relative"
            >
              <Logo className="size-14 drop-shadow-lg" />
            </motion.div>
          </div>
          <h1 className="bg-gradient-to-b from-foreground to-foreground/70 bg-clip-text text-2xl font-bold tracking-tight text-transparent">
            {APP.short}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{APP.name}</p>
        </motion.div>

        <motion.div variants={item}>
          <Button
            type="button"
            variant="secondary"
            size="lg"
            className="group w-full transition-all hover:shadow-md"
            onClick={googleSignIn}
            disabled={loading !== null}
          >
            {loading === "google" ? <Loader2 className="animate-spin" /> : <GoogleIcon />}
            Continue with Google
          </Button>
        </motion.div>

        <motion.div variants={item} className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent to-border" />
          or use your company email
          <div className="h-px flex-1 bg-gradient-to-l from-transparent to-border" />
        </motion.div>

        <motion.form variants={item} onSubmit={emailSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Company email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={`you@${ALLOWED_DOMAIN}`}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <AnimatePresence mode="wait">
            {error && (
              <motion.p
                key={error}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger"
              >
                {error}
              </motion.p>
            )}
            {info && !error && (
              <motion.p
                key={info}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="rounded-md bg-primary/10 px-3 py-2 text-sm text-primary"
              >
                {info}
              </motion.p>
            )}
          </AnimatePresence>

          <Button type="submit" size="lg" className="group w-full" disabled={loading !== null}>
            {loading === "email" ? (
              <Loader2 className="animate-spin" />
            ) : mode === "signup" ? (
              <Mail />
            ) : (
              <LockKeyhole />
            )}
            {loading === "email"
              ? mode === "signup"
                ? "Creating account…"
                : "Signing in…"
              : mode === "signup"
                ? "Create account"
                : "Sign in"}
            {loading === null && (
              <ArrowRight className="ml-auto size-4 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
            )}
          </Button>
        </motion.form>

        <motion.p variants={item} className="mt-5 text-center text-sm text-muted-foreground">
          {mode === "signin" ? "New here?" : "Already have an account?"}{" "}
          <button
            type="button"
            className="font-medium text-primary transition-colors hover:underline"
            onClick={() => {
              setMode(mode === "signin" ? "signup" : "signin");
              setError("");
              setInfo("");
            }}
          >
            {mode === "signin" ? "Create an account" : "Sign in"}
          </button>
        </motion.p>

        <motion.p variants={item} className="mt-6 text-center text-xs text-muted-foreground">
          Company access only. {`@${ALLOWED_DOMAIN}`} accounts, sessions last 1 hour.
        </motion.p>
      </motion.div>
    </div>
  );
}
