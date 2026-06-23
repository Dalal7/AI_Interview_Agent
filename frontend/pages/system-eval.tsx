import React, { useEffect, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { 
  Activity, 
  DollarSign, 
  Cpu, 
  ShieldAlert, 
  RefreshCw, 
  Terminal, 
  Percent, 
  Layers, 
  Sparkles, 
  AlertTriangle,
  Play,
  CheckCircle,
  FileText,
  Search,
  Check,
  X
} from "lucide-react";
import { Header } from "../components/Header";

// Define Types for state
interface DashboardStats {
  total_runs: number;
  avg_latency_ms: number;
  avg_rag_ms: number;
  avg_llm_ms: number;
  avg_tokens: number;
  avg_cost_per_session: number;
  json_failures: number;
  security_incidents: number;
  error_rate: number;
  most_expensive_sessions: Array<{ candidate_id: string; total_cost: number }>;
  agent_metrics: Record<string, { avg_accuracy: number; avg_latency_ms: number; total_runs: number }>;
  accuracy_trend: Array<{ date: string; value: number }>;
  stability_trend: Array<{ date: string; value: number }>;
}

interface LogEntry {
  id: number;
  timestamp: string;
  interview_id: string;
  candidate_id: string;
  agent: string;
  model: string;
  cost: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    estimated_cost: number;
    session_cost: number;
  };
  latency: {
    retrieval_ms: number;
    llm_ms: number;
    evaluation_ms: number;
    total_ms: number;
  };
  accuracy: {
    rubric_retrieval: boolean;
    correct_bootcamp: boolean;
    valid_json: boolean;
    schema_valid: boolean;
    accuracy_score: number;
  };
  stability: {
    score_variance: number;
    retrieval_overlap: number;
    response_similarity: number;
    stability_score: number;
  };
  security: {
    prompt_injection_detected: boolean;
    jailbreak_detected: boolean;
    unsafe_content_detected: boolean;
    security_score: number;
  };
}

interface StabilityTestResult {
  score_variance: number;
  retrieval_overlap: number;
  response_similarity: number;
  stability_score: number;
  runs: Array<{
    run: number;
    question: string;
    score: number;
    rubrics: string[];
  }>;
}

