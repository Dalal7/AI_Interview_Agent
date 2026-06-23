import React from "react";
import { CheckCircle2, Circle } from "lucide-react";

interface ProfileCompletionProps {
  percentage: number;
  phase: string;
  evidenceMap?: Record<string, { status: string; confidence: number; supporting_snippets: string[] }>;
}

export const ProfileCompletion: React.FC<ProfileCompletionProps> = ({ percentage, phase }) => {
  // Determine checked states from completion percentage
  // 25% increments match: Background, Skills, Projects, Education
  const isBackgroundDone = percentage >= 25;
  const isSkillsDone = percentage >= 50;
  const isProjectsDone = percentage >= 75;
  const isEducationDone = percentage >= 100;

  // Calculate SVG stroke parameters for circular progress
  const radius = 55;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-900 bg-white dark:bg-slate-900/80 p-6 backdrop-blur-md shadow-sm transition-colors duration-200">
      <h3 className="font-space font-semibold tracking-wide text-slate-800 dark:text-slate-100 text-base mb-4">
        Screening Progress
      </h3>

      {/* Radial Gauge */}
      <div className="relative flex items-center justify-center my-4">
        <svg className="w-28 h-28 transform -rotate-90">
          {/* Background track circle */}
          <circle
            cx="56"
            cy="56"
            r={radius}
            className="stroke-slate-100 dark:stroke-slate-800 fill-none"
            strokeWidth="8"
          />
          {/* Active progress track */}
          <circle
            cx="56"
            cy="56"
            r={radius}
            className="fill-none transition-all duration-700 ease-out"
            style={{ stroke: "var(--accent)" }}
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </svg>
        {/* Core Value Label */}
        <div className="absolute flex flex-col items-center justify-center">
          <span className="font-space text-2xl font-bold text-slate-800 dark:text-slate-50">{percentage}%</span>
          <span className="text-[9px] text-slate-455 dark:text-slate-400 font-bold tracking-wider uppercase mt-0.5">
            Complete
          </span>
        </div>
      </div>

      {/* Section Checklists */}
      <div className="mt-4 space-y-3">
        {/* Phase Indicator */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-805 pb-3 mb-2">
          <span className="text-[10px] font-bold tracking-wider uppercase text-slate-450 dark:text-slate-500">Current Phase</span>
          <span 
            className="rounded px-2 py-0.5 font-space text-[10px] font-bold uppercase"
            style={{
              backgroundColor: "var(--accent-light)",
              color: "var(--accent)"
            }}
          >
            {phase.replace("_", " ")}
          </span>
        </div>

        {/* Categories checklist */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs py-0.5 border-b border-slate-50 dark:border-slate-850/30 last:border-b-0">
            <span className={isBackgroundDone ? "text-slate-705 dark:text-slate-205 font-medium" : "text-slate-400 dark:text-slate-500"}>
              Background & Motivation
            </span>
            {isBackgroundDone ? (
              <CheckCircle2 size={13} className="accent-text" />
            ) : (
              <Circle size={13} className="text-slate-200 dark:text-slate-700" />
            )}
          </div>

          <div className="flex items-center justify-between text-xs py-0.5 border-b border-slate-50 dark:border-slate-850/30 last:border-b-0">
            <span className={isSkillsDone ? "text-slate-705 dark:text-slate-205 font-medium" : "text-slate-400 dark:text-slate-500"}>
              Languages & Core Skills
            </span>
            {isSkillsDone ? (
              <CheckCircle2 size={13} className="accent-text" />
            ) : (
              <Circle size={13} className="text-slate-200 dark:text-slate-700" />
            )}
          </div>

          <div className="flex items-center justify-between text-xs py-0.5 border-b border-slate-50 dark:border-slate-850/30 last:border-b-0">
            <span className={isProjectsDone ? "text-slate-705 dark:text-slate-205 font-medium" : "text-slate-400 dark:text-slate-500"}>
              Coding Project Experience
            </span>
            {isProjectsDone ? (
              <CheckCircle2 size={13} className="accent-text" />
            ) : (
              <Circle size={13} className="text-slate-200 dark:text-slate-700" />
            )}
          </div>

          <div className="flex items-center justify-between text-xs py-0.5 border-b border-slate-50 dark:border-slate-850/30 last:border-b-0">
            <span className={isEducationDone ? "text-slate-705 dark:text-slate-205 font-medium" : "text-slate-400 dark:text-slate-500"}>
              Education & Certifications
            </span>
            {isEducationDone ? (
              <CheckCircle2 size={13} className="accent-text" />
            ) : (
              <Circle size={13} className="text-slate-200 dark:text-slate-700" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

