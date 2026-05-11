import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, MessageSquare, ExternalLink } from "lucide-react";
import ClassPulseLogo from "./ClassPulseLogo";
import { useGetActiveSession, getGetActiveSessionQueryKey } from "@workspace/api-client-react";
import { toast } from "sonner";

interface Message {
  id: string;
  role: "user" | "ai";
  text: string;
}

async function callAiChat(message: string, transcript: string, subject: string): Promise<string> {
  const token = localStorage.getItem("sheldon_token") ?? "";
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  try {
    const res = await fetch(`${base}/api/ai/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ message, transcript, subject }),
    });
    if (!res.ok) return "Unable to reach AI.";
    const data = await res.json() as { reply: string };
    return data.reply;
  } catch {
    return "Unable to reach AI. Check your connection.";
  }
}

export default function FloatingAssistant() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: "init", role: "ai", text: "Hi! Ask me anything about your current teaching session. I can help explain concepts, suggest strategies, or answer questions." },
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { data: activeSession } = useGetActiveSession({
    query: { refetchInterval: 5000, queryKey: getGetActiveSessionQueryKey() },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking]);

  const openPopup = () => {
    if (!activeSession?.session) {
      toast.error("Start AI monitoring first from a class card.");
      return;
    }
    const token = localStorage.getItem("sheldon_token") ?? "";
    const { session, class: cls } = activeSession;
    const params = new URLSearchParams({
      sessionId: String(session.id),
      token,
      studentName: cls?.studentName ?? "Student",
      subject: cls?.subject ?? "Class",
    });
    const base = import.meta.env.BASE_URL.replace(/\/$/, "");
    window.open(
      `${base}/monitor?${params.toString()}`,
      "sheldon_ai_monitor",
      "width=400,height=680,top=80,left=20,resizable=yes,scrollbars=no"
    );
  };

  const send = async () => {
    const text = input.trim();
    if (!text || isThinking) return;
    setMessages((prev) => [...prev, { id: Date.now().toString(), role: "user", text }]);
    setInput("");
    setIsThinking(true);
    const subject = activeSession?.class?.subject ?? "Class";
    const reply = await callAiChat(text, "", subject);
    setMessages((prev) => [...prev, { id: (Date.now() + 1).toString(), role: "ai", text: reply }]);
    setIsThinking(false);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="w-80 rounded-2xl border border-white/10 bg-[#111]/95 backdrop-blur-xl shadow-2xl shadow-black/60 flex flex-col overflow-hidden"
            style={{ maxHeight: "460px" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
              <div className="flex items-center gap-2">
                <ClassPulseLogo size={22} />
                <span className="text-sm font-semibold text-white">ClassPulse AI</span>
                {activeSession?.session && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/15 text-green-400 border border-green-500/20">Live</span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                {activeSession?.session && (
                  <button
                    onClick={openPopup}
                    title="Open full AI monitor window"
                    className="text-white/30 hover:text-[#ff7a00] transition-colors p-1"
                    data-testid="button-open-monitor-popup"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                )}
                <button onClick={() => setOpen(false)} className="text-white/30 hover:text-white/70 transition-colors p-1">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5 min-h-0">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] px-3 py-2 rounded-xl text-xs leading-relaxed ${
                      msg.role === "user"
                        ? "bg-[#ff7a00] text-white rounded-tr-sm"
                        : "bg-white/5 border border-white/10 text-white/85 rounded-tl-sm"
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              {isThinking && (
                <div className="flex justify-start">
                  <div className="bg-white/5 border border-white/10 rounded-xl rounded-tl-sm px-3 py-2.5">
                    <div className="flex gap-1">
                      {[0, 150, 300].map((d) => (
                        <span key={d} className="w-1.5 h-1.5 bg-[#ff7a00] rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Open popup CTA if session active */}
            {activeSession?.session && (
              <div className="px-4 pb-2">
                <button
                  onClick={openPopup}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-[#ff7a00]/30 text-[#ff7a00] text-xs hover:bg-[#ff7a00]/10 transition-colors"
                  data-testid="button-open-full-monitor"
                >
                  <ExternalLink className="w-3 h-3" />
                  Open full AI monitor with live transcription
                </button>
              </div>
            )}

            {/* Input */}
            <div className="px-3 pb-3">
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder="Ask anything..."
                  data-testid="input-floating-chat"
                  className="flex-1 bg-transparent text-xs text-white placeholder-white/25 outline-none"
                />
                <button
                  onClick={send}
                  disabled={!input.trim() || isThinking}
                  data-testid="button-floating-send"
                  className="w-6 h-6 rounded-full bg-[#ff7a00] flex items-center justify-center disabled:opacity-30 shrink-0"
                >
                  <Send className="w-3 h-3 text-white" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAB */}
      <motion.button
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen((o) => !o)}
        data-testid="button-floating-assistant"
        className="relative w-14 h-14 rounded-full bg-[#ff7a00] shadow-lg shadow-[#ff7a00]/40 flex items-center justify-center"
        style={{ boxShadow: "0 0 24px #ff7a0066, 0 4px 20px rgba(0,0,0,0.4)" }}
      >
        <AnimatePresence mode="wait">
          {open ? (
            <motion.div key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
              <X className="w-6 h-6 text-white" />
            </motion.div>
          ) : (
            <motion.div key="chat" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
              <MessageSquare className="w-6 h-6 text-white" />
            </motion.div>
          )}
        </AnimatePresence>
        {/* Pulse ring when session active */}
        {activeSession?.session && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-green-400 border-2 border-background flex items-center justify-center">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-ping absolute" />
          </span>
        )}
      </motion.button>
    </div>
  );
}
