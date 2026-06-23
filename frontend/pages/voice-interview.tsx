import React, { useEffect, useMemo, useRef, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  Headphones,
  Mic,
  MicOff,
  PhoneOff,
  Radio,
  Send,
  Sparkles,
  Volume2,
  VolumeX,
} from "lucide-react";
import { LiveKitRoom, RoomAudioRenderer, useVoiceAssistant, BarVisualizer, useTrackToggle } from "@livekit/components-react";
import { Track } from "livekit-client";
import { Header } from "../components/Header";
import { apiService, LiveKitTokenResponse, LiveSessionCreateResponse, MessageResponse } from "../services/api";

type SetupStep = "mic" | "customize" | "session";
type AgentState = "Preparing" | "Listening" | "Thinking" | "Speaking" | "Offline";

const voices = [
  { name: "Puck", label: "Puck (Male - Upbeat & Lively)" },
  { name: "Aoede", label: "Aoede (Female - Breezy & Relaxed)" },
  { name: "Fenrir", label: "Fenrir (Male - Excitable & Passionate)" },
  { name: "Kore", label: "Kore (Female - Firm & Professional)" },
  { name: "Charon", label: "Charon (Male - Calm & Informative)" },
];
const stages = ["Start", "Core Assessment", "Wrap Up", "Report"];

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

interface ActiveVoiceSessionProps {
  liveSession: LiveSessionCreateResponse;
  endSession: () => void;
  phase: string;
  setPhase: (val: string) => void;
  completion: number;
  setCompletion: (val: number) => void;
  elapsed: string;
  turns: Array<{ role: "agent" | "candidate"; text: string }>;
  setTurns: React.Dispatch<React.SetStateAction<Array<{ role: "agent" | "candidate"; text: string }>>>;
}