export default function SystemEval() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Stability Test Form state
  const [testCandidateId, setTestCandidateId] = useState("");
  const [testMessage, setTestMessage] = useState("");
  const [runsCount, setRunsCount] = useState(3);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<StabilityTestResult | null>(null);
  const [testError, setTestError] = useState("");

  const backendUrl = "http://localhost:8000";

  // Check admin auth
  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (!userStr) {
      router.push("/login");
      return;
    }
    try {
      const user = JSON.parse(userStr);
      if (user.role !== "admin") {
        router.push("/");
      } else {
        setIsAdmin(true);
      }
    } catch (e) {
      router.push("/login");
    }
  }, [router]);

  // Fetch metrics and logs
  const fetchData = async () => {
    try {
      const statsRes = await fetch(`${backendUrl}/evaluation/dashboard`);
      const logsRes = await fetch(`${backendUrl}/evaluation/logs?limit=30`);
      
      if (statsRes.ok && logsRes.ok) {
        const statsData = await statsRes.json();
        const logsData = await logsRes.json();
        setStats(statsData);
        setLogs(logsData);
      }
    } catch (err) {
      console.error("Failed to load observability data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchData();
    }
  }, [isAdmin]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  // Run stability tests
  const handleRunStabilityTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testCandidateId || !testMessage) {
      setTestError("Please enter both Candidate ID and User Message.");
      return;
    }
    setTesting(true);
    setTestError("");
    setTestResult(null);

    try {
      const res = await fetch(`${backendUrl}/evaluation/run-stability-test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidate_id: testCandidateId,
          message: testMessage,
          runs_count: runsCount
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Stability test failed.");
      }

      const result = await res.json();
      setTestResult(result);
      // Automatically refresh main metrics after generating new stability logs
      fetchData();
    } catch (err: any) {
      setTestError(err.message || "Something went wrong.");
    } finally {
      setTesting(false);
    }
  };

  if (!isAdmin || loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-800 border-t-blue-500" />
          <span className="text-xs text-slate-400 font-semibold tracking-wider uppercase">Loading Dashboard...</span>
        </div>
      </div>
    );
  }

  // Pre-fill fields helper
  const prefillTest = (candidateId: string) => {
    setTestCandidateId(candidateId);
    setTestMessage("Explain the concept of decorators in Python and write a simple execution-time logger decorator.");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-blue-500/30 flex flex-col justify-between relative overflow-hidden">
      <Head>
        <title>System Observability Panel | AI Interview Agent</title>
        <meta name="description" content="Obsere latency, token, and security metrics for AI Interview Platform." />
      </Head>

      {/* Background Glows */}
      <div className="absolute top-0 right-1/4 h-[500px] w-[500px] rounded-full bg-blue-500/3 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 left-10 h-[500px] w-[500px] rounded-full bg-violet-500/3 blur-[120px] pointer-events-none" />

      <Header isDashboard={true} />

      <main className="max-w-7xl mx-auto px-6 py-8 w-full flex-grow relative z-10 space-y-8">
        
        {/* Title Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-900 pb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-blue-500/10 px-3 py-0.5 border border-blue-500/20 text-xs font-semibold text-blue-400 tracking-wide uppercase">
                System Quality & Reliability
              </span>
            </div>
            <h1 className="font-space text-3xl font-bold tracking-tight text-white mt-2">
              Observability & Performance Dashboard
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Real-time monitoring of RAG retrieval success, GenAI token consumption, latency overhead, and prompt guardrail logs.
            </p>
          </div>
          <div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-850 text-slate-200 border border-slate-800 rounded-lg text-sm transition-all shadow-sm active:scale-95"
            >
              <RefreshCw size={15} className={refreshing ? "animate-spin text-blue-400" : ""} />
              <span>{refreshing ? "Refreshing..." : "Refresh Observability"}</span>
            </button>
          </div>
        </div>

        {/* 1. Overview Grid */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            
            {/* Run Counts */}
            <div className="bg-slate-900/40 border border-slate-900 rounded-xl p-4 shadow-sm relative overflow-hidden backdrop-blur-md">
              <div className="absolute top-2 right-2 text-blue-500/10"><Activity size={40} /></div>
              <span className="text-xs text-slate-400 font-semibold tracking-wider uppercase">Total Runs</span>
              <p className="text-2xl font-bold font-space text-white mt-1">{stats.total_runs}</p>
              <span className="text-[10px] text-slate-500 mt-1 block">Candidate step interactions</span>
            </div>

            {/* Average Latency */}
            <div className="bg-slate-900/40 border border-slate-900 rounded-xl p-4 shadow-sm relative overflow-hidden backdrop-blur-md">
              <div className="absolute top-2 right-2 text-violet-500/10"><Cpu size={40} /></div>
              <span className="text-xs text-slate-400 font-semibold tracking-wider uppercase">Avg Latency</span>
              <p className="text-2xl font-bold font-space text-white mt-1">{stats.avg_latency_ms} ms</p>
              <span className="text-[10px] text-slate-500 mt-1 block">RAG + LLM end-to-end</span>
            </div>

            {/* Average RAG */}
            <div className="bg-slate-900/40 border border-slate-900 rounded-xl p-4 shadow-sm relative overflow-hidden backdrop-blur-md">
              <div className="absolute top-2 right-2 text-emerald-500/10"><Search size={40} /></div>
              <span className="text-xs text-slate-400 font-semibold tracking-wider uppercase">Avg RAG</span>
              <p className="text-2xl font-bold font-space text-white mt-1">{stats.avg_rag_ms} ms</p>
              <span className="text-[10px] text-slate-500 mt-1 block">Embedding & CSV Query</span>
            </div>

            {/* Average Tokens */}
            <div className="bg-slate-900/40 border border-slate-900 rounded-xl p-4 shadow-sm relative overflow-hidden backdrop-blur-md">
              <div className="absolute top-2 right-2 text-yellow-500/10"><Layers size={40} /></div>
              <span className="text-xs text-slate-400 font-semibold tracking-wider uppercase">Avg Tokens</span>
              <p className="text-2xl font-bold font-space text-white mt-1">{stats.avg_tokens}</p>
              <span className="text-[10px] text-slate-500 mt-1 block">Total tokens per step</span>
            </div>

            {/* Avg Session Cost */}
            <div className="bg-slate-900/40 border border-slate-900 rounded-xl p-4 shadow-sm relative overflow-hidden backdrop-blur-md">
              <div className="absolute top-2 right-2 text-rose-500/10"><DollarSign size={40} /></div>
              <span className="text-xs text-slate-400 font-semibold tracking-wider uppercase">Avg Session Cost</span>
              <p className="text-2xl font-bold font-space text-white mt-1">${stats.avg_cost_per_session.toFixed(4)}</p>
              <span className="text-[10px] text-slate-500 mt-1 block">Calculated Gemini 3.1 cost</span>
            </div>

            {/* Security Alerts */}
            <div className={`border rounded-xl p-4 shadow-sm relative overflow-hidden backdrop-blur-md transition-colors ${
              stats.security_incidents > 0 
                ? "bg-rose-950/20 border-rose-900/50" 
                : "bg-slate-900/40 border-slate-900"
            }`}>
              <div className="absolute top-2 right-2 text-red-500/15"><ShieldAlert size={40} /></div>
              <span className="text-xs text-slate-400 font-semibold tracking-wider uppercase">Security Flags</span>
              <p className={`text-2xl font-bold font-space mt-1 ${stats.security_incidents > 0 ? "text-rose-400" : "text-white"}`}>
                {stats.security_incidents}
              </p>
              <span className={`text-[10px] mt-1 block ${stats.security_incidents > 0 ? "text-rose-550 font-bold" : "text-slate-500"}`}>
                {stats.security_incidents > 0 ? "Injections / Jailbreaks Blocked" : "No active threats"}
              </span>
            </div>

          </div>
        )}

        {/* 2. Latency Splits & Charts */}
        {stats && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Latency breakdown progress */}
            <div className="bg-slate-900/30 border border-slate-900 rounded-2xl p-6 shadow-md backdrop-blur-md space-y-5 lg:col-span-1">
              <h3 className="font-space text-lg font-bold text-white flex items-center gap-2">
                <Cpu size={18} className="text-blue-400" /> Latency Overhead splits
              </h3>
              
              <div className="space-y-4">
                {/* RAG Retrieval */}
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-slate-350">RAG Semantic Retrieval</span>
                    <span className="text-slate-400">{stats.avg_rag_ms} ms</span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                      style={{ width: `${Math.min((stats.avg_rag_ms / Math.max(stats.avg_latency_ms, 1)) * 100, 100)}%` }}
                    />
                  </div>
                </div>

                {/* LLM Inference */}
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-slate-350">LLM Inference Duration</span>
                    <span className="text-slate-400">{stats.avg_llm_ms} ms</span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-violet-500 h-full rounded-full transition-all duration-500" 
                      style={{ width: `${Math.min((stats.avg_llm_ms / Math.max(stats.avg_latency_ms, 1)) * 100, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Evaluation agent or other */}
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-slate-350">Evaluation & Routing Node Logic</span>
                    <span className="text-slate-400">{Math.max(stats.avg_latency_ms - stats.avg_llm_ms - stats.avg_rag_ms, 0)} ms</span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-blue-500 h-full rounded-full transition-all duration-500" 
                      style={{ width: `${Math.min((Math.max(stats.avg_latency_ms - stats.avg_llm_ms - stats.avg_rag_ms, 0) / Math.max(stats.avg_latency_ms, 1)) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-900 pt-4 text-xs text-slate-500 space-y-1">
                <p>• Total steps are run sequentially in standard async context.</p>
                <p>• JSON schema validation failures: <span className="text-rose-455 font-bold">{stats.json_failures}</span></p>
                <p>• Overall framework error rate: <span className="text-slate-350 font-semibold">{(stats.error_rate * 100).toFixed(1)}%</span></p>
              </div>
            </div>

            {/* Trends Panel */}
            <div className="bg-slate-900/30 border border-slate-900 rounded-2xl p-6 shadow-md backdrop-blur-md lg:col-span-2 space-y-4">
              <h3 className="font-space text-lg font-bold text-white flex items-center gap-2">
                <Activity size={18} className="text-violet-400" /> Daily System Stability & Accuracy trends
              </h3>
              
              {/* Daily trend graph visualization using simple styled divs (pure CSS) */}
              {stats.accuracy_trend.length > 0 ? (
                <div className="h-48 flex items-end justify-between gap-2 border-b border-slate-800 pb-2 pt-4">
                  {stats.accuracy_trend.map((day, idx) => {
                    const accValue = day.value * 100;
                    const stabValue = (stats.stability_trend[idx]?.value || 0) * 100;
                    return (
                      <div key={day.date} className="flex-1 flex flex-col items-center group relative">
                        {/* Hover tooltip */}
                        <div className="absolute bottom-full mb-2 bg-slate-900 text-[10px] p-2 rounded-lg border border-slate-800 shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-20 pointer-events-none whitespace-nowrap">
                          <p className="font-bold text-white">{day.date}</p>
                          <p className="text-emerald-400">Accuracy: {accValue.toFixed(0)}%</p>
                          <p className="text-blue-400">Stability: {stabValue.toFixed(0)}%</p>
                        </div>
                        <div className="w-full flex items-end gap-1 justify-center h-32">
                          <div 
                            className="w-3 bg-emerald-500/70 hover:bg-emerald-500 rounded-t transition-all duration-300"
                            style={{ height: `${Math.max(accValue, 5)}%` }}
                          />
                          <div 
                            className="w-3 bg-blue-500/70 hover:bg-blue-500 rounded-t transition-all duration-300"
                            style={{ height: `${Math.max(stabValue, 5)}%` }}
                          />
                        </div>
                        <span className="text-[9px] text-slate-500 mt-2 font-mono">{day.date.split("-").slice(1).join("/")}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="h-48 border border-dashed border-slate-850 rounded-xl flex items-center justify-center text-slate-500 text-xs">
                  Aggregate daily statistics will appear here as interviews run
                </div>
              )}

              <div className="flex gap-4 text-xs">
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded bg-emerald-500" /> RAG Rubric Retrieval Accuracy</span>
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded bg-blue-500" /> Stability across repeated turns</span>
              </div>
            </div>

          </div>
        )}

        {/* 3. Stability Test Suite */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Stability form */}
          <div className="bg-slate-900/30 border border-slate-900 rounded-2xl p-6 shadow-md backdrop-blur-md lg:col-span-4 space-y-4">
            <h3 className="font-space text-lg font-bold text-white flex items-center gap-2">
              <Play size={18} className="text-blue-400" /> Run Stability Test Suite
            </h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              Test AI response stability by running a candidate turn repeated 3-10 times. Measures score variance, retrieved RAG overlaps, and generated response similarity.
            </p>

            <form onSubmit={handleRunStabilityTest} className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Candidate ID</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={testCandidateId}
                    onChange={(e) => setTestCandidateId(e.target.value)}
                    placeholder="Enter candidate session UUID"
                    className="flex-grow bg-slate-950 border border-slate-900 focus:border-blue-550 outline-none rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 transition-colors"
                  />
                  {logs.length > 0 && (
                    <button
                      type="button"
                      onClick={() => prefillTest(logs[0].candidate_id)}
                      className="px-2 py-2 bg-slate-850 hover:bg-slate-800 text-[10px] font-bold text-slate-300 rounded-lg transition-colors border border-slate-800"
                      title="Prefill from last log"
                    >
                      Autofill Last
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Simulated Answer / Message</label>
                <textarea
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  placeholder="e.g. I have 3 years of python experience doing web apps."
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-900 focus:border-blue-550 outline-none rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 transition-colors resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Repeated Turns count: {runsCount}</label>
                <input
                  type="range"
                  min="3"
                  max="10"
                  value={runsCount}
                  onChange={(e) => setRunsCount(parseInt(e.target.value))}
                  className="w-full h-1 bg-slate-850 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
                <div className="flex justify-between text-[9px] text-slate-500 mt-1 font-mono">
                  <span>3 runs</span>
                  <span>6 runs</span>
                  <span>10 runs</span>
                </div>
              </div>

              {testError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-2.5 rounded-lg text-xs flex items-start gap-1.5">
                  <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                  <span>{testError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={testing}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-850 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-all shadow-sm active:scale-95 flex items-center justify-center gap-1.5"
              >
                {testing ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" />
                    <span>Executing Stability Runs ({runsCount}x)...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={13} />
                    <span>Run Stability Test</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Stability test result presentation */}
          <div className="bg-slate-900/30 border border-slate-900 rounded-2xl p-6 shadow-md backdrop-blur-md lg:col-span-8 flex flex-col justify-between">
            {testResult ? (
              <div className="space-y-5 animate-in fade-in duration-300">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-850 pb-3 gap-2">
                  <div>
                    <h3 className="font-space text-lg font-bold text-white flex items-center gap-1.5">
                      <CheckCircle size={18} className="text-emerald-500" /> Stability Test Completed
                    </h3>
                    <p className="text-[10px] text-slate-500 mt-0.5 font-mono">Session: {testCandidateId}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">Overall score:</span>
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold tracking-wider font-space border ${
                      testResult.stability_score >= 0.85 
                        ? "bg-emerald-950/20 text-emerald-400 border-emerald-900/50"
                        : testResult.stability_score >= 0.70
                        ? "bg-yellow-950/20 text-yellow-400 border-yellow-900/50"
                        : "bg-rose-950/20 text-rose-400 border-rose-900/50"
                    }`}>
                      {testResult.stability_score.toFixed(2)} / 1.00
                    </span>
                  </div>
                </div>

                {/* Score breakdown parameters */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-slate-950 border border-slate-900 rounded-xl p-3.5">
                    <span className="text-[10px] text-slate-455 font-bold uppercase tracking-wider block">Score Variance</span>
                    <p className="text-xl font-bold font-space text-white mt-1">{testResult.score_variance.toFixed(4)}</p>
                    <span className="text-[9px] text-slate-500 block mt-1">Target: &lt; 0.05</span>
                  </div>
                  <div className="bg-slate-950 border border-slate-900 rounded-xl p-3.5">
                    <span className="text-[10px] text-slate-455 font-bold uppercase tracking-wider block">Retrieval Overlap</span>
                    <p className="text-xl font-bold font-space text-white mt-1">{(testResult.retrieval_overlap * 100).toFixed(0)}%</p>
                    <span className="text-[9px] text-slate-500 block mt-1">Jaccard context match</span>
                  </div>
                  <div className="bg-slate-950 border border-slate-900 rounded-xl p-3.5">
                    <span className="text-[10px] text-slate-455 font-bold uppercase tracking-wider block">Response Similarity</span>
                    <p className="text-xl font-bold font-space text-white mt-1">{(testResult.response_similarity * 100).toFixed(0)}%</p>
                    <span className="text-[9px] text-slate-500 block mt-1">TF-IDF cosine similarity</span>
                  </div>
                </div>

                {/* Runs Output List */}
                <div className="space-y-2.5">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Turn Generation Details</span>
                  <div className="max-h-56 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                    {testResult.runs.map((r) => (
                      <div key={r.run} className="bg-slate-950/60 border border-slate-900 p-3 rounded-xl space-y-2">
                        <div className="flex justify-between items-center text-[10px] font-bold text-slate-400">
                          <span className="text-blue-400 uppercase">Run #{r.run}</span>
                          <span className="bg-slate-900 border border-slate-850 px-2 py-0.5 rounded text-white font-mono">
                            Eval Score: {r.score.toFixed(1)}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed italic font-sans font-medium">
                          &quot;{r.question}&quot;
                        </p>
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {r.rubrics.map((rubric_cat) => (
                            <span key={rubric_cat} className="text-[8px] uppercase font-bold px-1.5 py-0.5 bg-slate-900 text-slate-450 border border-slate-850 rounded">
                              Rubric: {rubric_cat}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            ) : (
              <div className="h-full min-h-[300px] border border-dashed border-slate-850 rounded-2xl flex flex-col items-center justify-center text-center p-6 text-slate-500">
                <Terminal size={32} className="text-slate-600 mb-2" />
                <h4 className="font-space text-sm font-bold text-slate-400">Suite Ready for Execution</h4>
                <p className="text-xs max-w-sm mt-1">
                  Configure candidate state parameters on the left pane and launch stability validation sequence.
                </p>
              </div>
            )}
          </div>

        </div>

        {/* 4. Agent metrics & expensive sessions */}
        {stats && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Agent metrics table */}
            <div className="bg-slate-900/30 border border-slate-900 rounded-2xl p-6 shadow-md backdrop-blur-md space-y-4">
              <h3 className="font-space text-lg font-bold text-white flex items-center gap-1.5">
                <Layers size={18} className="text-blue-400" /> Observability stats by Agent node
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-900 text-slate-400 font-bold uppercase tracking-wider">
                      <th className="py-2.5">Agent/Logic</th>
                      <th className="py-2.5">Total Runs</th>
                      <th className="py-2.5">Avg Accuracy</th>
                      <th className="py-2.5">Avg Latency</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.keys(stats.agent_metrics).length > 0 ? (
                      Object.entries(stats.agent_metrics).map(([agentName, agentVal]) => (
                        <tr key={agentName} className="border-b border-slate-900/60 hover:bg-slate-900/20 text-slate-300">
                          <td className="py-3 font-mono font-semibold text-white">{agentName}</td>
                          <td className="py-3">{agentVal.total_runs}</td>
                          <td className="py-3 text-emerald-400 font-bold">{(agentVal.avg_accuracy * 100).toFixed(0)}%</td>
                          <td className="py-3">{agentVal.avg_latency_ms} ms</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="py-6 text-center text-slate-500 italic">No agent interactions logged yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Expensive sessions table */}
            <div className="bg-slate-900/30 border border-slate-900 rounded-2xl p-6 shadow-md backdrop-blur-md space-y-4">
              <h3 className="font-space text-lg font-bold text-white flex items-center gap-1.5">
                <DollarSign size={18} className="text-emerald-400" /> Top Cumulative Cost Screenings
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-900 text-slate-400 font-bold uppercase tracking-wider">
                      <th className="py-2.5">Candidate Session ID</th>
                      <th className="py-2.5">Total Cost</th>
                      <th className="py-2.5">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.most_expensive_sessions.length > 0 ? (
                      stats.most_expensive_sessions.map((row) => (
                        <tr key={row.candidate_id} className="border-b border-slate-900/60 hover:bg-slate-900/20 text-slate-300">
                          <td className="py-3 font-mono text-slate-400">{row.candidate_id}</td>
                          <td className="py-3 font-bold text-white">${row.total_cost.toFixed(4)}</td>
                          <td className="py-3">
                            <button
                              onClick={() => prefillTest(row.candidate_id)}
                              className="text-[10px] font-bold text-blue-400 hover:text-blue-300 border border-blue-500/20 hover:border-blue-500/40 bg-blue-500/5 px-2 py-1 rounded transition-colors"
                            >
                              Select for Stability Test
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="py-6 text-center text-slate-500 italic">No expensive sessions.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* 5. Logs list */}
        <div className="bg-slate-900/30 border border-slate-900 rounded-2xl p-6 shadow-md backdrop-blur-md space-y-4">
          <h3 className="font-space text-lg font-bold text-white flex items-center gap-1.5">
            <FileText size={18} className="text-blue-400" /> Recent System Evaluation Steps Log
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead>
                <tr className="border-b border-slate-900 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="py-2.5">Timestamp</th>
                  <th className="py-2.5">Agent</th>
                  <th className="py-2.5">Tokens (P/C)</th>
                  <th className="py-2.5">Cost</th>
                  <th className="py-2.5">Latency</th>
                  <th className="py-2.5">Accuracy</th>
                  <th className="py-2.5">Security Status</th>
                </tr>
              </thead>
              <tbody>
                {logs.length > 0 ? (
                  logs.map((log) => {
                    const totalTime = log.latency.total_ms;
                    const securityViolated = 
                      log.security.prompt_injection_detected || 
                      log.security.jailbreak_detected || 
                      log.security.unsafe_content_detected;
                    
                    return (
                      <tr key={log.id} className="border-b border-slate-900/60 hover:bg-slate-900/20 text-slate-300">
                        <td className="py-3 text-[11px] text-slate-400 font-mono">
                          {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </td>
                        <td className="py-3 font-semibold text-white font-mono">{log.agent}</td>
                        <td className="py-3 font-mono">
                          {log.cost.prompt_tokens} / {log.cost.completion_tokens}
                        </td>
                        <td className="py-3 font-mono text-emerald-450">${log.cost.estimated_cost.toFixed(5)}</td>
                        <td className="py-3 font-mono">{totalTime}ms</td>
                        <td className="py-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            log.accuracy.accuracy_score >= 0.8 
                              ? "bg-emerald-950/20 text-emerald-400" 
                              : "bg-red-950/20 text-red-400"
                          }`}>
                            {(log.accuracy.accuracy_score * 100).toFixed(0)}%
                          </span>
                        </td>
                        <td className="py-3">
                          {securityViolated ? (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-rose-455 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded w-max">
                              <ShieldAlert size={11} /> Flagged Action Blocked
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-450 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded w-max">
                              <Check size={11} /> Safe Transaction
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-slate-500 italic">No evaluation log records available. Make some candidate chats.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </main>

      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-550 z-10 bg-slate-950/50 backdrop-blur-sm">
        <p>© 2026 1 Min Scout. Observability Dashboard. All rights reserved.</p>
      </footer>
    </div>
  );
}
