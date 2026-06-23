import React, { useState, useEffect } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { 
  Sparkles, Search, User, Filter, AlertCircle, Award, 
  BookOpen, Terminal, CheckCircle2, XCircle, FileText, MessageSquare 
} from "lucide-react";
import { apiService, CandidateSummary, CandidateProfile, InterviewLog } from "../services/api";
import { CandidateCard } from "../components/CandidateCard";
import { ScoreBreakdown } from "../components/ScoreBreakdown";
import { RecommendationBadge } from "../components/RecommendationBadge";
import { Header } from "../components/Header";

export default function DashboardPage() {
  const router = useRouter();
  const [candidates, setCandidates] = useState<CandidateSummary[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRec, setFilterRec] = useState("ALL");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  
  const [selectedProfile, setSelectedProfile] = useState<CandidateProfile | null>(null);
  const [selectedLogs, setSelectedLogs] = useState<InterviewLog[]>([]);
  const [activeTab, setActiveTab] = useState<"report" | "profile" | "transcript">("report");

  const [isLoadingList, setIsLoadingList] = useState(true);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  // Authenticate user and check role
  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (!userStr) {
      router.push("/login");
      return;
    }
    try {
      const user = JSON.parse(userStr);
      if (user.role !== "admin") {
        router.push("/interview");
        return;
      }
      setIsChecking(false);
    } catch (e) {
      router.push("/login");
    }
  }, [router]);

  // Fetch candidate list on mount
  useEffect(() => {
    if (!isChecking) {
      fetchCandidates();
    }
  }, [isChecking]);

  // Fetch detail dossier when selected candidate changes
  useEffect(() => {
    if (selectedId) {
      fetchCandidateDossier(selectedId);
    }
  }, [selectedId]);

  const fetchCandidates = async () => {
    setIsLoadingList(true);
    setError(null);
    try {
      const data = await apiService.getCandidates();
      setCandidates(data);
      if (data.length > 0 && !selectedId) {
        setSelectedId(data[0].id);
      }
    } catch (err: any) {
      setError(err.message || "Failed to retrieve applicants list.");
    } finally {
      setIsLoadingList(false);
    }
  };

  const fetchCandidateDossier = async (id: string) => {
    setIsLoadingDetail(true);
    try {
      const data = await apiService.getCandidateEvaluation(id);
      setSelectedProfile(data.profile);
      setSelectedLogs(data.logs);
    } catch (err: any) {
      console.error("Failed to load details:", err);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  // Filter candidates list
  const filteredCandidates = candidates.filter((c) => {
    const matchesSearch = c.candidate_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          c.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filterRec === "ALL") return matchesSearch;
    return matchesSearch && c.recommendation.toUpperCase() === filterRec.toUpperCase();
  });

  // Helper to parse JSON strings from DB safely
  const parseJsonField = (val: any, defaultVal: any = {}) => {
    if (!val) return defaultVal;
    if (typeof val === "object") return val;
    try {
      return JSON.parse(val);
    } catch (e) {
      return defaultVal;
    }
  };

  // Format final assessment markdown into JSX paragraphs
  const formatMarkdown = (text: string | null) => {
    if (!text) return <p className="text-slate-550 dark:text-slate-400">No assessment report generated.</p>;
    
    return text.split("\n").map((line, idx) => {
      if (line.startsWith("### ")) {
        return <h3 key={idx} className="font-space text-slate-800 dark:text-slate-100 text-lg font-bold mt-6 mb-3 border-b border-slate-100 dark:border-slate-800 pb-2">{line.replace("### ", "")}</h3>;
      }
      if (line.startsWith("#### ")) {
        return <h4 key={idx} className="font-space text-slate-700 dark:text-slate-200 text-sm font-bold uppercase tracking-wider mt-5 mb-2 accent-text">{line.replace("#### ", "")}</h4>;
      }
      if (line.startsWith("**") && line.endsWith("**")) {
        return <p key={idx} className="font-semibold text-slate-700 dark:text-slate-200 mt-2">{line.replace(/\*\*/g, "")}</p>;
      }
      if (line.startsWith("* **") || line.startsWith("- **")) {
        // Bullet header
        const cleaned = line.replace(/^\* \*\*/, "").replace(/^- \*\*/, "").replace(/\*\*/, "");
        return <li key={idx} className="ml-4 list-disc text-sm text-slate-650 dark:text-slate-300 my-1">{cleaned}</li>;
      }
      if (line.startsWith("  - ") || line.startsWith("  * ") || line.startsWith("- ")) {
        return <li key={idx} className="ml-6 list-disc text-sm text-slate-650 dark:text-slate-300 my-1">{line.replace(/^(\s*[-*]\s+)/, "")}</li>;
      }
      if (line.trim() === "---") {
        return <hr key={idx} className="border-slate-100 dark:border-slate-800 my-4" />;
      }
      return <p key={idx} className="text-sm text-slate-650 dark:text-slate-300 leading-relaxed my-2">{line}</p>;
    });
  };

  if (isChecking) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-300 dark:border-slate-800 border-t-blue-500" />
          <span className="text-xs text-slate-400 font-semibold tracking-wider uppercase">Verifying Admin Privileges...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans selection:bg-blue-500/35 transition-colors duration-200">
      <Head>
        <title>Admissions Board | 1 Min Scout</title>
        <meta name="description" content="Dashboard for recruiting panels to review automated screens." />
      </Head>

      {/* Global Background Glows */}
      <div className="absolute top-0 right-1/4 h-[500px] w-[500px] rounded-full bg-blue-500/5 dark:bg-blue-500/3 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 h-[500px] w-[500px] rounded-full bg-indigo-500/5 dark:bg-indigo-500/3 blur-[120px] pointer-events-none" />

      {/* Navigation Header */}
      <Header isDashboard={true} />

      {/* Dashboard Grid Workspace */}
      <main className="max-w-7xl mx-auto px-6 py-8 relative">
        {error && (
          <div className="mb-6 rounded-xl border border-rose-500/25 bg-rose-505/10 p-4 text-xs text-rose-500">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Candidates Sidebar (4/12 cols) */}
          <div className="lg:col-span-4 space-y-5">
            <div className="rounded-xl border border-slate-200 dark:border-slate-900 bg-white dark:bg-slate-900/40 p-4 space-y-4 shadow-sm">
              <h3 className="font-space font-bold text-slate-800 dark:text-slate-200 text-sm uppercase tracking-wider">
                Applicant Queue
              </h3>
              
              {/* Search Bar */}
              <div className="relative">
                <Search size={14} className="absolute left-3.5 top-3.5 text-slate-400 dark:text-slate-500" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search name or email..."
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-850 bg-slate-50 dark:bg-slate-950 pl-9 pr-4 py-2.5 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-650 focus:border-slate-400 dark:focus:border-slate-700 focus:outline-none"
                />
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-2 border-t border-slate-100 dark:border-slate-800/60 pt-3">
                <Filter size={12} className="text-slate-450 dark:text-slate-500" />
                <div className="flex flex-wrap gap-1">
                  {["ALL", "ACCEPT", "WAITLIST", "REJECT"].map((rec) => (
                    <button
                      key={rec}
                      onClick={() => setFilterRec(rec)}
                      className={`rounded px-2.5 py-1 text-[9px] font-bold tracking-wide uppercase transition-colors border ${
                        filterRec === rec
                          ? "accent-bg border-transparent text-white shadow-sm"
                          : "bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-450 border-slate-200 dark:border-transparent hover:text-slate-750 dark:hover:text-slate-200"
                      }`}
                    >
                      {rec}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Candidates Feed */}
            <div className="space-y-3 overflow-y-auto max-h-[600px] pr-1 scrollbar-thin">
              {isLoadingList ? (
                <div className="py-12 text-center text-xs text-slate-400 dark:text-slate-500">Loading queue...</div>
              ) : filteredCandidates.length === 0 ? (
                <div className="py-12 text-center border border-dashed border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-900/10 rounded-xl">
                  <AlertCircle size={20} className="mx-auto text-slate-400 dark:text-slate-600 mb-2" />
                  <p className="text-xs text-slate-500">No completed applicants found.</p>
                </div>
              ) : (
                filteredCandidates.map((cand) => (
                  <CandidateCard
                    key={cand.id}
                    candidate={cand}
                    isSelected={selectedId === cand.id}
                    onSelect={() => setSelectedId(cand.id)}
                  />
                ))
              )}
            </div>
          </div>

          {/* Right Column: Detailed Evaluation Dossier (8/12 cols) */}
          <div className="lg:col-span-8">
            {isLoadingDetail ? (
              <div className="h-[500px] rounded-2xl border border-slate-200 dark:border-slate-900 bg-white dark:bg-slate-900/10 flex items-center justify-center shadow-sm">
                <div className="text-slate-500 dark:text-slate-400 text-xs flex items-center gap-2">
                  <span className="animate-spin h-4 w-4 border-2 border-slate-400 dark:border-slate-500 border-t-transparent rounded-full" />
                  Compiling dossier details...
                </div>
              </div>
            ) : !selectedProfile ? (
              <div className="h-[500px] rounded-2xl border border-dashed border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-900/10 flex flex-col items-center justify-center p-8 text-center shadow-sm">
                <User size={36} className="text-slate-300 dark:text-slate-700 mb-3" />
                <h4 className="font-space text-slate-600 dark:text-slate-300 font-bold">No candidate selected</h4>
                <p className="text-slate-450 dark:text-slate-500 text-xs max-w-sm mt-1">
                  Select an applicant from the queue on the left to review their structured profile, evaluation breakdown, and chat history.
                </p>
              </div>
            ) : (
              /* Profile Dossier Board */
              <div className="rounded-2xl border border-slate-200 dark:border-slate-900 bg-white dark:bg-slate-900/40 backdrop-blur-md shadow-lg dark:shadow-2xl overflow-hidden animate-in fade-in slide-in-from-right-4 duration-500">
                {/* Profile Header */}
                <div className="bg-slate-50/50 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="font-space text-xl font-bold text-slate-900 dark:text-slate-50">
                      {selectedProfile.candidate_name}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-450 mt-1">{selectedProfile.email}</p>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-[10px] text-slate-450 dark:text-slate-500 font-bold uppercase tracking-wider">Overall Mark</p>
                      <p className="font-space text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5 justify-end">
                        <Award size={16} className="accent-text" />
                        {selectedProfile.overall_score.toFixed(1)} / 5.0
                      </p>
                    </div>
                    <RecommendationBadge recommendation={selectedProfile.recommendation} />
                  </div>
                </div>

                {/* Admissions Controls Bar */}
                <div className="bg-slate-100/50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Admissions Status:</span>
                    <select
                      value={selectedProfile.recommendation}
                      onChange={async (e) => {
                        const newRec = e.target.value;
                        try {
                          await apiService.updateCandidateStatus(selectedProfile.id, newRec);
                          // Update local state
                          setSelectedProfile({ ...selectedProfile, recommendation: newRec });
                          // Also update list state
                          setCandidates(candidates.map(c => c.id === selectedProfile.id ? { ...c, recommendation: newRec } : c));
                        } catch (err: any) {
                          alert(err.message || "Failed to update status");
                        }
                      }}
                      className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 font-bold"
                    >
                      <option value="ACCEPT">ACCEPT</option>
                      <option value="WAITLIST">WAITLIST</option>
                      <option value="REJECT">REJECT</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        setIsSendingEmail(true);
                        try {
                          await apiService.sendResultsEmail(selectedProfile.id);
                          setSelectedProfile({ ...selectedProfile, email_sent: true });
                          // Update list state
                          setCandidates(candidates.map(c => c.id === selectedProfile.id ? { ...c, email_sent: true } : c));
                          alert("Results email sent successfully to candidate!");
                        } catch (err: any) {
                          alert(err.message || "Failed to send email");
                        } finally {
                          setIsSendingEmail(false);
                        }
                      }}
                      disabled={isSendingEmail}
                      className={`rounded-lg px-4 py-1.5 text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer ${
                        selectedProfile.email_sent
                          ? "bg-slate-105 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"
                          : "bg-blue-600 hover:bg-blue-700 text-white font-bold"
                      }`}
                    >
                      {isSendingEmail ? "Sending..." : selectedProfile.email_sent ? "Resend Results Email" : "Send Results Email"}
                    </button>
                  </div>
                </div>

                {/* Navigation Tabs */}
                <div className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/20 dark:bg-slate-905/20 px-6 flex gap-4">
                  {(["report", "profile", "transcript"] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`py-3.5 text-xs font-bold uppercase tracking-wider border-b-2 px-1 transition-all flex items-center gap-1.5 ${
                        activeTab === tab
                          ? "accent-border accent-text font-semibold"
                          : "border-transparent text-slate-500 dark:text-slate-450 hover:text-slate-700 dark:hover:text-slate-300"
                      }`}
                    >
                      {tab === "report" && <><FileText size={13} /> Admissions Report</>}
                      {tab === "profile" && <><User size={13} /> Extracted Profile</>}
                      {tab === "transcript" && <><MessageSquare size={13} /> Chat Dialogue</>}
                    </button>
                  ))}
                </div>

                {/* Tab Content Panels */}
                <div className="p-6 max-h-[600px] overflow-y-auto scrollbar-thin">
                  {/* Tab 1: Admissions Report */}
                  {activeTab === "report" && (
                    <div className="space-y-4 animate-in fade-in duration-350">
                      <div className="rounded-xl border border-slate-200 dark:border-slate-900 bg-white dark:bg-slate-950 p-6 shadow-inner">
                        {formatMarkdown(selectedProfile.final_evaluation)}
                      </div>
                    </div>
                  )}

                  {/* Tab 2: Profile Extraction Details */}
                  {activeTab === "profile" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-350">
                      {/* Left: Metadata */}
                      <div className="space-y-5">
                        <div className="rounded-xl border border-slate-200 dark:border-slate-805 bg-slate-50/50 dark:bg-slate-900/20 p-5 space-y-3.5 shadow-sm">
                          <h4 className="font-space text-slate-800 dark:text-slate-100 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 accent-text">
                            <BookOpen size={13} /> Background & Education
                          </h4>
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">Education Details</span>
                            <p className="text-xs text-slate-650 dark:text-slate-300 mt-1 leading-relaxed">
                              {typeof selectedProfile.education === "object"
                                ? (Object.keys(selectedProfile.education).length > 0 ? JSON.stringify(selectedProfile.education) : "No details shared.")
                                : (selectedProfile.education || "No details shared.")}
                            </p>
                          </div>
                          <div className="border-t border-slate-200 dark:border-slate-800/50 pt-3">
                            <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">Professional Background</span>
                            <p className="text-xs text-slate-650 dark:text-slate-300 mt-1 leading-relaxed">
                              {typeof selectedProfile.background === "object"
                                ? (Object.keys(selectedProfile.background).length > 0 ? JSON.stringify(selectedProfile.background) : "No details shared.")
                                : (selectedProfile.background || "No details shared.")}
                            </p>
                          </div>
                        </div>

                        {/* Strengths & Weaknesses */}
                        <div className="rounded-xl border border-slate-200 dark:border-slate-805 bg-slate-50/50 dark:bg-slate-900/20 p-5 space-y-3.5 shadow-sm">
                          <h4 className="font-space text-slate-800 dark:text-slate-100 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 accent-text">
                            <Terminal size={13} /> Core Capabilities
                          </h4>
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 mb-1.5 block">Strengths</span>
                            <div className="space-y-1">
                              {selectedProfile.strengths && selectedProfile.strengths.length > 0 ? (
                                selectedProfile.strengths.map((str, idx) => (
                                  <div key={idx} className="flex gap-2 text-xs text-slate-600 dark:text-slate-350">
                                    <CheckCircle2 size={13} className="text-emerald-500 shrink-0 mt-0.5" />
                                    <span>{str}</span>
                                  </div>
                                ))
                              ) : (
                                <p className="text-xs text-slate-450 dark:text-slate-500">No strengths logged.</p>
                              )}
                            </div>
                          </div>
                          <div className="border-t border-slate-200 dark:border-slate-800/50 pt-3">
                            <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 mb-1.5 block">Weaknesses/Gaps</span>
                            <div className="space-y-1">
                              {selectedProfile.weaknesses && selectedProfile.weaknesses.length > 0 ? (
                                selectedProfile.weaknesses.map((weak, idx) => (
                                  <div key={idx} className="flex gap-2 text-xs text-slate-605 dark:text-slate-355">
                                    <XCircle size={13} className="text-rose-500 shrink-0 mt-0.5" />
                                    <span>{weak}</span>
                                  </div>
                                ))
                              ) : (
                                <p className="text-xs text-slate-450 dark:text-slate-500">No weaknesses logged.</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Right: Technical Ratings & Tech Keywords */}
                      <div className="space-y-5">
                        {/* Score Breakdown Sliders */}
                        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 p-5 space-y-4 shadow-sm">
                          <h4 className="font-space text-slate-800 dark:text-slate-100 text-xs font-bold uppercase tracking-wider accent-text">
                            Screening Score Metrics
                          </h4>
                          <ScoreBreakdown
                            technical={selectedLogs.length > 0 ? selectedLogs.reduce((acc, l) => acc + l.technical_score, 0) / selectedLogs.length : 3.0}
                            depth={selectedLogs.length > 0 ? selectedLogs.reduce((acc, l) => acc + l.technical_score, 0) / selectedLogs.length : 3.0} 
                            clarity={selectedLogs.length > 0 ? selectedLogs.reduce((acc, l) => acc + l.communication_score, 0) / selectedLogs.length : 3.0}
                            relevance={selectedLogs.length > 0 ? selectedLogs.reduce((acc, l) => acc + l.relevance_score, 0) / selectedLogs.length : 3.0}
                          />
                        </div>

                        {/* Extracted Projects & Skills */}
                        <div className="rounded-xl border border-slate-200 dark:border-slate-805 bg-slate-50/50 dark:bg-slate-900/20 p-5 space-y-3.5 shadow-sm">
                          <h4 className="font-space text-slate-800 dark:text-slate-100 text-xs font-bold uppercase tracking-wider accent-text">
                            Extracted Tech Stack
                          </h4>
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 mb-1.5 block">Skills Detected</span>
                            <div className="flex flex-wrap gap-1.5">
                              {selectedProfile.skills && selectedProfile.skills.length > 0 ? (
                                selectedProfile.skills.map((skill, idx) => (
                                  <span key={idx} className="rounded bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs text-slate-650 dark:text-slate-350 border border-slate-200 dark:border-slate-750">
                                    {skill}
                                  </span>
                                ))
                              ) : (
                                <p className="text-xs text-slate-450 dark:text-slate-500">No skills logged.</p>
                              )}
                            </div>
                          </div>
                          <div className="border-t border-slate-200 dark:border-slate-800/50 pt-3">
                            <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 mb-1.5 block">Coding Projects</span>
                            <div className="space-y-2">
                              {selectedProfile.projects && selectedProfile.projects.length > 0 ? (
                                selectedProfile.projects.map((proj, idx) => (
                                  <div key={idx} className="text-xs bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-850 rounded p-2.5 text-slate-650 dark:text-slate-300 leading-relaxed shadow-sm">
                                    {proj}
                                  </div>
                                ))
                              ) : (
                                <p className="text-xs text-slate-450 dark:text-slate-500">No project details shared.</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Tab 3: Chat Dialogue Transcript */}
                  {activeTab === "transcript" && (
                    <div className="space-y-6 animate-in fade-in duration-350">
                      {selectedLogs.map((log, idx) => (
                        <div key={idx} className="border border-slate-200 dark:border-slate-850 rounded-xl overflow-hidden shadow-sm">
                          {/* Dialogue Q&A turn */}
                          <div className="bg-slate-50 dark:bg-slate-900/50 px-5 py-3 border-b border-slate-200 dark:border-slate-850 flex items-center justify-between text-xs text-slate-500 dark:text-slate-450">
                            <span className="font-bold">Dialogue Turn #{idx + 1}</span>
                            <span className="font-space font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-2.5 py-0.5 rounded border border-indigo-500/20">
                              Question Score: {log.question_score.toFixed(1)} / 5.0
                            </span>
                          </div>

                          <div className="p-4 space-y-3 bg-white dark:bg-slate-900/10">
                            <div>
                              <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-500">Interviewer Prompt</span>
                              <p className="text-xs text-slate-700 dark:text-slate-200 mt-1 leading-relaxed">{log.question}</p>
                            </div>
                            <div className="border-t border-slate-100 dark:border-slate-850/50 pt-2.5">
                              <span className="text-[10px] uppercase font-bold accent-text font-semibold">Candidate Response</span>
                              <p className="text-xs text-slate-650 dark:text-slate-350 mt-1 leading-relaxed bg-slate-50 dark:bg-slate-950/40 p-2.5 rounded border border-slate-200 dark:border-slate-900 italic">
                                "{log.answer || "No response recorded."}"
                              </p>
                            </div>
                          </div>

                          {/* Individual question breakdown */}
                          <div className="bg-slate-50/50 dark:bg-slate-900/30 px-5 py-3 border-t border-slate-200 dark:border-slate-850 grid grid-cols-3 gap-4 text-[10px] uppercase text-slate-500 dark:text-slate-450 font-bold tracking-wider">
                            <div>Tech Score: <span className="text-slate-800 dark:text-slate-300 font-space">{log.technical_score.toFixed(1)}</span></div>
                            <div>Clarity Score: <span className="text-slate-800 dark:text-slate-300 font-space">{log.communication_score.toFixed(1)}</span></div>
                            <div>Relevance: <span className="text-slate-800 dark:text-slate-300 font-space">{log.relevance_score.toFixed(1)}</span></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
