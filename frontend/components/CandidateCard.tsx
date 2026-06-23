import React from "react";
import { Calendar, Mail, Award } from "lucide-react";
import { RecommendationBadge } from "./RecommendationBadge";
import { CandidateSummary } from "../services/api";

interface CandidateCardProps {
  candidate: CandidateSummary;
  isSelected: boolean;
  onSelect: () => void;
}

export const CandidateCard: React.FC<CandidateCardProps> = ({
  candidate,
  isSelected,
  onSelect
}) => {
  const formattedDate = new Date(candidate.created_at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });

  return (
    <div
      onClick={onSelect}
      style={isSelected ? {
        borderColor: "var(--accent)",
        backgroundColor: "var(--accent-light)",
        boxShadow: "0 0 15px var(--accent-glow)"
      } : {}}
      className={`group cursor-pointer rounded-xl border p-5 transition-all duration-300 ${
        isSelected
          ? ""
          : "border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-900/30 hover:border-slate-350 dark:hover:border-slate-800 hover:bg-slate-50/80 dark:hover:bg-slate-900"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        {/* Profile Identity */}
        <div>
          <h4 className="font-space text-base font-bold text-slate-800 dark:text-slate-100 transition-colors group-hover:accent-text">
            {candidate.candidate_name}
          </h4>
          <p className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-1">
            <Mail size={12} />
            {candidate.email}
          </p>
        </div>
        {/* Recommendation pill */}
        <RecommendationBadge recommendation={candidate.recommendation} />
      </div>

      {/* Skills & Metrics */}
      <div className="mt-4 flex flex-wrap gap-1.5">
        {candidate.skills.slice(0, 3).map((skill, idx) => (
          <span
            key={idx}
            className="rounded bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide border border-slate-200 dark:border-slate-750"
          >
            {skill}
          </span>
        ))}
        {candidate.skills.length > 3 && (
          <span className="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[9px] font-semibold text-slate-400 dark:text-slate-450 border border-slate-200 dark:border-transparent">
            +{candidate.skills.length - 3} more
          </span>
        )}
      </div>

      <div className="border-t border-slate-100 dark:border-slate-800/60 mt-4 pt-3 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-1">
          <Calendar size={12} />
          {formattedDate}
          {candidate.email_sent && (
            <span className="ml-2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-450 border border-emerald-500/20 px-1 py-0.5 text-[8px] font-bold uppercase tracking-wide">
              Emailed
            </span>
          )}
        </span>
        <span className="flex items-center gap-1 font-space font-bold text-slate-700 dark:text-slate-200">
          <Award size={13} className="accent-text" />
          Score: {candidate.overall_score.toFixed(1)}
        </span>
      </div>
    </div>
  );
};
