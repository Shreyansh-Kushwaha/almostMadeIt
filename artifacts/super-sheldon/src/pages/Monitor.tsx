import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Send, BrainCircuit, X, Activity, Wifi, Eye, Volume2, MessageSquare, Radio } from "lucide-react";
import ClassPulseLogo from "@/components/ClassPulseLogo";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import ConfusionRadar from "@/components/ConfusionRadar";
import { ClassPulse, type ConfusionSignal } from "@/lib/classpulse";

interface Message {
  id: string;
  role: "user" | "ai";
  text: string;
  timestamp: Date;
}

interface TranscriptLine {
  id: string;
  text: string;
  timestamp: Date;
  isFinal: boolean;
}

// Minimal SpeechRecognition typing — lib.dom in this TS version omits these
// browser APIs, so we declare a structural subset. Properties marked readonly
// to align with browser semantics and avoid duplicate-declaration conflicts.
type SpeechRecognitionResultListLike = {
  readonly length: number;
  readonly [index: number]: {
    readonly isFinal: boolean;
    readonly length: number;
    readonly [index: number]: { readonly transcript: string; readonly confidence: number };
  };
};
type SpeechRecognitionEventLike = Event & {
  readonly results: SpeechRecognitionResultListLike;
  readonly resultIndex: number;
};
type SpeechRecognitionLike = EventTarget & {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
};
declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  }
}

function getParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    sessionId: params.get("sessionId"),
    token: params.get("token"),
    studentName: params.get("studentName") ?? "Student",
    subject: params.get("subject") ?? "Class",
    teacherName: params.get("teacherName") ?? "Teacher",
  };
}

