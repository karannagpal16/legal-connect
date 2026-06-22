import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Loader2, Sparkles, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface Message {
  id: number;
  role: "user" | "assistant";
  content: string;
  loading?: boolean;
}

interface AIChatProps {
  context: "intern" | "client";
  placeholder?: string;
  systemGreeting?: string;
  accentColor?: string;
  borderColor?: string;
  bgColor?: string;
  iconColor?: string;
  quickPrompts?: string[];
}

export function AIChat({
  context,
  placeholder = "Ask anything...",
  systemGreeting = "Hello! How can I help you today?",
  accentColor = "text-blue-400",
  borderColor = "border-blue-500/20",
  bgColor = "bg-blue-500/10",
  iconColor = "text-blue-400",
  quickPrompts = [],
}: AIChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    { id: 0, role: "assistant", content: systemGreeting },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const getApiBase = () => {
    const base = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";
    return base.replace(/\/[^/]*$/, "") + "/api";
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: Message = { id: Date.now(), role: "user", content: text.trim() };
    const assistantId = Date.now() + 1;
    const assistantMsg: Message = { id: assistantId, role: "assistant", content: "", loading: true };

    setMessages(prev => [...prev, userMsg, assistantMsg]);
    setInput("");
    setIsLoading(true);

    const history = [...messages, userMsg].map(m => ({ role: m.role, content: m.content }));

    abortRef.current = new AbortController();

    try {
      const apiBase = getApiBase();
      const response = await fetch(`${apiBase}/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history, context }),
        signal: abortRef.current.signal,
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";
      let fullContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.content) {
                fullContent += data.content;
                setMessages(prev =>
                  prev.map(m =>
                    m.id === assistantId
                      ? { ...m, content: fullContent, loading: false }
                      : m
                  )
                );
              }
            } catch {}
          }
        }
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        setMessages(prev =>
          prev.map(m =>
            m.id === assistantId
              ? { ...m, content: "Sorry, I couldn't process that request. Please try again.", loading: false }
              : m
          )
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const clearChat = () => {
    abortRef.current?.abort();
    setMessages([{ id: 0, role: "assistant", content: systemGreeting }]);
    setIsLoading(false);
  };

  return (
    <div className="flex flex-col h-full min-h-[500px]">
      {/* Quick prompts */}
      {quickPrompts.length > 0 && messages.length === 1 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {quickPrompts.map((p, i) => (
            <button
              key={i}
              onClick={() => sendMessage(p)}
              className={`text-xs px-3 py-2 rounded-full border ${borderColor} ${bgColor} ${accentColor} hover:opacity-80 transition-all`}
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 mb-4 max-h-[520px]">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn("flex gap-3", msg.role === "user" ? "flex-row-reverse" : "flex-row")}
            >
              <div className={cn(
                "w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0",
                msg.role === "assistant" ? `${bgColor} border ${borderColor}` : "bg-white/10 border border-white/10"
              )}>
                {msg.role === "assistant" ? (
                  <Bot className={`w-4 h-4 ${iconColor}`} />
                ) : (
                  <User className="w-4 h-4 text-white/60" />
                )}
              </div>

              <div className={cn(
                "max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                msg.role === "assistant"
                  ? "bg-card/50 border border-white/10 text-white/90"
                  : `${bgColor} border ${borderColor} ${accentColor}`
              )}>
                {msg.loading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className={`w-4 h-4 animate-spin ${iconColor}`} />
                    <span className="text-white/40 text-xs">Thinking...</span>
                  </div>
                ) : (
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className={`relative flex items-end gap-3 bg-card/40 border ${borderColor} rounded-2xl p-3`}>
        <textarea
          ref={textareaRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={1}
          className="flex-1 bg-transparent text-white text-sm placeholder:text-white/30 focus:outline-none resize-none max-h-32 min-h-[1.5rem]"
          style={{ height: "auto" }}
          onInput={e => {
            const t = e.target as HTMLTextAreaElement;
            t.style.height = "auto";
            t.style.height = Math.min(t.scrollHeight, 128) + "px";
          }}
        />
        <div className="flex items-center gap-2 flex-shrink-0">
          {messages.length > 1 && (
            <button onClick={clearChat} className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/30 hover:text-white/60 transition-all">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isLoading}
            className={cn(
              "w-9 h-9 rounded-xl flex items-center justify-center transition-all",
              input.trim() && !isLoading
                ? `${bgColor} border ${borderColor} ${accentColor} hover:opacity-80`
                : "bg-white/5 text-white/20 cursor-not-allowed"
            )}
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <p className="text-center text-white/20 text-[10px] mt-2 flex items-center justify-center gap-1">
        <Sparkles className="w-3 h-3" />
        AI-powered by LexBot · Verify important information with a qualified advocate
      </p>
    </div>
  );
}
