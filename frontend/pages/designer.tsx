import React, { useState, useEffect, useRef } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { useBlueprintStore } from "../store/useBlueprintStore";
import { Header } from "../components/Header";
import { templates } from "../utils/templates";
import { 
  RotateCcw, RotateCw, Copy, ClipboardCheck,
  ListTodo, UserCheck, Sliders, BarChart3, ShieldAlert, Settings,
  SlidersHorizontal, Upload, Download, RefreshCw, Sparkles, Send,
  Trash2
} from "lucide-react";

// Component Imports
import ChatBuilder from "../components/designer/ChatBuilder";
import ProgramForm from "../components/designer/forms/ProgramForm";
import ProfileForm from "../components/designer/forms/ProfileForm";
import CompetenciesForm from "../components/designer/forms/CompetenciesForm";
import SkillsForm from "../components/designer/forms/SkillsForm";
import StructureForm from "../components/designer/forms/StructureForm";
import RubricForm from "../components/designer/forms/RubricForm";
import ScoringForm from "../components/designer/forms/ScoringForm";
import DecisionsForm from "../components/designer/forms/DecisionsForm";
import AgentForm from "../components/designer/forms/AgentForm";

type TabName = 
  | "program" 
  | "profile" 
  | "competencies" 
  | "skills" 
  | "structure" 
  | "rubric" 
  | "scoring" 
  | "decisions" 
  | "agent";