async function callAiChat(message: string, transcript: string, token: string, subject: string): Promise<string> {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  try {
    const res = await fetch(`${base}/api/ai/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ message, transcript, subject }),
    });
    if (!res.ok) return "Unable to reach AI. Please try again.";
    const data = await res.json() as { reply: string };
    return data.reply;
  } catch {
    return "Unable to reach AI. Please check your connection.";
  }
}

export default function Monitor() {
  const params = getParams();
  const token = params.token ?? localStorage.getItem("sheldon_token") ?? "";

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptLine[]>([]);
  const [interimText, setInterimText] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "ai",
      text: `Hello! I'm your AI teaching assistant for this ${params.subject} session with ${params.studentName}. I'm capturing the conversation and ready to help you anytime. Ask me anything!`,
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [metrics, setMetrics] = useState({ noise: 12, confidence: 87, attention: 91, internet: 98 });
  const [tab, setTab] = useState<"chat" | "transcript">("chat");
  const [confusion, setConfusion] = useState<ConfusionSignal | null>(null);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const transcriptScrollRef = useRef<HTMLDivElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const fullTranscriptRef = useRef<string>("");
  const lastConfusionTextLenRef = useRef<number>(0);

  // Metrics simulation
  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics({
        noise: Math.floor(Math.random() * 20) + 5,
        confidence: Math.floor(Math.random() * 12) + 82,
        attention: Math.floor(Math.random() * 15) + 78,
        internet: Math.floor(Math.random() * 5) + 95,
      });
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  // Auto scroll
  useEffect(() => {
    if (chatScrollRef.current) chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
  }, [messages, isThinking]);
  useEffect(() => {
    if (transcriptScrollRef.current) transcriptScrollRef.current.scrollTop = transcriptScrollRef.current.scrollHeight;
  }, [transcript, interimText]);

  // ClassPulse Confusion Radar — poll Azure OpenAI every ~10s while listening
  useEffect(() => {
    if (!isListening) return;
    const tick = async () => {
      const txt = fullTranscriptRef.current;
      if (txt.length < 80 || txt.length === lastConfusionTextLenRef.current) return;
      lastConfusionTextLenRef.current = txt.length;
      try {
        const sig = await ClassPulse.detectConfusion(txt.slice(-1500));
        setConfusion(sig);
      } catch { /* ignore — radar best-effort */ }
    };
    const id = setInterval(tick, 10000);
    return () => clearInterval(id);
  }, [isListening]);

  // Persist transcript to backend so the finish-session AI report has it
  const persistUtterance = useCallback(async (text: string) => {
    const sid = params.sessionId;
    if (!sid) return;
    try {
      await ClassPulse.appendTranscript(parseInt(sid, 10), "teacher", text);
    } catch { /* ignore — best-effort */ }
  }, [params.sessionId]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsListening(false);
    setInterimText("");
  }, []);

  const startListening = useCallback(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      toast.error("Speech recognition not supported in this browser. Use Chrome.");
      return;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0].transcript;
        if (result.isFinal) {
          const trimmed = text.trim();
          const line: TranscriptLine = { id: Date.now().toString(), text: trimmed, timestamp: new Date(), isFinal: true };
          setTranscript((prev) => [...prev, line]);
          fullTranscriptRef.current += trimmed + " ";
          setInterimText("");
          if (trimmed.length > 3) void persistUtterance(trimmed);
        } else {
          interim += text;
        }
      }
      if (interim) setInterimText(interim);
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      // Auto-restart if still supposed to be listening
      if (recognitionRef.current) {
        try { recognition.start(); } catch { /* ignore */ }
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
      setIsListening(true);
    } catch {
      toast.error("Could not start microphone. Check browser permissions.");
    }
  }, [persistUtterance]);

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const sendMessage = async () => {
    const text = inputText.trim();
    if (!text || isThinking) return;

    const userMsg: Message = { id: Date.now().toString(), role: "user", text, timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setInputText("");
    setIsThinking(true);

    const recentTranscript = fullTranscriptRef.current.slice(-2000);
    const reply = await callAiChat(text, recentTranscript, token, params.subject);

    const aiMsg: Message = { id: (Date.now() + 1).toString(), role: "ai", text: reply, timestamp: new Date() };
    setMessages((prev) => [...prev, aiMsg]);
    setIsThinking(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#0a0a0a] text-white font-sans overflow-hidden" style={{ fontFamily: "system-ui, sans-serif" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[#111]/80 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-2">
          <div className="relative">
            <ClassPulseLogo size={28} />
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-400 border-2 border-[#111] animate-pulse" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-none">ClassPulse AI</p>
            <p className="text-[10px] text-white/40 mt-0.5">{params.subject} · {params.studentName}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Mic toggle */}
          <button
            onClick={toggleListening}
            data-testid="button-toggle-mic"
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium transition-all ${
              isListening
                ? "bg-red-500/20 text-red-400 border border-red-500/30"
                : "bg-white/5 text-white/50 border border-white/10 hover:bg-white/10"
            }`}
          >
            {isListening ? <><Mic className="w-3 h-3 animate-pulse" /> Live</> : <><MicOff className="w-3 h-3" /> Off</>}
          </button>
          <button onClick={() => window.close()} className="text-white/30 hover:text-white/70 transition-colors p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Metrics bar */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-white/5 bg-[#0d0d0d] shrink-0 overflow-x-auto">
        <MetricPill icon={<Volume2 className="w-3 h-3" />} label="Noise" value={`${metrics.noise}%`} color="text-yellow-400" />
        <MetricPill icon={<Activity className="w-3 h-3" />} label="Conf" value={`${metrics.confidence}%`} color="text-[#ff7a00]" />
        <MetricPill icon={<Eye className="w-3 h-3" />} label="Attn" value={`${metrics.attention}%`} color="text-blue-400" />
        <MetricPill icon={<Wifi className="w-3 h-3" />} label="Net" value={`${metrics.internet}%`} color="text-green-400" />
        {isListening && (
          <div className="flex items-center gap-1 ml-auto shrink-0">
            <Radio className="w-3 h-3 text-red-400 animate-pulse" />
            <span className="text-[10px] text-red-400">Recording</span>
          </div>
        )}
      </div>

      {/* Confusion Radar + Class Rescue */}
      {confusion && (
        <div className="px-4 py-2 border-b border-white/5 bg-[#0d0d0d] shrink-0">
          <ConfusionRadar
            confusion={confusion.confusion}
            signals={confusion.signals}
            rescueSuggestion={confusion.rescueSuggestion}
            compact={false}
          />
        </div>
      )}

      {/* Tab switcher */}
      <div className="flex border-b border-white/5 shrink-0">
        <button
          onClick={() => setTab("chat")}
          className={`flex-1 py-2.5 text-xs font-medium transition-colors flex items-center justify-center gap-1.5 ${
            tab === "chat" ? "text-[#ff7a00] border-b-2 border-[#ff7a00]" : "text-white/40 hover:text-white/70"
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          AI Chat
        </button>
        <button
          onClick={() => setTab("transcript")}
          className={`flex-1 py-2.5 text-xs font-medium transition-colors flex items-center justify-center gap-1.5 ${
            tab === "transcript" ? "text-[#ff7a00] border-b-2 border-[#ff7a00]" : "text-white/40 hover:text-white/70"
          }`}
        >
          <Mic className="w-3.5 h-3.5" />
          Transcript
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 flex flex-col">
        {tab === "chat" ? (
          <>
            {/* Messages */}
            <div ref={chatScrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {msg.role === "ai" && (
                    <div className="w-5 h-5 rounded-full bg-[#ff7a00]/20 border border-[#ff7a00]/40 flex items-center justify-center mr-2 mt-0.5 shrink-0">
                      <BrainCircuit className="w-3 h-3 text-[#ff7a00]" />
                    </div>
                  )}
                  <div
                    className={`max-w-[82%] px-3 py-2.5 rounded-2xl text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-[#ff7a00] text-white rounded-tr-sm"
                        : "bg-white/5 border border-white/10 text-white/90 rounded-tl-sm"
                    }`}
                  >
                    {msg.text}
                  </div>
                </motion.div>
              ))}

              {isThinking && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-[#ff7a00]/20 border border-[#ff7a00]/40 flex items-center justify-center shrink-0">
                    <BrainCircuit className="w-3 h-3 text-[#ff7a00]" />
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-2xl rounded-tl-sm px-3 py-2.5">
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 bg-[#ff7a00] rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-1.5 h-1.5 bg-[#ff7a00] rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-1.5 h-1.5 bg-[#ff7a00] rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Input */}
            <div className="px-3 py-3 border-t border-white/5 shrink-0">
              <div className="flex items-end gap-2 bg-white/5 border border-white/10 rounded-2xl px-3 py-2">
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask AI anything about this class..."
                  rows={1}
                  data-testid="input-chat-message"
                  className="flex-1 bg-transparent text-sm text-white placeholder-white/30 resize-none outline-none min-h-[24px] max-h-24"
                  style={{ lineHeight: "1.5" }}
                />
                <button
                  onClick={sendMessage}
                  disabled={!inputText.trim() || isThinking}
                  data-testid="button-send-message"
                  className="w-7 h-7 rounded-full bg-[#ff7a00] flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed transition-opacity shrink-0"
                >
                  <Send className="w-3.5 h-3.5 text-white" />
                </button>
              </div>
              <p className="text-[10px] text-white/20 text-center mt-1.5">Press Enter to send · Shift+Enter for new line</p>
            </div>
          </>
        ) : (
          /* Transcript tab */
          <div ref={transcriptScrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
            {!isListening && transcript.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center gap-3">
                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
                  <MicOff className="w-6 h-6 text-white/20" />
                </div>
                <p className="text-sm text-white/30">Microphone is off.</p>
                <p className="text-xs text-white/20">Tap the "Off" button to start capturing conversation.</p>
              </div>
            )}

            {transcript.map((line) => (
              <motion.div
                key={line.id}
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-start gap-2"
              >
                <span className="text-[10px] text-white/25 mt-0.5 shrink-0 w-14 text-right">
                  {line.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                </span>
                <p className="text-sm text-white/80 leading-relaxed">{line.text}</p>
              </motion.div>
            ))}

            {interimText && (
              <div className="flex items-start gap-2">
                <span className="text-[10px] text-white/25 mt-0.5 shrink-0 w-14 text-right">now</span>
                <p className="text-sm text-white/40 italic leading-relaxed">{interimText}</p>
              </div>
            )}

            {isListening && transcript.length === 0 && !interimText && (
              <div className="flex flex-col items-center justify-center h-full text-center gap-3">
                <div className="flex gap-1">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="w-1 bg-[#ff7a00] rounded-full animate-pulse"
                      style={{
                        height: `${16 + Math.random() * 24}px`,
                        animationDelay: `${i * 120}ms`,
                      }}
                    />
                  ))}
                </div>
                <p className="text-xs text-white/40">Listening for speech...</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function MetricPill({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div className="flex items-center gap-1 shrink-0">
      <span className={`${color} opacity-70`}>{icon}</span>
      <span className="text-[10px] text-white/30">{label}</span>
      <span className={`text-[10px] font-mono font-semibold ${color}`}>{value}</span>
    </div>
  );
}
