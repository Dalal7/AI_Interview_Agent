import React, { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { Sparkles, LayoutDashboard, UserCheck, ArrowRight } from "lucide-react";
import { Header } from "../components/Header";

export default function Home() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (!userStr) {
      router.push("/login");
    } else {
      try {
        const user = JSON.parse(userStr);
        if (user.role === "candidate") {
          router.push("/interview");
        } else if (user.role === "admin") {
          router.push("/dashboard");
        } else {
          router.push("/login");
        }
      } catch (e) {
        router.push("/login");
      }
    }
  }, [router]);

  if (isChecking) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-300 dark:border-slate-800 border-t-blue-550" />
          <span className="text-xs text-slate-400 font-semibold tracking-wider uppercase">Loading Session...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans selection:bg-blue-500/35 flex flex-col justify-between relative overflow-hidden transition-colors duration-200">
      <Head>
        <title>1 Min Scout | Autonomous Interview Agent Platform</title>
        <meta name="description" content="Entry portal for the Autonomous Interview Agent Platform - Bootcamp Screening & Review Panel." />
      </Head>

      {/* Global Background Glows */}
      <div className="absolute top-0 left-1/4 h-[600px] w-[600px] rounded-full bg-blue-500/5 dark:bg-blue-500/3 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 h-[600px] w-[600px] rounded-full bg-indigo-500/5 dark:bg-indigo-500/3 blur-[130px] pointer-events-none" />

      {/* Header */}
      <Header isDashboard={false} />

      {/* Hero and Choice Selection */}
      <main className="max-w-4xl mx-auto px-6 py-20 flex-grow flex flex-col justify-center items-center relative z-10 text-center">
        <div className="animate-in fade-in zoom-in duration-500 space-y-6">
          <span className="rounded-full bg-slate-100 dark:bg-slate-900 px-3.5 py-1 border border-slate-200 dark:border-slate-800 text-xs font-semibold accent-text tracking-wide inline-flex items-center gap-1.5 uppercase">
            <Sparkles size={12} className="accent-text" /> Autonomous AI Agent Platform
          </span>
          <h1 className="font-space text-4xl sm:text-5xl font-bold text-slate-900 dark:text-slate-50 tracking-tight max-w-2xl leading-tight">
            1 Min Scout Platform
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-base max-w-lg mx-auto">
            Choose your interface below to either enter the screening environment or review the candidate evaluation board.
          </p>
        </div>

        {/* Choice Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-3xl mt-12 animate-in fade-in slide-in-from-bottom-6 duration-700">
          {/* Option 1: Candidate Screen */}
          <Link
            href="/interview"
            className="group relative rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 p-8 text-left hover:border-slate-400 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900/60 transition-all duration-300 shadow-md dark:shadow-xl backdrop-blur-md flex flex-col justify-between min-h-[260px]"
          >
            <div className="absolute top-0 right-0 h-24 w-24 rounded-full bg-blue-500/5 blur-xl group-hover:bg-blue-500/10 transition-all duration-500" />
            <div className="space-y-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 group-hover:accent-bg group-hover:text-white transition-all duration-300">
                <UserCheck size={24} />
              </div>
              <div>
                <h3 className="font-space text-xl font-bold text-slate-800 dark:text-slate-50 group-hover:accent-text transition-colors">
                  Interview Room
                </h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm mt-2 leading-relaxed">
                  Start your adaptive screening. Talk with our AI agent to demonstrate your background, logic, and core coding skills.
                </p>
              </div>
            </div>
            <div className="mt-6 flex items-center gap-2 text-xs font-bold uppercase tracking-wider accent-text">
              <span>Begin Screen</span>
              <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Option 2: Admissions Board */}
          <Link
            href="/dashboard"
            className="group relative rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 p-8 text-left hover:border-slate-400 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900/60 transition-all duration-300 shadow-md dark:shadow-xl backdrop-blur-md flex flex-col justify-between min-h-[260px]"
          >
            <div className="absolute top-0 right-0 h-24 w-24 rounded-full bg-indigo-500/5 blur-xl group-hover:bg-indigo-500/10 transition-all duration-500" />
            <div className="space-y-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 group-hover:accent-bg group-hover:text-white transition-all duration-300">
                <LayoutDashboard size={24} />
              </div>
              <div>
                <h3 className="font-space text-xl font-bold text-slate-800 dark:text-slate-50 group-hover:accent-text transition-colors">
                  Admissions Board
                </h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm mt-2 leading-relaxed">
                  Review applicant screening dossiers, technical metrics, skill keywords, and chat dialogue transcripts generated by the agent.
                </p>
              </div>
            </div>
            <div className="mt-6 flex items-center gap-2 text-xs font-bold uppercase tracking-wider accent-text">
              <span>Open Dashboard</span>
              <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-900 py-6 text-center text-xs text-slate-400 dark:text-slate-500 z-10 bg-white/50 dark:bg-slate-950/50 backdrop-blur-sm">
        <p>© 2026 1 Min Scout. All rights reserved.</p>
      </footer>
    </div>
  );
}
