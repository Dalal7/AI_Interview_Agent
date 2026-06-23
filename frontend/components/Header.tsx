import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Sun, Moon, Palette, ChevronDown, Sparkles, LogIn, LogOut } from "lucide-react";

interface HeaderProps {
  isDashboard?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ isDashboard = false }) => {
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [accent, setAccent] = useState<string>("blue");
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    setIsLoggedIn(!!userStr);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("user");
    window.location.href = "/login";
  };

  const accents = [
    { name: "Blue (SaaS)", value: "blue", color: "#3b82f6", hover: "#2563eb", light: "rgba(59, 130, 246, 0.15)", glow: "rgba(59, 130, 246, 0.3)" },
    { name: "Indigo", value: "indigo", color: "#6366f1", hover: "#4f46e5", light: "rgba(99, 102, 241, 0.15)", glow: "rgba(99, 102, 241, 0.3)" },
    { name: "Violet", value: "violet", color: "#8b5cf6", hover: "#7c3aed", light: "rgba(139, 92, 246, 0.15)", glow: "rgba(139, 92, 246, 0.3)" },
    { name: "Emerald", value: "emerald", color: "#10b981", hover: "#059669", light: "rgba(16, 185, 129, 0.15)", glow: "rgba(16, 185, 129, 0.3)" },
    { name: "Amber", value: "amber", color: "#f59e0b", hover: "#d97706", light: "rgba(245, 158, 11, 0.15)", glow: "rgba(245, 158, 11, 0.3)" },
    { name: "Rose", value: "rose", color: "#f43f5e", hover: "#e11d48", light: "rgba(244, 63, 94, 0.15)", glow: "rgba(244, 63, 94, 0.3)" },
  ];

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Initialize theme and accent from localStorage
  useEffect(() => {
    const savedTheme = (localStorage.getItem("theme") as "light" | "dark") || "dark";
    const savedAccent = localStorage.getItem("accent") || "blue";

    setTheme(savedTheme);
    setAccent(savedAccent);

    applyTheme(savedTheme);
    applyAccent(savedAccent);
  }, []);

  const applyTheme = (t: "light" | "dark") => {
    if (t === "dark") {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
    } else {
      document.documentElement.classList.add("light");
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("theme", t);
  };

  const applyAccent = (accValue: string) => {
    const acc = accents.find((a) => a.value === accValue) || accents[0];
    const root = document.documentElement;
    root.style.setProperty("--accent", acc.color);
    root.style.setProperty("--accent-hover", acc.hover);
    root.style.setProperty("--accent-light", acc.light);
    root.style.setProperty("--accent-glow", acc.glow);
    localStorage.setItem("accent", accValue);
  };

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    applyTheme(nextTheme);
  };

  const handleAccentChange = (accValue: string) => {
    setAccent(accValue);
    applyAccent(accValue);
    setIsOpen(false);
  };

  const currentAccent = accents.find((a) => a.value === accent) || accents[0];

  return (
    <header className="border-b border-slate-200 bg-white/95 dark:border-slate-900 dark:bg-slate-950/95 backdrop-blur-md sticky top-0 z-50 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <div className="flex items-center gap-2.5">
          <Link href="/" className="flex items-center gap-2 group">
            <img 
              src="/logo.jpg" 
              alt="1 Min Scout Logo" 
              className="h-9 w-auto rounded-lg object-contain border border-slate-200 dark:border-slate-800 bg-white"
            />
            <span className="font-space text-lg font-bold tracking-wider text-slate-800 dark:text-slate-100 group-hover:opacity-90 ml-1">
              1 MIN SCOUT
            </span>
          </Link>
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center gap-4">
          {/* Accent Customizer Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-350 hover:text-slate-800 dark:hover:text-slate-200 rounded-lg border border-slate-200 dark:border-slate-850 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50 dark:bg-slate-900 transition-all duration-150"
            >
              <Palette size={13} style={{ color: currentAccent.color }} />
              <span className="capitalize">{accent}</span>
              <ChevronDown size={12} className={`opacity-60 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
            </button>

            {isOpen && (
              <div className="absolute right-0 mt-2 w-48 rounded-xl border border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-950 p-2 shadow-xl animate-in fade-in zoom-in duration-150">
                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
                  Accent Color
                </div>
                <div className="space-y-0.5">
                  {accents.map((acc) => (
                    <button
                      key={acc.value}
                      onClick={() => handleAccentChange(acc.value)}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors text-left ${
                        accent === acc.value
                          ? "bg-slate-100 dark:bg-slate-900 font-bold"
                          : "hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: acc.color }} />
                        <span>{acc.name.split(" ")[0]}</span>
                      </div>
                      {accent === acc.value && (
                        <span className="h-1 w-1 rounded-full accent-bg" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Light/Dark Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 text-slate-600 dark:text-slate-350 hover:text-slate-800 dark:hover:text-slate-200 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50 dark:bg-slate-900 transition-all duration-150"
            title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
          </button>

          {/* Navigation link */}
          {isDashboard ? (
            <>
              <Link
                href="/system-eval"
                className="hidden sm:flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 hover:accent-text transition-colors ml-2"
              >
                <span>System Observability</span>
              </Link>
              <Link
                href="/interview"
                className="hidden sm:flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 hover:accent-text transition-colors ml-2"
              >
                <span>Enter Interview Room</span>
              </Link>
            </>
          ) : null}

          {isLoggedIn && (
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-455 hover:bg-rose-500/10 rounded-lg border border-rose-500/20 bg-rose-500/5 hover:border-rose-500/40 transition-all duration-150 ml-2"
              title="Sign Out"
            >
              <LogOut size={13} />
              <span className="hidden sm:inline font-bold">Logout</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
