import React, { useState, useEffect, useRef } from "react";
import { Send, Bot, Info, Sparkles, Volume2, VolumeX, Mic, MicOff, Phone, PhoneOff, Eye, EyeOff, MessageSquare } from "lucide-react";
import { MessageBubble } from "./MessageBubble";
import { AudioVisualizer } from "./AudioVisualizer";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ChatWindowProps {
  messages: Message[];
  onSendMessage: (msg: string) => void;
  isLoading: boolean;
  isCompleted: boolean;
  candidateName?: string;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  messages,
  onSendMessage,
  isLoading,
  isCompleted,
  candidateName
}) => {
  const [inputText, setInputText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const [isSpeechEnabled, setIsSpeechEnabled] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Live Talking Mode States
  const [isLiveMode, setIsLiveMode] = useState(true);
  const [voiceState, setVoiceState] = useState<"speaking" | "listening" | "thinking" | "idle">("idle");
  const [showLiveSubtitles, setShowLiveSubtitles] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  const isLiveModeRef = useRef(isLiveMode);
  const isMutedRef = useRef(isMuted);
  const transcribedTextRef = useRef("");
  const accumulatedTranscriptRef = useRef("");
  const silenceTimerRef = useRef<any>(null);

  // Keep references synced to avoid stale closures in event listeners
  useEffect(() => {
    isLiveModeRef.current = isLiveMode;
  }, [isLiveMode]);

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  // Load voices on mount to ensure list is populated
  useEffect(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }
  }, []);

  // Speech Recognition (Speech-to-Text) Initialization
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const rec = new SpeechRecognition();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = "en-US";

        rec.onstart = () => {
          setIsListening(true);
          if (isLiveModeRef.current) {
            setVoiceState("listening");
          }
        };

        rec.onend = () => {
          setIsListening(false);
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
          }

          const finalSpeech = transcribedTextRef.current.trim();
          transcribedTextRef.current = ""; // Reset
          accumulatedTranscriptRef.current = ""; // Reset

          // Hands-free loop auto-submission once speech stops
          if (isLiveModeRef.current && !isMutedRef.current && finalSpeech) {
            setInputText("");
            setVoiceState("thinking");
            onSendMessage(finalSpeech);
          } else {
            if (isLiveModeRef.current) {
              setVoiceState("idle");
            }
          }
        };

        rec.onerror = (event: any) => {
          console.error("Speech recognition error:", event.error);
          setIsListening(false);
          if (isLiveModeRef.current) {
            setVoiceState("idle");
          }
        };

        rec.onresult = (event: any) => {
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
          }

          let interimTranscript = "";
          let finalTranscript = "";

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            } else {
              interimTranscript += event.results[i][0].transcript;
            }
          }

          // Combine with already accumulated text
          const currentText = (accumulatedTranscriptRef.current + " " + finalTranscript + " " + interimTranscript).trim();
          setInputText(currentText);
          transcribedTextRef.current = currentText; // Update ref for safety

          if (finalTranscript) {
            accumulatedTranscriptRef.current = (accumulatedTranscriptRef.current + " " + finalTranscript).trim();
          }

          // Restart silence timer in live mode to allow natural pauses (2.5 seconds pause threshold)
          if (isLiveModeRef.current) {
            silenceTimerRef.current = setTimeout(() => {
              rec.stop(); // Stop recording and submit
            }, 2500); 
          }
        };

        recognitionRef.current = rec;
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Text-To-Speech Playback function
  const speakText = (text: string) => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95; // Natural conversational pace
      utterance.pitch = 1.0;
      
      const voices = window.speechSynthesis.getVoices();
      const englishVoices = voices.filter((v) => v.lang.startsWith("en"));
      
      // Select natural sounding voice fallback list
      const premiumVoice = englishVoices.find(
        (v) =>
          v.name.toLowerCase().includes("siri") ||
          v.name.toLowerCase().includes("enhanced") ||
          v.name.toLowerCase().includes("alex") ||
          v.name.toLowerCase().includes("google") ||
          v.name.toLowerCase().includes("natural") ||
          v.name.toLowerCase().includes("premium")
      ) || englishVoices.find(
        (v) =>
          v.name.includes("Samantha") ||
          v.name.includes("Daniel") ||
          v.name.includes("Microsoft David") ||
          v.name.includes("Microsoft Zira")
      ) || englishVoices[0] || voices[0];
      
      if (premiumVoice) {
        utterance.voice = premiumVoice;
      }

      utterance.onstart = () => {
        if (isLiveModeRef.current) {
          setVoiceState("speaking");
        }
      };

      utterance.onend = () => {
        if (isLiveModeRef.current) {
          setVoiceState("listening");
          // Automatically trigger microphone listening when agent finishes speaking!
          startMicrophone();
        }
      };

      utterance.onerror = () => {
        if (isLiveModeRef.current) {
          setVoiceState("idle");
        }
      };

      window.speechSynthesis.speak(utterance);
    }
  };

  // Speak agent questions when a new message is received and TTS is enabled
  useEffect(() => {
    if (messages.length === 0 || !isSpeechEnabled) return;

    const lastMessage = messages[messages.length - 1];
    if (lastMessage.role === "assistant") {
      speakText(lastMessage.content);
    }
  }, [messages, isSpeechEnabled]);

  // Sync voice state with backend loading state
  useEffect(() => {
    if (isLoading && isLiveMode) {
      setVoiceState("thinking");
    }
  }, [isLoading, isLiveMode]);

  const startMicrophone = () => {
    if (recognitionRef.current && !isListening && !isMutedRef.current) {
      try {
        transcribedTextRef.current = ""; // Reset transcript before start
        accumulatedTranscriptRef.current = "";
        setInputText("");
        recognitionRef.current.start();
      } catch (err) {
        console.error("Failed to start speech recognition automatically:", err);
      }
    }
  };

  const toggleSpeech = () => {
    const nextVal = !isSpeechEnabled;
    setIsSpeechEnabled(nextVal);
    if (!nextVal && typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  };

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("Speech recognition is not supported in this browser. Please try Google Chrome or Safari.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      try {
        transcribedTextRef.current = "";
        accumulatedTranscriptRef.current = "";
        setInputText("");
        recognitionRef.current.start();
      } catch (err) {
        console.error("Failed to start speech recognition:", err);
      }
    }
  };

  // Toggle Live Talking Mode
  const toggleLiveMode = () => {
    const nextVal = !isLiveMode;
    setIsLiveMode(nextVal);
    
    if (nextVal) {
      // Force Speech Playback and clear inputs
      setIsSpeechEnabled(true);
      setInputText("");
      transcribedTextRef.current = "";
      accumulatedTranscriptRef.current = "";
      setVoiceState("speaking");
      setIsMuted(false);
      
      // Speak the last agent message to start the hands-free loop
      if (messages.length > 0) {
        const lastMessage = messages[messages.length - 1];
        if (lastMessage.role === "assistant") {
          speakText(lastMessage.content);
        } else {
          setVoiceState("thinking");
        }
      }
    } else {
      // Cancel speech synthesis & recognition on exit
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      setIsListening(false);
      setVoiceState("idle");
    }
  };

  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    
    if (nextMuted) {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      setIsListening(false);
      if (isLiveMode) {
        setVoiceState("idle");
      }
    } else {
      if (isLiveMode) {
        setVoiceState("listening");
        // Start listening again!
        setTimeout(() => {
          startMicrophone();
        }, 100);
      }
    }
  };

  // Auto scroll to bottom
  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading || isCompleted) return;

    onSendMessage(inputText.trim());
    setInputText("");

    // Stop speaking if candidate submits a reply
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  };



  return (
    <div className="flex h-full min-h-[600px] flex-col rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/50 backdrop-blur-md shadow-lg dark:shadow-2xl overflow-hidden transition-colors duration-200">
      {/* Chat Header */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-805 px-6 py-4 bg-white/80 dark:bg-slate-900/80">
        <div className="flex items-center gap-2.5">
          <div className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
          </div>
          <div>
            <h3 className="font-space text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wide">
              {isLiveMode ? "Voice Screening Active" : "Interview Screening Room"}
            </h3>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Live Talking Mode Toggle */}
          {!isCompleted && (
            <button
              type="button"
              onClick={toggleLiveMode}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all duration-150 cursor-pointer ${
                isLiveMode
                  ? "bg-rose-500/10 text-rose-600 border-rose-500/20"
                  : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-350 hover:text-slate-800 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700"
              }`}
              title={isLiveMode ? "Switch to Text Mode" : "Switch to Live Talking Mode"}
            >
              {isLiveMode ? <MessageSquare size={13} /> : <Phone size={13} />}
              <span>{isLiveMode ? "Text Chat" : "Live Talk"}</span>
            </button>
          )}

          {/* Voice Mode Toggle (only shown in Text Mode) */}
          {!isLiveMode && (
            <button
              type="button"
              onClick={toggleSpeech}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all duration-150 cursor-pointer ${
                isSpeechEnabled
                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                  : "bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:text-slate-850 dark:hover:text-slate-200"
              }`}
              title={isSpeechEnabled ? "Disable Voice Feedback" : "Enable Voice Feedback"}
            >
              {isSpeechEnabled ? <Volume2 size={13} /> : <VolumeX size={13} />}
              <span>Voice Feedback</span>
            </button>
          )}

          <div 
            className="flex items-center gap-1 rounded-full px-3 py-1 border text-xs font-semibold"
            style={{
              backgroundColor: "var(--accent-light)",
              color: "var(--accent)",
              borderColor: "var(--accent-glow)"
            }}
          >
            <Sparkles size={12} className="accent-stroke" />
            <span>Active Session</span>
          </div>
        </div>
      </div>

      {isLiveMode ? (
        /* LIVE TALK INTERFACE OVERLAY */
        <div className="flex-1 flex flex-col justify-between bg-slate-50/50 dark:bg-slate-950/60 animate-in fade-in duration-300 relative">
          
          {/* Top visualizer module */}
          <div className="flex-1 flex items-center justify-center">
            <AudioVisualizer state={voiceState} />
          </div>

          {/* Real-time Subtitles Caption Bar */}
          {showLiveSubtitles && (
            <div className="mx-6 mb-6 p-4 rounded-xl border border-slate-100 dark:border-slate-900 bg-white dark:bg-slate-900/60 min-h-[72px] flex items-center justify-center text-center animate-in fade-in duration-300 shadow-sm">
              <p className="text-xs text-slate-600 dark:text-slate-350 max-w-lg leading-relaxed italic">
                {voiceState === "speaking" ? (
                  <span>
                    <strong className="accent-text not-italic uppercase font-semibold mr-1.5 text-[9px] tracking-wide">AI Agent:</strong>
                    {messages[messages.length - 1]?.content || "..."}
                  </span>
                ) : voiceState === "listening" ? (
                  <span>
                    <strong className="text-rose-500 not-italic uppercase font-semibold mr-1.5 text-[9px] tracking-wide">You:</strong>
                    {inputText || "Speak response..."}
                  </span>
                ) : voiceState === "thinking" ? (
                  <span className="accent-text animate-pulse font-space font-medium not-italic text-[11px] tracking-widest uppercase">Thinking...</span>
                ) : (
                  <span className="text-slate-400 dark:text-slate-600">Awaiting audio input...</span>
                )}
              </p>
            </div>
          )}

          {/* Voice dashboard controls panel */}
          <div className="flex items-center justify-center gap-6 py-5 bg-white/80 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-805">
            {/* Toggle Subtitles */}
            <button
              type="button"
              onClick={() => setShowLiveSubtitles(!showLiveSubtitles)}
              className={`flex h-11 w-11 items-center justify-center rounded-full border transition-all duration-150 cursor-pointer ${
                showLiveSubtitles
                  ? "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 shadow-sm"
                  : "bg-slate-50 dark:bg-slate-950 border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              }`}
              title={showLiveSubtitles ? "Hide Subtitles" : "Show Subtitles"}
            >
              {showLiveSubtitles ? <Eye size={18} /> : <EyeOff size={18} />}
            </button>

            {/* Mute Mic */}
            <button
              type="button"
              onClick={toggleMute}
              className={`flex h-12 w-12 items-center justify-center rounded-full border transition-all duration-150 cursor-pointer ${
                isMuted
                  ? "bg-rose-500 border-rose-600 text-white shadow-lg shadow-rose-500/20"
                  : "bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-750 dark:text-slate-350 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm"
              }`}
              title={isMuted ? "Unmute Microphone" : "Mute Microphone"}
            >
              {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
            </button>

            {/* End Call / Return to Text */}
            <button
              type="button"
              onClick={toggleLiveMode}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-650 hover:bg-rose-700 text-white shadow-lg shadow-rose-650/30 transition-all duration-150 cursor-pointer hover:rotate-90"
              title="Exit Live Voice Mode"
            >
              <PhoneOff size={18} />
            </button>
          </div>

        </div>
      ) : (
        /* STANDARD TEXT INTERFACE */
        <>
          {/* Message List */}
          <div className="flex-1 overflow-y-auto px-6 py-6 scrollbar-thin">
            {messages.map((msg, idx) => (
              <MessageBubble key={idx} role={msg.role} content={msg.content} candidateName={candidateName} />
            ))}

            {/* Typing Loading Indicator */}
            {isLoading && (
              <div className="flex items-start gap-4 mb-5 animate-pulse">
                <div 
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border text-sm font-bold shadow-sm"
                  style={{
                    backgroundColor: "var(--accent-light)",
                    color: "var(--accent)",
                    borderColor: "var(--accent-glow)"
                  }}
                >
                  <Bot size={18} className="animate-bounce" />
                </div>
                <div className="rounded-2xl rounded-tl-none border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 px-5 py-4 shadow-sm text-slate-500 dark:text-slate-400 flex items-center gap-2">
                  <span className="text-xs font-medium tracking-wide">AI Screener is typing...</span>
                  <div className="flex gap-1">
                    <span className="h-1.5 w-1.5 rounded-full accent-bg animate-bounce delay-100" />
                    <span className="h-1.5 w-1.5 rounded-full accent-bg animate-bounce delay-200" />
                    <span className="h-1.5 w-1.5 rounded-full accent-bg animate-bounce delay-300" />
                  </div>
                </div>
              </div>
            )}
            <div ref={scrollRef} />
          </div>



          {/* Input Tray */}
          <div className="border-t border-slate-200 dark:border-slate-800 px-6 py-5 bg-white/80 dark:bg-slate-900/80 relative">
            {isCompleted ? (
              <div 
                className="flex items-center justify-center py-2.5 border rounded-xl px-4 text-center"
                style={{
                  backgroundColor: "var(--accent-light)",
                  borderColor: "var(--accent-glow)"
                }}
              >
                <p className="text-xs accent-text font-semibold tracking-wide flex items-center gap-2">
                  <Sparkles size={14} className="animate-pulse" />
                  Interview Completed Successfully
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={toggleListening}
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition-all duration-200 cursor-pointer ${
                    isListening
                      ? "bg-rose-500/10 border-rose-500/30 text-rose-500 animate-pulse accent-glow"
                      : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                  }`}
                  title={isListening ? "Listening... Click to Stop" : "Speak your response"}
                >
                  <Mic size={16} />
                </button>
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  disabled={isLoading}
                  placeholder={isListening ? "Listening to your voice..." : "Provide your response here..."}
                  className="flex-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 py-3 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 shadow-inner focus:outline-none accent-ring disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={!inputText.trim() || isLoading}
                  className="flex h-11 w-11 items-center justify-center rounded-xl accent-bg accent-bg-hover text-white font-bold transition-all accent-glow disabled:opacity-40 disabled:shadow-none"
                >
                  <Send size={16} />
                </button>
              </form>
            )}
          </div>
        </>
      )}
    </div>
  );
};
