import React from "react";
import { User, Bot, Volume2 } from "lucide-react";

interface MessageBubbleProps {
  role: "user" | "assistant";
  content: string;
  candidateName?: string;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ role, content, candidateName }) => {
  const isUser = role === "user";

  // Speak text out loud helper
  const speakText = (text: string) => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find((v) => v.lang.startsWith("en"));
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }
      
      window.speechSynthesis.speak(utterance);
    }
  };

  // Quick formatter to support basic double asterisks (bolds) and newlines
  const formatContent = (text: string) => {
    return text.split("\n").map((line, idx) => {
      // Replace **text** with <strong>text</strong>
      const parts = line.split(/(\*\*.*?\*\*)/g);
      const formattedLine = parts.map((part, pIdx) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={pIdx} className="accent-text font-semibold">{part.slice(2, -2)}</strong>;
        }
        return part;
      });
      return <span key={idx} className="block min-h-[1.2rem]">{formattedLine}</span>;
    });
  };

  return (
    <div
      className={`flex w-full items-start gap-4 mb-5 transition-all duration-300 animate-in fade-in slide-in-from-bottom-3 ${
        isUser ? "flex-row-reverse" : "flex-row"
      }`}
    >
      {/* Avatar Container */}
      <div
        className={`flex h-10 w-10 shrink-0 select-none items-center justify-center rounded-xl border text-sm font-bold shadow-sm ${
          isUser
            ? "border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 text-slate-650 dark:text-slate-350"
            : "accent-border accent-bg-light accent-text"
        }`}
      >
        {isUser ? <User size={18} /> : <Bot size={18} />}
      </div>

      {/* Message Box */}
      <div
        className={`flex max-w-[75%] flex-col gap-1 rounded-2xl px-5 py-3.5 shadow-md border ${
          isUser
            ? "rounded-tr-none border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-955/40 text-slate-800 dark:text-slate-250"
            : "rounded-tl-none border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 text-slate-750 dark:text-slate-200"
        }`}
      >
        <div className="flex items-center justify-between gap-4 text-[11px] font-semibold tracking-wider uppercase opacity-45 mb-1 text-slate-450 dark:text-slate-500">
          <span>{isUser ? (candidateName || "Candidate") : "Interview Agent"}</span>
          {!isUser && (
            <button
              onClick={() => speakText(content)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors p-0.5 rounded cursor-pointer"
              title="Speak message"
            >
              <Volume2 size={12} />
            </button>
          )}
        </div>
        <div className="space-y-1">{formatContent(content)}</div>
      </div>
    </div>
  );
};
