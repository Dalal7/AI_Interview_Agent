import React, { useState, useEffect } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { Sparkles, ArrowRight, UserPlus, CheckCircle, Terminal, Activity, Eye, EyeOff, UserCheck, Radio } from "lucide-react";
import { ChatWindow } from "../components/ChatWindow";
import { ProfileCompletion } from "../components/ProfileCompletion";
import { Header } from "../components/Header";
import { apiService } from "../services/api";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function InterviewPage() {
  const router = useRouter();
  const [candidateId, setCandidateId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [isStarting, setIsStarting] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [completionPercentage, setCompletionPercentage] = useState(0);
  const [phase, setPhase] = useState("INTRODUCTION");
  const [status, setStatus] = useState("active");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orchestrationStrategy, setOrchestrationStrategy] = useState("prompt");
  const [showDebug, setShowDebug] = useState(false);
  const [debugState, setDebugState] = useState<any>(null);
  const [isChecking, setIsChecking] = useState(true);

  // New history/candidate tracking states
  const [username, setUsername] = useState("");
  const [history, setHistory] = useState<any[]>([]);
  const [selectedHistoryProfile, setSelectedHistoryProfile] = useState<any | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const fetchHistory = async (uname: string) => {
    setIsLoadingHistory(true);
    try {
      const data = await apiService.getInterviewHistory(uname);
      setHistory(data);
    } catch (e) {
      console.error("Failed to load interview history:", e);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleViewHistoryDetails = async (cid: string) => {
    try {
      const profile = await apiService.getProfile(cid);
      setSelectedHistoryProfile(profile);
    } catch (e) {
      console.error("Failed to load history details:", e);
    }
  };

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (!userStr) {
      router.push("/login");
      return;
    }
    try {
      const user = JSON.parse(userStr);
      // Candidates can enter the interview room. If it's Dalal, auto-fill.
      if (user.role === "candidate") {
        setName(user.username);
        setUsername(user.username);
        if (user.username === "Dalal") {
          setEmail("dalalalbdah@hotmail.com");
        } else {
          setEmail(`${user.username.toLowerCase()}@example.com`);
        }
        fetchHistory(user.username);
      }
      setIsChecking(false);
    } catch (e) {
      router.push("/login");
    }
  }, [router]);

  if (isChecking) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-300 dark:border-slate-800 border-t-blue-500" />
          <span className="text-xs text-slate-400 font-semibold tracking-wider uppercase">Checking Session...</span>
        </div>
      </div>
    );
  }

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    setIsStarting(true);
    setError(null);
    try {
      const res = await apiService.startInterview(name, email, orchestrationStrategy, username);
      console.log("=== API START INTERVIEW RESPONSE ===", res);
      setCandidateId(res.candidate_id);
      setPhase("INTRODUCTION");
      setCompletionPercentage(0);
      setStatus("active");
      setMessages([
        { role: "assistant", content: res.question }
      ]);
      if (res.debug_state) {
        setDebugState(res.debug_state);
      }
    } catch (err: any) {
      setError(err.message || "Failed to initialize interview room.");
    } finally {
      setIsStarting(false);
    }
  };

  const handleSendMessage = async (text: string) => {
    if (!candidateId) return;

    setIsLoading(true);
    setError(null);
    
    // Add user message locally
    const updatedMessages = [...messages, { role: "user" as const, content: text }];
    setMessages(updatedMessages);

    try {
      const res = await apiService.sendMessage(candidateId, text);
      console.log("=== API SEND MESSAGE RESPONSE ===", res);
      
      // Add agent reply
      setMessages([...updatedMessages, { role: "assistant" as const, content: res.response }]);
      setCompletionPercentage(res.profile_completion_percentage);
      setPhase(res.interview_phase);
      setStatus(res.interview_status);
      
      if (res.debug_state) {
        setDebugState(res.debug_state);
      }
      
      // Fire confetti if newly completed
      if (res.interview_status === "completed" && status !== "completed") {
        import("canvas-confetti").then((confetti) => {
          confetti.default({
            particleCount: 150,
            spread: 80,
            origin: { y: 0.6 }
          });
        });
      }
    } catch (err: any) {
      setError(err.message || "Error transmitting candidate reply.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans selection:bg-blue-500/35 transition-colors duration-200">
      <Head>
        <title>Interview Screening Room | Autonomous Interview Agent</title>
        <meta name="description" content="Conduct your automated screening for our competitive coding bootcamp." />
      </Head>

      {/* Global Background Glows */}
      <div className="absolute top-0 left-1/4 h-[500px] w-[500px] rounded-full bg-blue-500/5 dark:bg-blue-500/3 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 h-[500px] w-[500px] rounded-full bg-indigo-500/5 dark:bg-indigo-500/3 blur-[120px] pointer-events-none" />

      {/* Navigation Header */}
      <Header isDashboard={false} />

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-6 py-10 relative">
        {!candidateId ? (
          /* Landing Setup Board & History Panel */
          <div className="max-w-5xl mx-auto my-12 animate-in fade-in zoom-in duration-500 grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            
            {/* Left Col: Setup Form */}
            <div className="md:col-span-6 space-y-6">
              <div className="text-left mb-6">
                <span className="rounded-full bg-slate-100 dark:bg-slate-900 px-3.5 py-1 border border-slate-200 dark:border-slate-800 text-xs font-semibold accent-text tracking-wide inline-flex items-center gap-1.5 uppercase">
                  <Sparkles size={12} className="accent-text" /> Adaptive AI Screening
                </span>
                <h1 className="font-space text-3xl font-bold text-slate-900 dark:text-slate-50 mt-4 leading-tight">
                  Candidate Screening Room
                </h1>
                <p className="text-slate-500 dark:text-slate-400 text-sm mt-2 leading-relaxed">
                  Introduce yourself to our Autonomous Interview Agent. The conversation will adapt to your background and answers in real-time.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 dark:border-slate-900 bg-white dark:bg-slate-900/60 p-8 backdrop-blur-md shadow-xl dark:shadow-2xl">
                {error && (
                  <div className="mb-6 rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-xs text-rose-500 dark:text-rose-450">
                    {error}
                  </div>
                )}

                <form onSubmit={handleStart} className="space-y-5">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. John Doe"
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 py-3 text-sm text-slate-800 dark:text-slate-300 placeholder-slate-400 dark:placeholder-slate-500 focus:border-slate-400 dark:focus:border-slate-700 focus:outline-none accent-ring"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. john@example.com"
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 py-3 text-sm text-slate-800 dark:text-slate-300 placeholder-slate-400 dark:placeholder-slate-500 focus:border-slate-400 dark:focus:border-slate-700 focus:outline-none accent-ring"
                    />
                  </div>



                  <button
                    type="submit"
                    disabled={isStarting}
                    className="w-full flex items-center justify-center gap-2 rounded-xl accent-bg accent-bg-hover px-4 py-3.5 text-white font-bold tracking-wide transition-all accent-glow disabled:opacity-50"
                  >
                    {isStarting ? "Entering Screening Room..." : "Begin Interview"}
                    <ArrowRight size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push("/voice-interview")}
                    className="w-full flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-300 transition-all hover:border-slate-300 dark:hover:border-slate-700"
                  >
                    <Radio size={16} className="accent-text" />
                    Try Live Voice Interview
                  </button>
                </form>
              </div>
            </div>

            {/* Right Col: Previous Attempts History */}
            <div className="md:col-span-6 space-y-6">
              <div className="text-left mb-6">
                <span className="rounded-full bg-slate-100 dark:bg-slate-900 px-3.5 py-1 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400 tracking-wide inline-flex items-center gap-1.5 uppercase">
                  Session History
                </span>
                <h2 className="font-space text-2xl font-bold text-slate-900 dark:text-slate-50 mt-4">
                  Your Previous Attempts
                </h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm mt-2 leading-relaxed">
                  Review the results, scores, and decisions from your completed adaptive AI interview screenings.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 dark:border-slate-900 bg-white dark:bg-slate-900/60 p-6 backdrop-blur-md shadow-xl dark:shadow-2xl min-h-[350px] flex flex-col justify-between">
                {isLoadingHistory ? (
                  <div className="flex-grow flex items-center justify-center text-xs text-slate-400 uppercase tracking-wider">
                    Loading history...
                  </div>
                ) : history.length === 0 ? (
                  <div className="flex-grow flex flex-col items-center justify-center text-center p-6 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                    <UserCheck className="text-slate-350 dark:text-slate-700 mb-3" size={32} />
                    <h4 className="font-bold text-sm text-slate-700 dark:text-slate-300 mb-1">No Past Attempts</h4>
                    <p className="text-xs text-slate-500 max-w-[250px]">
                      You haven't conducted any interview sessions yet. Complete your first screening to see your results here!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1 scrollbar-thin flex-grow">
                    {history.map((attempt) => (
                      <div
                        key={attempt.id}
                        className="p-4 rounded-xl border border-slate-200 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-950/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:border-slate-300 dark:hover:border-slate-700 transition-all text-left"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                              {new Date(attempt.created_at).toLocaleDateString(undefined, {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit"
                              })}
                            </span>
                            <span className={`text-[9px] px-2 py-0.5 rounded-full border font-bold uppercase tracking-wide ${
                              attempt.completed
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-450 border-emerald-500/20"
                                : "bg-amber-500/10 text-amber-600 dark:text-amber-550 border-amber-500/20"
                            }`}>
                              {attempt.completed ? "Completed" : "In Progress"}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono select-all">
                            ID: {attempt.id}
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 border-slate-200/60 dark:border-slate-850/60 pt-2.5 sm:pt-0">
                          {attempt.completed && (
                            <div className="text-right">
                              <span className={`text-[10px] font-bold uppercase tracking-wider block ${
                                attempt.recommendation === "ACCEPT"
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : attempt.recommendation === "ACCEPT_WITH_CONDITIONS"
                                  ? "text-blue-600 dark:text-blue-400"
                                  : attempt.recommendation === "REJECT"
                                  ? "text-rose-600 dark:text-rose-455"
                                  : "text-amber-650 dark:text-amber-500"
                              }`}>
                                {attempt.recommendation.replace(/_/g, " ")}
                              </span>
                              <span className="text-xs font-bold text-slate-500 dark:text-slate-450 font-space block">
                                Score: {attempt.overall_score.toFixed(1)}/10
                              </span>
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={() => handleViewHistoryDetails(attempt.id)}
                            className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-105 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-750 transition-all font-bold cursor-pointer"
                          >
                            View Result
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

          </div>
        ) : (
          /* Active Chat Workspace */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch animate-in fade-in slide-in-from-bottom-6 duration-500">
            {/* Left: Chat Window */}
            <div className="lg:col-span-2 flex flex-col h-full">
              {error && (
                <div className="mb-4 rounded-xl border border-rose-500/25 bg-rose-500/10 p-4 text-xs text-rose-500">
                  {error}
                </div>
              )}
              <ChatWindow
                messages={messages}
                onSendMessage={handleSendMessage}
                isLoading={isLoading}
                isCompleted={status === "completed"}
                candidateName={name}
              />
            </div>

            {/* Right: Info Panels */}
            <div className="space-y-6">
              {/* Debug Toggle Control */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-900 bg-white dark:bg-slate-900/40 p-4 backdrop-blur-md flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-2">
                  <Terminal size={16} className="accent-text" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    Agent Debugger
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDebug(!showDebug)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    showDebug ? "accent-bg" : "bg-slate-200 dark:bg-slate-700"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white dark:bg-slate-950 shadow ring-0 transition duration-200 ease-in-out ${
                      showDebug ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Debug/Reasoning Logs Panel */}
              {showDebug && debugState && (
                <div className="rounded-2xl border border-slate-200 dark:border-slate-900 bg-white dark:bg-slate-900/60 p-6 backdrop-blur-md space-y-4 shadow-sm animate-in fade-in duration-300">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                    <h4 className="font-space font-semibold text-slate-800 dark:text-slate-100 text-sm uppercase tracking-wider flex items-center gap-2">
                      <Activity size={16} className="accent-text animate-pulse" />
                      Reasoning Logs
                    </h4>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full accent-bg-light accent-text border border-slate-200 dark:border-slate-800 uppercase">
                      {debugState.orchestration_strategy}-based
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="bg-slate-50 dark:bg-slate-900/40 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                      <span className="block text-[10px] uppercase font-bold text-slate-500 mb-0.5">Turn Count</span>
                      <span className="font-medium text-slate-800 dark:text-slate-300">{debugState.turn_count} / {debugState.max_turns}</span>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-900/40 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                      <span className="block text-[10px] uppercase font-bold text-slate-500 mb-0.5">Next Action</span>
                      <span className="font-medium accent-text font-mono">{debugState.next_action || "None"}</span>
                    </div>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
                    <span className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Target Category</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{debugState.target_requirement || "None (Finished/Wrapping up)"}</span>
                  </div>

                  {/* Evidence Map List */}
                  <div className="space-y-2">
                    <span className="block text-[10px] uppercase font-bold text-slate-500">Evidence Map</span>
                    <div className="max-h-60 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                      {Object.entries(debugState.evidence_map || {}).map(([key, value]: any) => (
                        <div key={key} className="bg-slate-50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-slate-700 dark:text-slate-300 capitalize">{key.replace("-", " ")}</span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border ${
                              value.status === "satisfied"
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                                : value.status === "weak"
                                ? "bg-amber-500/10 text-amber-600 dark:text-amber-500 border-amber-500/20"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-transparent"
                            }`}>
                              {value.status}
                            </span>
                          </div>
                          {value.confidence > 0 && (
                            <div className="flex items-center gap-2 mb-1.5">
                              <div className="w-full bg-slate-200 dark:bg-slate-800 h-1 rounded-full overflow-hidden">
                                <div className="accent-bg h-full" style={{ width: `${value.confidence * 100}%` }} />
                              </div>
                              <span className="text-[10px] text-slate-500 font-mono">{(value.confidence * 100).toFixed(0)}%</span>
                            </div>
                          )}
                          {value.supporting_snippets && value.supporting_snippets.length > 0 && (
                            <div className="text-[10px] text-slate-550 dark:text-slate-400 bg-white dark:bg-slate-950/60 p-2 rounded-lg border border-slate-100 dark:border-slate-800 italic leading-relaxed max-h-16 overflow-y-auto">
                              "{value.supporting_snippets[0]}"
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Detected Skills */}
                  {debugState.detected_skills && debugState.detected_skills.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="block text-[10px] uppercase font-bold text-slate-500">Detected Skills</span>
                      <div className="flex flex-wrap gap-1">
                        {debugState.detected_skills.map((skill: string) => (
                          <span key={skill} className="text-[10px] font-bold bg-slate-50 dark:bg-slate-950 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-350">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Strengths / Weaknesses */}
                  <div className="grid grid-cols-2 gap-3 text-[11px]">
                    <div>
                      <span className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Strengths</span>
                      <div className="space-y-1">
                        {debugState.strengths && debugState.strengths.length > 0 ? (
                          debugState.strengths.slice(0, 3).map((s: string, idx: number) => (
                            <div key={idx} className="text-emerald-600 dark:text-emerald-400 flex gap-1 items-start">
                              <span className="shrink-0">•</span> <span>{s}</span>
                            </div>
                          ))
                        ) : (
                          <span className="text-slate-500 italic">None yet</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Weaknesses</span>
                      <div className="space-y-1">
                        {debugState.weaknesses && debugState.weaknesses.length > 0 ? (
                          debugState.weaknesses.slice(0, 3).map((w: string, idx: number) => (
                            <div key={idx} className="text-amber-600 dark:text-amber-500 flex gap-1 items-start">
                              <span className="shrink-0">•</span> <span>{w}</span>
                            </div>
                          ))
                        ) : (
                          <span className="text-slate-500 italic">None yet</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Profile Completion */}
              <ProfileCompletion percentage={completionPercentage} phase={phase} evidenceMap={debugState?.evidence_map} />

              {/* Recruitment Policy Panel */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-900 bg-white dark:bg-slate-900/30 p-6 backdrop-blur-md space-y-4 shadow-sm">
                <h4 className="font-space font-semibold text-slate-800 dark:text-slate-100 text-sm uppercase tracking-wider flex items-center gap-2">
                  <UserPlus size={16} className="accent-text" />
                  Screening Directives
                </h4>
                <div className="space-y-3 text-xs text-slate-550 dark:text-slate-400 leading-relaxed">
                  <div className="flex gap-2">
                    <CheckCircle size={14} className="accent-text shrink-0 mt-0.5" />
                    <p>Discuss your career background and motivation for learning AI.</p>
                  </div>
                  <div className="flex gap-2">
                    <CheckCircle size={14} className="accent-text shrink-0 mt-0.5" />
                    <p>Briefly describe any experience you have with Python, Web technology, or Git.</p>
                  </div>
                  <div className="flex gap-2">
                    <CheckCircle size={14} className="accent-text shrink-0 mt-0.5" />
                    <p>Explain concepts like Machine Learning, RAG, or LLMs if prompted.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {selectedHistoryProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 shadow-2xl space-y-6 relative">
            <button
              onClick={() => setSelectedHistoryProfile(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-bold bg-slate-100 dark:bg-slate-800/80 px-2.5 py-1 rounded-lg cursor-pointer"
            >
              ✕ Close
            </button>
            <div className="flex justify-between items-start border-b border-slate-100 dark:border-slate-800/60 pb-4">
              <div className="text-left">
                <h3 className="font-space font-bold text-2xl text-slate-900 dark:text-slate-50">
                  Admissions Evaluation Report
                </h3>
                <p className="text-slate-500 text-xs mt-1">
                  Interview Session ID: {selectedHistoryProfile.id}
                </p>
              </div>
              <div className="text-right">
                <span className={`inline-block px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full border ${
                  selectedHistoryProfile.recommendation === "ACCEPT"
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-450 border-emerald-500/20"
                    : selectedHistoryProfile.recommendation === "ACCEPT_WITH_CONDITIONS"
                    ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                    : selectedHistoryProfile.recommendation === "REJECT"
                    ? "bg-rose-500/10 text-rose-600 dark:text-rose-450 border-rose-500/20"
                    : "bg-amber-500/10 text-amber-600 dark:text-amber-500 border-amber-500/20"
                }`}>
                  {selectedHistoryProfile.recommendation.replace(/_/g, " ")}
                </span>
                <div className="text-lg font-bold font-space mt-1 text-slate-800 dark:text-slate-200">
                  Score: {selectedHistoryProfile.overall_score.toFixed(1)}/10
                </div>
              </div>
            </div>

            {/* Strengths & Weaknesses */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
              <div className="bg-emerald-500/5 dark:bg-emerald-500/3 border border-emerald-500/10 p-4 rounded-xl">
                <h4 className="font-bold text-xs uppercase tracking-wider text-emerald-600 dark:text-emerald-455 mb-2">
                  Key Strengths
                </h4>
                <ul className="text-xs space-y-1.5 text-slate-605 dark:text-slate-300">
                  {selectedHistoryProfile.strengths && selectedHistoryProfile.strengths.length > 0 ? (
                    selectedHistoryProfile.strengths.map((str: string, i: number) => (
                      <li key={i} className="flex gap-1 items-start">
                        <span className="text-emerald-505 shrink-0">•</span>
                        <span>{str}</span>
                      </li>
                    ))
                  ) : (
                    <li className="italic text-slate-400">None logged</li>
                  )}
                </ul>
              </div>

              <div className="bg-amber-500/5 dark:bg-amber-500/3 border border-amber-500/10 p-4 rounded-xl">
                <h4 className="font-bold text-xs uppercase tracking-wider text-amber-600 dark:text-amber-500 mb-2">
                  Growth Areas
                </h4>
                <ul className="text-xs space-y-1.5 text-slate-605 dark:text-slate-300">
                  {selectedHistoryProfile.weaknesses && selectedHistoryProfile.weaknesses.length > 0 ? (
                    selectedHistoryProfile.weaknesses.map((weak: string, i: number) => (
                      <li key={i} className="flex gap-1 items-start">
                        <span className="text-amber-505 shrink-0">•</span>
                        <span>{weak}</span>
                      </li>
                    ))
                  ) : (
                    <li className="italic text-slate-400">None logged</li>
                  )}
                </ul>
              </div>
            </div>

            {/* Detailed Evaluation */}
            <div className="space-y-2 text-left">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500">
                Detailed Evaluation Report
              </h4>
              <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-100 dark:border-slate-850 text-xs leading-relaxed text-slate-600 dark:text-slate-350 max-h-[30vh] overflow-y-auto whitespace-pre-line font-mono">
                {selectedHistoryProfile.final_evaluation || "No detailed report generated for this attempt."}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
