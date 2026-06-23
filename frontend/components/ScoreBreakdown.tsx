import React from "react";

interface ScoreBreakdownProps {
  technical: number;
  depth: number;
  clarity: number;
  relevance: number;
}

export const ScoreBreakdown: React.FC<ScoreBreakdownProps> = ({
  technical,
  depth,
  clarity,
  relevance
}) => {
  const metrics = [
    { label: "Technical Accuracy", val: technical },
    { label: "Depth of Understanding", val: depth },
    { label: "Communication Clarity", val: clarity },
    { label: "Relevance & Focus", val: relevance }
  ];

  return (
    <div className="space-y-4">
      {metrics.map((m, idx) => {
        // Map 1-5 scale to percentage (e.g. 5 = 100%, 1 = 20%)
        const percent = (m.val / 5.0) * 100;
        
        return (
          <div key={idx} className="space-y-1.5 animate-in fade-in duration-300">
            <div className="flex items-center justify-between text-xs font-medium">
              <span className="text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px]">
                {m.label}
              </span>
              <span className="font-space text-slate-800 dark:text-slate-100 font-bold">
                {m.val.toFixed(1)} / 5.0
              </span>
            </div>
            
            {/* Progress Track */}
            <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden shadow-inner">
              <div
                className="h-full rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${percent}%`, backgroundColor: "var(--accent)" }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};
