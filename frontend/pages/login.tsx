import React, { useState, useEffect } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { Sparkles, Lock, User, AlertCircle, ArrowRight, ShieldCheck, UserCheck } from "lucide-react";
import { Header } from "../components/Header";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If already logged in, redirect to appropriate page
  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user.role === "candidate") {
          router.push("/interview");
        } else if (user.role === "admin") {
          router.push("/dashboard");
        }
      } catch (e) {
        localStorage.removeItem("user");
      }
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch("http://localhost:8000/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || "Authentication failed. Invalid username or password.");
      }

      const data = await response.json();
      localStorage.setItem("user", JSON.stringify({
        id: data.id,
        username: data.username,
        role: data.role,
        token: data.token
      }));

      // Redirect based on role
      if (data.role === "candidate") {
        router.push("/interview");
      } else if (data.role === "admin") {
        router.push("/dashboard");
      } else {
        router.push("/");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans selection:bg-blue-500/35 flex flex-col justify-between relative overflow-hidden transition-colors duration-200">
      <Head>
        <title>Login | 1 Min Scout Platform</title>
        <meta name="description" content="Access portal for the Autonomous Interview Agent Platform." />
      </Head>

      {/* Global Background Glows */}
      <div className="absolute top-0 left-1/4 h-[500px] w-[500px] rounded-full bg-blue-500/5 dark:bg-blue-500/3 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 h-[500px] w-[500px] rounded-full bg-indigo-500/5 dark:bg-indigo-500/3 blur-[120px] pointer-events-none" />

      <Header />

      <main className="max-w-md w-full mx-auto px-6 py-12 flex-grow flex flex-col justify-center relative z-10">
        <div className="animate-in fade-in zoom-in duration-500">
          <div className="text-center mb-8">
            <span className="rounded-full bg-slate-100 dark:bg-slate-900 px-3.5 py-1 border border-slate-200 dark:border-slate-800 text-xs font-semibold accent-text tracking-wide inline-flex items-center gap-1.5 uppercase">
              <Sparkles size={12} className="accent-text" /> Autonomous AI Admissions
            </span>
            <h1 className="font-space text-3xl font-bold text-slate-900 dark:text-slate-50 mt-4 leading-tight">
              Sign In
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-2 leading-relaxed">
              Enter your credentials to access the recruiter dashboard or your candidate interview room.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-900 bg-white dark:bg-slate-900/60 p-8 backdrop-blur-md shadow-xl dark:shadow-2xl">
            {error && (
              <div className="mb-6 rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-xs text-rose-500 flex items-start gap-2.5">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Username
                </label>
                <div className="relative">
                  <User size={16} className="absolute left-3.5 top-3.5 text-slate-400 dark:text-slate-500" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Username"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 pl-10 pr-4 py-3 text-sm text-slate-800 dark:text-slate-350 placeholder-slate-400 dark:placeholder-slate-500 focus:border-slate-450 dark:focus:border-slate-700 focus:outline-none accent-ring"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-3.5 text-slate-400 dark:text-slate-500" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 pl-10 pr-4 py-3 text-sm text-slate-800 dark:text-slate-350 placeholder-slate-400 dark:placeholder-slate-500 focus:border-slate-450 dark:focus:border-slate-700 focus:outline-none accent-ring"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 rounded-xl accent-bg accent-bg-hover px-4 py-3.5 text-white font-bold tracking-wide transition-all accent-glow disabled:opacity-50"
              >
                {isLoading ? "Signing in..." : "Sign In"}
                <ArrowRight size={16} />
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-850 space-y-3">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Seeded Demo Users
              </span>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => { setUsername("admin"); setPassword("1234"); }}
                  className="flex items-center gap-2 text-left p-3 rounded-xl border border-slate-200 dark:border-slate-850 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-950/50 hover:bg-slate-100/50 dark:hover:bg-slate-900/50 transition-all text-xs"
                >
                  <ShieldCheck size={14} className="accent-text" />
                  <div>
                    <div className="font-bold text-slate-700 dark:text-slate-355">Admin Panel</div>
                    <div className="text-[10px] text-slate-400">admin / 1234</div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => { setUsername("Dalal"); setPassword("1234"); }}
                  className="flex items-center gap-2 text-left p-3 rounded-xl border border-slate-200 dark:border-slate-850 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-950/50 hover:bg-slate-100/50 dark:hover:bg-slate-900/50 transition-all text-xs"
                >
                  <UserCheck size={14} className="accent-text" />
                  <div>
                    <div className="font-bold text-slate-700 dark:text-slate-355">Candidate Room</div>
                    <div className="text-[10px] text-slate-400">Dalal / 1234</div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-200 dark:border-slate-900 py-6 text-center text-xs text-slate-400 dark:text-slate-500 z-10 bg-white/50 dark:bg-slate-950/50 backdrop-blur-sm">
        <p>© 2026 1 Min Scout. All rights reserved.</p>
      </footer>
    </div>
  );
}