function ActiveVoiceSession({
  liveSession,
  endSession,
  phase,
  setPhase,
  completion,
  setCompletion,
  elapsed,
  turns,
  setTurns,
}: ActiveVoiceSessionProps) {
  const { state: assistantState, audioTrack } = useVoiceAssistant();
  const { buttonProps: micToggleProps, enabled: isMicrophoneEnabled } = useTrackToggle({
    source: Track.Source.Microphone,
  });
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);
  const [typedMessage, setTypedMessage] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Map assistantState to AgentState
  const agentState: AgentState = useMemo(() => {
    if (assistantState === "speaking") return "Speaking";
    if (assistantState === "thinking") return "Thinking";
    if (assistantState === "listening") return "Listening";
    return "Listening";
  }, [assistantState]);

  const currentStage = useMemo(() => {
    if (phase === "WRAP_UP") return 2;
    if (phase === "COMPLETED") return 3;
    if (phase === "INTRODUCTION") return 0;
    return 1;
  }, [phase]);

  // Poll backend live session details to sync phase, completion, and transcript turns in real time
  useEffect(() => {
    let isMounted = true;
    const pollState = async () => {
      try {
        const details = await apiService.getLiveSessionDetails(liveSession.room_name);
        if (!isMounted) return;

        if (details.interview_phase) setPhase(details.interview_phase);
        if (typeof details.completion === "number") setCompletion(details.completion);

        if (details.debug_state && details.debug_state.question_history) {
          const qHistory: string[] = details.debug_state.question_history;
          const aHistory: string[] = details.debug_state.answer_history || [];

          const newTurns: Array<{ role: "agent" | "candidate"; text: string }> = [];
          const maxLength = Math.max(qHistory.length, aHistory.length);
          for (let i = 0; i < maxLength; i++) {
            if (i < qHistory.length) {
              newTurns.push({ role: "agent", text: qHistory[i] });
            }
            if (i < aHistory.length) {
              newTurns.push({ role: "candidate", text: aHistory[i] });
            }
          }
          if (newTurns.length > 0) {
            setTurns(newTurns);
          }
        }
      } catch (err) {
        console.error("Error polling voice session state:", err);
      }
    };

    pollState();
    const intervalId = setInterval(pollState, 3000);
    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [liveSession.room_name, setPhase, setCompletion, setTurns]);



  const toggleVoice = () => {
    setIsVoiceEnabled(!isVoiceEnabled);
  };

  const submitTypedFallback = async () => {
    if (!typedMessage.trim()) return;

    const transcript = typedMessage.trim();
    setTypedMessage("");
    setTurns((existing) => [...existing, { role: "candidate", text: transcript }]);

    try {
      const response: MessageResponse = await apiService.submitVoiceTurn(
        liveSession.candidate_id,
        transcript,
        liveSession.room_name
      );
      setTurns((existing) => [...existing, { role: "agent", text: response.response }]);
      setCompletion(response.profile_completion_percentage);
      setPhase(response.interview_phase);
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Unable to submit transcript."));
    }
  };

  return (
    <section className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
      {isVoiceEnabled && <RoomAudioRenderer />}
      {error && (
        <div className="col-span-full rounded-xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-600 dark:text-rose-300">
          {error}
        </div>
      )}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-900 dark:bg-slate-900/70">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-5 dark:border-slate-800">
          <div>
            <p className="text-xs font-bold uppercase text-slate-400">Live voice room</p>
            <h1 className="mt-1 font-space text-2xl font-bold">Skill Interview Session</h1>
            <p className="mt-1 text-xs text-slate-500">ID: {liveSession.room_name}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-600">
              <Activity size={13} /> Connected
            </span>
            <span className="text-sm font-bold text-slate-500">{elapsed}</span>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center justify-center text-center">
          <div className={`relative flex h-32 w-32 items-center justify-center rounded-full border text-4xl transition overflow-hidden ${
            agentState === "Listening"
              ? "border-emerald-400 bg-emerald-500/10 text-emerald-500"
              : agentState === "Thinking"
              ? "border-amber-400 bg-amber-500/10 text-amber-500"
              : "border-slate-300 bg-slate-100 text-slate-500 dark:border-slate-800 dark:bg-slate-950"
          }`}>
            {assistantState === "speaking" && audioTrack ? (
              <BarVisualizer
                state={assistantState}
                trackRef={audioTrack}
                barCount={7}
                options={{ minHeight: 15, maxHeight: 60 }}
                className="w-24 h-16"
              />
            ) : agentState === "Listening" ? (
              <Mic size={42} />
            ) : agentState === "Thinking" ? (
              <Sparkles size={42} className="animate-pulse" />
            ) : (
              <Volume2 size={42} />
            )}
          </div>
          <h2 className="mt-5 font-space text-xl font-bold">{agentState}</h2>
          <p className="mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
            {assistantState === "speaking" 
              ? "Agent is speaking..." 
              : "Speak naturally in the room, or use the typed fallback."}
          </p>
        </div>

        <div className="mt-8 max-h-72 space-y-3 overflow-y-auto rounded-xl border border-slate-100 bg-slate-50 p-4 font-sans text-sm dark:border-slate-800 dark:bg-slate-950">
          {turns.map((turn, index) => (
            <div key={`${turn.role}-${index}`} className={turn.role === "agent" ? "text-left mb-3" : "text-right mb-3"}>
              <span className="text-[10px] font-bold uppercase text-slate-400">{turn.role === "agent" ? "Agent" : "You"}</span>
              <div className="mt-1">
                <p className={`inline-block max-w-[85%] rounded-xl px-4 py-2 text-sm leading-6 ${
                  turn.role === "agent"
                    ? "bg-white text-slate-700 dark:bg-slate-900 dark:text-slate-200 border border-slate-100 dark:border-slate-800"
                    : "accent-bg"
                }`}>
                  {turn.text}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex gap-3">
          <input
            value={typedMessage}
            onChange={(event) => setTypedMessage(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") submitTypedFallback();
            }}
            placeholder="Type a fallback transcript..."
            className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm dark:border-slate-800 dark:bg-slate-950"
          />
          <button
            onClick={submitTypedFallback}
            className="inline-flex items-center justify-center rounded-xl accent-bg px-4"
            title="Send transcript"
          >
            <Send size={17} />
          </button>
        </div>
      </div>

      <aside className="space-y-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-900 dark:bg-slate-900/70">
          <h3 className="font-space text-lg font-bold">Live journey</h3>
          <div className="mt-5 space-y-4">
            {stages.map((stage, index) => (
              <div key={stage} className="flex items-center gap-3">
                <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                  index <= currentStage ? "accent-bg" : "border border-slate-200 dark:border-slate-800"
                }`}>
                  {index < currentStage ? <CheckCircle2 size={15} /> : index + 1}
                </span>
                <span className="text-sm font-semibold">{stage}</span>
              </div>
            ))}
          </div>
          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between text-xs font-bold uppercase text-slate-400">
              <span>Profile coverage</span>
              <span>{completion}%</span>
            </div>
            <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-800">
              <div className="h-full rounded-full accent-bg transition-all" style={{ width: `${completion}%` }} />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-900 dark:bg-slate-900/70">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={micToggleProps.onClick}
              className={`inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-xs font-bold transition ${
                isMicrophoneEnabled
                  ? "border-slate-200 dark:border-slate-800 bg-transparent text-slate-800 dark:text-slate-100"
                  : "border-rose-500/30 bg-rose-500/10 text-rose-600"
              }`}
            >
              {isMicrophoneEnabled ? <Mic size={15} /> : <MicOff size={15} />}
              {isMicrophoneEnabled ? "Mute Mic" : "Unmute Mic"}
            </button>
            <button
              onClick={toggleVoice}
              className={`inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-xs font-bold transition ${
                isVoiceEnabled
                  ? "border-slate-200 dark:border-slate-800 bg-transparent text-slate-800 dark:text-slate-100"
                  : "border-rose-500/30 bg-rose-500/10 text-rose-600"
              }`}
            >
              {isVoiceEnabled ? <Headphones size={15} /> : <VolumeX size={15} />}
              {isVoiceEnabled ? "Mute Voice" : "Unmute Voice"}
            </button>
            <button
              onClick={endSession}
              className="col-span-2 inline-flex items-center justify-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-3 text-xs font-bold text-rose-600"
            >
              <PhoneOff size={15} /> End Session
            </button>
          </div>
        </div>
      </aside>
    </section>
  );
}

export default function VoiceInterviewPage() {
  const router = useRouter();
  const [step, setStep] = useState<SetupStep>("mic");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [voice, setVoice] = useState("Puck");
  const [conversationMode, setConversationMode] = useState("realtime");
  const [micEnabled, setMicEnabled] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [isChecking, setIsChecking] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [liveSession, setLiveSession] = useState<LiveSessionCreateResponse | null>(null);
  const [liveToken, setLiveToken] = useState<LiveKitTokenResponse | null>(null);
  const [phase, setPhase] = useState("INTRODUCTION");
  const [completion, setCompletion] = useState(0);
  const [turns, setTurns] = useState<Array<{ role: "agent" | "candidate"; text: string }>>([]);
  const [startedAt, setStartedAt] = useState<Date | null>(null);
  const [elapsed, setElapsed] = useState("00:00");
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (!userStr) {
      router.push("/login");
      return;
    }

    try {
      const user = JSON.parse(userStr);
      if (user.role === "candidate") {
        setUsername(user.username);
        setName(user.username);
        setEmail(user.username === "Dalal" ? "dalalalbdah@hotmail.com" : `${user.username.toLowerCase()}@example.com`);
      }
      setIsChecking(false);
    } catch {
      router.push("/login");
    }
  }, [router]);

  useEffect(() => {
    if (!startedAt) return;
    const timer = window.setInterval(() => {
      const seconds = Math.floor((Date.now() - startedAt.getTime()) / 1000);
      const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
      const remainder = (seconds % 60).toString().padStart(2, "0");
      setElapsed(`${minutes}:${remainder}`);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [startedAt]);

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) window.cancelAnimationFrame(animationFrameRef.current);
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const enableMic = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      setMicEnabled(true);

      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      const data = new Uint8Array(analyser.frequencyBinCount);
      source.connect(analyser);

      const tick = () => {
        analyser.getByteFrequencyData(data);
        const average = data.reduce((sum, value) => sum + value, 0) / data.length;
        setMicLevel(Math.min(100, Math.round(average * 1.8)));
        animationFrameRef.current = window.requestAnimationFrame(tick);
      };
      tick();
    } catch {
      setError("Microphone access is required for the live voice session.");
    }
  };

  const startLiveSession = async () => {
    setIsStarting(true);
    setError(null);
    try {
      // Release test microphone tracks before starting LiveKit connection
      if (animationFrameRef.current) {
        window.cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      }

      const session = await apiService.createLiveSession({
        name,
        email,
        username,
        voice,
        conversation_mode: conversationMode,
        orchestration_strategy: "config",
      });
      setLiveSession(session);
      setTurns([{ role: "agent", text: session.first_question }]);
      setPhase("INTRODUCTION");

      const token = await apiService.createLiveKitToken(session.room_name, session.participant_identity, name);
      setLiveToken(token);
      setStartedAt(new Date());
      setStep("session");
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Unable to start the live session."));
    } finally {
      setIsStarting(false);
    }
  };

  const endSession = async () => {
    if (liveSession) {
      await apiService.endLiveSession(liveSession.room_name).catch(() => {});
    }
    router.push("/interview");
  };

  if (isChecking) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-300 dark:border-slate-800 border-t-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors duration-200">
      <Head>
        <title>Live Voice Interview | 1 Min Scout</title>
        <meta name="description" content="Run a realtime AI voice interview with LiveKit and Gemini." />
      </Head>
      <Header />

      <main className="mx-auto max-w-7xl px-6 py-8">
        {error && (
          <div className="mb-5 rounded-xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-600 dark:text-rose-300">
            {error}
          </div>
        )}

        {step !== "session" ? (
          <section className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_380px]">
            <div className="space-y-8">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold uppercase tracking-wide accent-text dark:border-slate-800 dark:bg-slate-900">
                  <Radio size={13} /> Live Interview Setup
                </span>
                <h1 className="mt-4 font-space text-4xl font-bold text-slate-950 dark:text-white">
                  Prepare your voice session
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                  Test your microphone, choose a Gemini voice, and launch the same adaptive screening engine in realtime.
                </p>
              </div>

              {step === "mic" ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-900 dark:bg-slate-900/70">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="font-space text-2xl font-bold">Test your microphone</h2>
                      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                        A quiet room and headphones make the realtime agent feel much more natural.
                      </p>
                    </div>
                    <div className={`rounded-full p-3 ${micEnabled ? "bg-emerald-500/10 text-emerald-500" : "bg-slate-100 text-slate-500 dark:bg-slate-950"}`}>
                      {micEnabled ? <Mic size={24} /> : <MicOff size={24} />}
                    </div>
                  </div>

                  <div className="mt-8 grid gap-5 md:grid-cols-2">
                    <button
                      onClick={enableMic}
                      className="flex min-h-32 items-center justify-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-5 text-sm font-bold transition hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950"
                    >
                      <Mic size={20} className="accent-text" />
                      {micEnabled ? "Microphone enabled" : "Turn on microphone"}
                    </button>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950">
                      <div className="flex items-center justify-between text-xs font-bold uppercase text-slate-400">
                        <span>Audio level</span>
                        <span>{micLevel}%</span>
                      </div>
                      <div className="mt-5 h-3 rounded-full bg-slate-200 dark:bg-slate-800">
                        <div className="h-full rounded-full accent-bg transition-all" style={{ width: `${micLevel}%` }} />
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 flex justify-end">
                    <button
                      disabled={!micEnabled}
                      onClick={() => setStep("customize")}
                      className="inline-flex items-center gap-2 rounded-xl accent-bg px-5 py-3 text-sm font-bold disabled:opacity-45"
                    >
                      Continue <ArrowRight size={16} />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-900 dark:bg-slate-900/70">
                  <h2 className="font-space text-2xl font-bold">Voice and session mode</h2>
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                    These settings are passed to the LiveKit room and Gemini worker.
                  </p>

                  <div className="mt-8 grid gap-5 md:grid-cols-2">
                    <label className="space-y-2">
                      <span className="text-xs font-bold uppercase text-slate-500">Interviewer voice</span>
                      <select
                        value={voice}
                        onChange={(event) => setVoice(event.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm dark:border-slate-800 dark:bg-slate-950"
                      >
                        {voices.map((option) => (
                          <option key={option.name} value={option.name}>{option.label}</option>
                        ))}
                      </select>
                    </label>
                    <label className="space-y-2">
                      <span className="text-xs font-bold uppercase text-slate-500">Conversation mode</span>
                      <select
                        value={conversationMode}
                        onChange={(event) => setConversationMode(event.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm dark:border-slate-800 dark:bg-slate-950"
                      >
                        <option value="realtime">Realtime</option>
                        <option value="tap_to_talk">Tap to talk</option>
                      </select>
                    </label>
                  </div>

                  <div className="mt-8 flex flex-wrap justify-between gap-3">
                    <button
                      onClick={() => setStep("mic")}
                      className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold dark:border-slate-800"
                    >
                      Back
                    </button>
                    <button
                      disabled={isStarting}
                      onClick={startLiveSession}
                      className="inline-flex items-center gap-2 rounded-xl accent-bg px-5 py-3 text-sm font-bold disabled:opacity-50"
                    >
                      {isStarting ? "Starting..." : "Start live session"} <Sparkles size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-900 dark:bg-slate-900/70">
              <h3 className="font-space text-lg font-bold">Session path</h3>
              <div className="mt-5 space-y-4">
                {stages.map((stage, index) => (
                  <div key={stage} className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 text-xs font-bold dark:border-slate-800">
                      {index + 1}
                    </span>
                    <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">{stage}</span>
                  </div>
                ))}
              </div>
            </aside>
          </section>
        ) : liveSession && liveToken ? (
          <LiveKitRoom
            serverUrl={liveToken.livekit_url}
            token={liveToken.token}
            connect={true}
            audio={true}
            video={false}
          >
            <ActiveVoiceSession
              liveSession={liveSession}
              endSession={endSession}
              phase={phase}
              setPhase={setPhase}
              completion={completion}
              setCompletion={setCompletion}
              elapsed={elapsed}
              turns={turns}
              setTurns={setTurns}
            />
          </LiveKitRoom>
        ) : null}
      </main>
    </div>
  );
}
