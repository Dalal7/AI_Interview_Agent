import React from "react";

interface RecommendationBadgeProps {
  recommendation: string;
}

export const RecommendationBadge: React.FC<RecommendationBadgeProps> = ({ recommendation }) => {
  const normRec = recommendation.toUpperCase().replace(/\s+/g, "_");

  let badgeStyles = "border-amber-200 dark:border-amber-500/20 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400";
  let textLabel = "Waitlist";

  if (normRec === "ACCEPT") {
    badgeStyles = "border-emerald-200 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
    textLabel = "Accept";
  } else if (normRec === "ACCEPT_WITH_CONDITIONS") {
    badgeStyles = "border-blue-200 dark:border-blue-500/20 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-450";
    textLabel = "Conditional";
  } else if (normRec === "REJECT") {
    badgeStyles = "border-rose-200 dark:border-rose-500/20 bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400";
    textLabel = "Reject";
  }

  return (
    <div
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase transition-all duration-300 ${badgeStyles}`}
    >
      <span className="mr-1.5 h-1 w-1 rounded-full bg-current animate-pulse" />
      {textLabel}
    </div>
  );
};