export default function DesignerPage() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  
  const {
    blueprint,
    past,
    future,
    validationReport,
    loadedSource,
    setBlueprint,
    setLoadedSource,
    loadTemplate,
    undo,
    redo,
    reset,
    fetchBlueprint,
    publishBlueprint,
    deleteBlueprint
  } = useBlueprintStore();

  // Tab State
  const [activeTab, setActiveTab] = useState<TabName>("program");
  
  // JSON Previewer State
  const [jsonText, setJsonText] = useState("");
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [isEditingJson, setIsEditingJson] = useState(false);

  // Toast / Copy Notification State
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Admin access validation and data pre-fetch
  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (!userStr) {
      router.push("/login");
      return;
    }
    try {
      const user = JSON.parse(userStr);
      if (user.role !== "admin") {
        router.push("/login");
        return;
      }
      setIsAdmin(true);
      fetchBlueprint();
    } catch (e) {
      router.push("/login");
    }
  }, [router, fetchBlueprint]);

  // Keep JSON string preview in sync with blueprint object
  useEffect(() => {
    if (!isEditingJson) {
      setJsonText(JSON.stringify(blueprint, null, 2));
    }
  }, [blueprint, isEditingJson]);

  // Toast auto-clear
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
  };

  // Bi-directional JSON editor input handler
  const handleJsonChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setJsonText(val);
    try {
      const parsed = JSON.parse(val);
      setBlueprint(parsed);
      setJsonError(null);
    } catch (err: any) {
      setJsonError(err?.message || "Invalid JSON syntax");
    }
  };

  // Copy to Clipboard
  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(blueprint, null, 2));
    triggerToast("Copied JSON to clipboard!");
  };

  // Download JSON file
  const handleDownloadJson = () => {
    const blob = new Blob([JSON.stringify(blueprint, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${blueprint.program.name.toLowerCase().replace(/\s+/g, "-") || "interview"}-blueprint.json`;
    link.click();
    URL.revokeObjectURL(url);
    triggerToast("Downloaded blueprint JSON!");
  };

  // File Import handler
  const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        setBlueprint(parsed, true);
        setLoadedSource(file.name);
        triggerToast("Imported blueprint successfully!");
      } catch (err) {
        alert("Failed to parse JSON file: " + err);
      }
    };
    reader.readAsText(file);
    e.target.value = ""; // reset input
  };

  const handlePublish = async () => {
    try {
      await publishBlueprint();
      triggerToast("Blueprint successfully published to active SQLite database!");
    } catch (err: any) {
      alert("Failed to publish blueprint: " + err.message || err);
    }
  };

  const handleClearDatabase = async () => {
    if (confirm("Are you sure you want to revert to the default codebase configurations? This will delete the active custom blueprint from the SQLite database.")) {
      try {
        await deleteBlueprint();
        triggerToast("Successfully cleared database blueprint! Reverted to code defaults.");
      } catch (err: any) {
        alert("Failed to delete blueprint: " + (err.message || err));
      }
    }
  };

  const tabsList: { id: TabName; label: string; icon: React.ReactNode }[] = [
    { id: "program", label: "Program Profile", icon: <ListTodo size={14} /> },
    { id: "profile", label: "Target Audience", icon: <UserCheck size={14} /> },
    { id: "competencies", label: "Competencies", icon: <Sliders size={14} /> },
    { id: "skills", label: "Skill Matrices", icon: <SlidersHorizontal size={14} /> },
    { id: "structure", label: "Structure", icon: <ListTodo size={14} /> },
    { id: "rubric", label: "Evaluation Rubric", icon: <BarChart3 size={14} /> },
    { id: "scoring", label: "Scoring Weighting", icon: <BarChart3 size={14} /> },
    { id: "decisions", label: "Threshold Decisions", icon: <ShieldAlert size={14} /> },
    { id: "agent", label: "Agent Properties", icon: <Settings size={14} /> }
  ];

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="text-slate-500 dark:text-slate-400 text-sm">Verifying access credentials...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans flex flex-col justify-between relative overflow-hidden transition-colors duration-200">
      <Head>
        <title>Interview Designer | 1 Min Scout Platform</title>
        <meta name="description" content="AI-guided technical interview compiler and designer." />
      </Head>

      {/* Global Background Glows */}
      <div className="absolute top-0 left-1/4 h-[500px] w-[500px] rounded-full bg-blue-500/3 dark:bg-blue-500/2 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 h-[500px] w-[500px] rounded-full bg-indigo-500/3 dark:bg-indigo-500/2 blur-[120px] pointer-events-none" />

      {/* Header */}
      <Header isDashboard={true} />

      {/* Designer-specific Header Toolbar */}
      <div className="bg-white/80 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-850 px-6 py-3 flex flex-wrap items-center justify-between gap-4 backdrop-blur-md z-10">
        <div className="flex items-center gap-3">
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Active Workspace Source: <strong className="text-slate-700 dark:text-slate-200">{loadedSource || "Unsaved Local State"}</strong>
          </span>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Templates dropdown */}
          <select 
            className="form-select text-xs py-1.5 px-3 bg-slate-150 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-lg focus:outline-none"
            value={templates.find(t => t.name === loadedSource)?.id || (loadedSource ? "custom" : "")}
            onChange={(e) => {
              const val = e.target.value;
              if (val === "custom") return;
              if (val) {
                loadTemplate(val);
                triggerToast(`Loaded ${templates.find(t => t.id === val)?.name} Template`);
              } else {
                reset();
              }
            }}
          >
            <option value="">Load Role Template...</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
            {loadedSource && !templates.some(t => t.name === loadedSource) && (
              <option value="custom" disabled>{loadedSource}</option>
            )}
          </select>

          {/* Import/Export buttons */}
          <button className="btn secondary flex items-center gap-1 text-xs py-1.5 px-3" onClick={() => fileInputRef.current?.click()}>
            <Upload size={13} /> Import JSON
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleImportFileChange} 
            accept=".json" 
            style={{ display: "none" }} 
          />

          <button className="btn secondary flex items-center gap-1 text-xs py-1.5 px-3" onClick={handleDownloadJson}>
            <Download size={13} /> Export JSON
          </button>

          <button className="btn secondary flex items-center gap-1 text-xs py-1.5 px-3" onClick={reset}>
            <RefreshCw size={13} /> Reset Local
          </button>

          <button className="btn secondary flex items-center gap-1 text-xs py-1.5 px-3 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-950 hover:bg-rose-50 dark:hover:bg-rose-950/20" onClick={handleClearDatabase}>
            <Trash2 size={13} /> Revert DB to Defaults
          </button>

          <div className="h-6 w-px bg-slate-200 dark:bg-slate-800" />

          {/* SAVE/PUBLISH BTN */}
          <button 
            className="btn primary flex items-center gap-1 text-xs py-1.5 px-4 font-bold accent-bg" 
            onClick={handlePublish}
            disabled={!validationReport.isValid}
            title={!validationReport.isValid ? "Correct all errors before publishing" : "Save configuration changes to backend SQLite store"}
          >
            Publish Blueprint
          </button>
        </div>
      </div>

      {/* Main Workspace Layout */}
      <div className="flex-grow relative z-10">
        <div className="designer-app-container">
          {/* Toast Message banner */}
          {toastMessage && (
            <div className="toast-msg">
              <ClipboardCheck size={16} className="text-emerald-500" />
              <span>{toastMessage}</span>
            </div>
          )}

          <div className="main-workspace">
            {/* Left Column: Chat compiler */}
            <ChatBuilder triggerToast={triggerToast} />

            {/* Middle Column: Tabbed form */}
            <section className="workspace-panel glass-panel">
              <div className="editor-tabs-scroll">
                <div className="editor-tabs">
                  {tabsList.map((t) => (
                    <button
                      key={t.id}
                      className={`tab-btn ${activeTab === t.id ? "active" : ""}`}
                      onClick={() => setActiveTab(t.id)}
                    >
                      {t.icon}
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="panel-content">
                {activeTab === "program" && <ProgramForm />}
                {activeTab === "profile" && <ProfileForm />}
                {activeTab === "competencies" && <CompetenciesForm />}
                {activeTab === "skills" && <SkillsForm />}
                {activeTab === "structure" && <StructureForm />}
                {activeTab === "rubric" && <RubricForm />}
                {activeTab === "scoring" && <ScoringForm />}
                {activeTab === "decisions" && <DecisionsForm />}
                {activeTab === "agent" && <AgentForm />}
              </div>
            </section>

            {/* Right Column: Code viewer & diagnostic warnings */}
            <section className="workspace-panel glass-panel">
              <div className="history-toolbar">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Code & Synchronization Logs
                </span>
                <div className="history-buttons">
                  <button 
                    type="button" 
                    className="icon-btn" 
                    onClick={undo} 
                    disabled={past.length === 0}
                    style={{ width: "30px", height: "30px" }}
                    title="Undo last modification"
                  >
                    <RotateCcw size={12} />
                  </button>
                  <button 
                    type="button" 
                    className="icon-btn" 
                    onClick={redo} 
                    disabled={future.length === 0}
                    style={{ width: "30px", height: "30px" }}
                    title="Redo next modification"
                  >
                    <RotateCw size={12} />
                  </button>
                </div>
              </div>

              <div className="preview-container">
                <div className="preview-json-wrap" style={{ border: jsonError ? "1px solid #f43f5e" : "1px solid rgba(255, 255, 255, 0.08)" }}>
                  <textarea
                    className="preview-json"
                    value={jsonText}
                    onChange={handleJsonChange}
                    onFocus={() => setIsEditingJson(true)}
                    onBlur={() => setIsEditingJson(false)}
                    spellCheck="false"
                  />

                  <div className="preview-overlay-btn">
                    <button type="button" className="btn secondary text-[10px] py-1 px-2.5 h-[26px]" onClick={handleCopyJson}>
                      <Copy size={11} /> Copy JSON
                    </button>
                  </div>

                  {jsonError && (
                    <div style={{
                      position: "absolute",
                      bottom: 0,
                      left: 0,
                      right: 0,
                      background: "rgba(239, 68, 68, 0.15)",
                      color: "#f43f5e",
                      padding: "8px 12px",
                      fontSize: "0.7rem",
                      borderTop: "1px solid rgba(239, 68, 68, 0.25)",
                      backdropFilter: "blur(6px)"
                    }}>
                      Syntax Error: {jsonError}
                    </div>
                  )}
                </div>

                {/* Validation list */}
                <div className="validation-container">
                  {validationReport.warnings.length === 0 && Object.keys(validationReport.errors).length === 0 ? (
                    <div className="validation-header success-state text-emerald-500">
                      <span className="flex items-center gap-1">
                        ✓ Blueprint Status: Valid & Ready to Publish
                      </span>
                    </div>
                  ) : (
                    <>
                      <div className="validation-header text-amber-500">
                        <span>Diagnostics: ({validationReport.warnings.length + Object.keys(validationReport.errors).length} issues found)</span>
                      </div>
                      
                      {/* Errors */}
                      {Object.entries(validationReport.errors).map(([path, err]) => (
                        <div key={path} className="warning-item">
                          <span className="warning-bullet text-rose-500">•</span>
                          <span className="text-slate-300 dark:text-slate-100 font-semibold">[{path}]:</span>
                          <span className="text-rose-550 dark:text-rose-400">{err}</span>
                        </div>
                      ))}

                      {/* Warnings */}
                      {validationReport.warnings.map((w, idx) => (
                        <div key={idx} className="warning-item">
                          <span className="warning-bullet text-amber-500">•</span>
                          <span className="text-slate-400 dark:text-slate-350">{w}</span>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
      
      <footer className="border-t border-slate-200 dark:border-slate-900 py-4 text-center text-xs text-slate-400 dark:text-slate-500 z-10 bg-white/50 dark:bg-slate-950/50 backdrop-blur-sm">
        <p>© 2026 1 Min Scout. All rights reserved.</p>
      </footer>
    </div>
  );
}
