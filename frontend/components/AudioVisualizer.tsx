import React from "react";

interface AudioVisualizerProps {
  state: "speaking" | "listening" | "thinking" | "idle";
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ state }) => {
  // Generate a set of bars for the waveform
  const barCount = 18;
  const bars = Array.from({ length: barCount }, (_, i) => i);

  // Helper to determine status messages
  const getStatusLabel = () => {
    switch (state) {
      case "speaking":
        return "Agent is speaking...";
      case "listening":
        return "Listening to you...";
      case "thinking":
        return "Agent is thinking...";
      case "idle":
      default:
        return "Connecting voice...";
    }
  };

  // Helper for background colors based on voice state
  const getOrbClasses = () => {
    switch (state) {
      case "speaking":
        return "accent-bg accent-glow shadow-[0_0_50px_var(--accent)] scale-110";
      case "listening":
        return "bg-rose-500 shadow-[0_0_50px_rgba(244,63,94,0.6)] animate-pulse scale-105";
      case "thinking":
        return "bg-indigo-500 shadow-[0_0_50px_rgba(99,102,241,0.6)] animate-spin-slow";
      case "idle":
      default:
        return "bg-slate-400 dark:bg-slate-700 shadow-none scale-100";
    }
  };

  return (
    <div className="flex flex-col items-center justify-center py-10 relative overflow-hidden min-h-[350px]">
      {/* Dynamic Keyframes Injection */}
      <style jsx global>{`
        @keyframes wave-bounce {
          0%, 100% { transform: scaleY(0.2); }
          50% { transform: scaleY(1.0); }
        }
        @keyframes orb-breath {
          0%, 100% { transform: scale(1); opacity: 0.85; }
          50% { transform: scale(1.15); opacity: 0.95; }
        }
        @keyframes rotate-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: rotate-slow 6s linear infinite;
        }
        .wave-bar {
          transform-origin: center;
          transition: height 0.3s ease, background-color 0.3s ease;
        }
      `}</style>

      {/* Ambient background glows */}
      <div className={`absolute inset-0 transition-opacity duration-1000 pointer-events-none rounded-full blur-[100px] opacity-20 ${
        state === "speaking" ? "bg-blue-500" :
        state === "listening" ? "bg-rose-500" :
        state === "thinking" ? "bg-indigo-500" : "bg-transparent"
      }`} />

      {/* Central Visualizer Orb */}
      <div className="relative mb-12 flex items-center justify-center z-10">
        {/* Breathing Outer Ring */}
        {state !== "idle" && (
          <div 
            className={`absolute h-36 w-36 rounded-full border border-dashed opacity-40 transition-all duration-700 ${
              state === "speaking" ? "accent-border animate-ping" :
              state === "listening" ? "border-rose-500 animate-pulse" :
              "border-indigo-400"
            }`}
            style={{
              animationDuration: state === "speaking" ? "3s" : "2s"
            }}
          />
        )}
        
        {/* Core Glowing Orb */}
        <div 
          className={`h-24 w-24 rounded-full flex items-center justify-center transition-all duration-500 ease-out z-10 ${getOrbClasses()}`}
          style={{
            animation: state === "listening" ? "orb-breath 1.5s ease-in-out infinite" : undefined
          }}
        >
          {/* Internal core light */}
          <div className="h-8 w-8 rounded-full bg-white/35 blur-md" />
        </div>
      </div>

      {/* Reactive Soundwave Bars */}
      <div className="flex items-center gap-1.5 h-16 mb-8 justify-center z-10 w-full px-6">
        {bars.map((i) => {
          // Compute offsets and delays for waves
          const delay = `${i * 0.1}s`;
          const baseHeight = state === "idle" ? "6px" : "12px";
          
          let animationStyle = {};
          let barBg = "bg-slate-300 dark:bg-slate-800";

          if (state === "speaking") {
            animationStyle = {
              animation: `wave-bounce 0.8s ease-in-out infinite alternate`,
              animationDelay: delay,
            };
            barBg = "accent-bg";
          } else if (state === "listening") {
            animationStyle = {
              animation: `wave-bounce 1.4s ease-in-out infinite alternate`,
              animationDelay: delay,
            };
            barBg = "bg-rose-500";
          } else if (state === "thinking") {
            animationStyle = {
              animation: `wave-bounce 2s ease-in-out infinite alternate`,
              animationDelay: delay,
            };
            barBg = "bg-indigo-400 dark:bg-indigo-500";
          }

          return (
            <div
              key={i}
              className={`w-1 rounded-full transition-all duration-300 wave-bar ${barBg}`}
              style={{
                height: state === "idle" ? baseHeight : "100%",
                maxHeight: "48px",
                minHeight: "6px",
                ...animationStyle
              }}
            />
          );
        })}
      </div>

      {/* Status Indicators */}
      <div className="text-center z-10">
        <h4 className={`font-space font-bold tracking-wide uppercase text-sm mb-1.5 transition-colors duration-300 ${
          state === "speaking" ? "accent-text" :
          state === "listening" ? "text-rose-500" :
          state === "thinking" ? "text-indigo-400" :
          "text-slate-400"
        }`}>
          {getStatusLabel()}
        </h4>
        <p className="text-xs text-slate-405 dark:text-slate-400 max-w-xs mx-auto animate-pulse">
          {state === "listening" ? "Speak clearly. Dictation will submit automatically once you pause." :
           state === "speaking" ? "Listen to the agent's question." :
           state === "thinking" ? "Orchestrator is matching bank collection evidence..." :
           "Switching audio modules..."}
        </p>
      </div>
    </div>
  );
};
