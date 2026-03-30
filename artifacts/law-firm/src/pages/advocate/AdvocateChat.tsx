import { useState, useEffect, useRef } from "react";
import { MessageSquare, Lock, Send, Paperclip, ChevronRight, Shield, Clock, User, Circle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getConversations, getConversation, sendMessage, markRead, decryptMessage, ChatConversation, ChatMessage } from "@/lib/chatStore";

function timeAgo(ts: number) {
  const diff = Date.now() - ts;
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

export function AdvocateChat() {
  const [conversations, setConversations] = useState<ChatConversation[]>(() => getConversations());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const activeConv = activeId ? conversations.find(c => c.id === activeId) : null;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeConv?.messages.length]);

  useEffect(() => {
    if (activeId) {
      markRead(activeId, "advocate");
      setConversations(getConversations());
    }
  }, [activeId]);

  const handleSend = () => {
    if (!input.trim() || !activeId) return;
    sendMessage(activeId, "advocate", input.trim());
    setConversations(getConversations());
    setInput("");
  };

  const unread = (conv: ChatConversation) =>
    conv.messages.filter(m => m.from === "client" && !m.read).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-1">
        <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
          <MessageSquare className="w-5 h-5 text-amber-400" />
        </div>
        <div>
          <h1 className="text-2xl font-serif font-bold text-white">Client Messages</h1>
          <div className="flex items-center gap-1.5 text-xs text-emerald-400 mt-0.5">
            <Lock className="w-3 h-3" /> End-to-end encrypted · AES-256
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[600px]">
        {/* Conversation list */}
        <div className="lg:col-span-1 bg-card/40 border border-white/10 rounded-2xl overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-white/8 bg-white/3">
            <p className="text-white/40 text-xs font-semibold uppercase tracking-wider">Conversations ({conversations.length})</p>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-white/5">
            {conversations.map(conv => {
              const u = unread(conv);
              const lastMsg = conv.messages[conv.messages.length - 1];
              return (
                <button
                  key={conv.id}
                  onClick={() => setActiveId(conv.id)}
                  className={`w-full text-left px-4 py-4 hover:bg-white/5 transition-all ${activeId === conv.id ? "bg-amber-500/10 border-l-2 border-amber-400" : ""}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="relative flex-shrink-0">
                      <div className="w-10 h-10 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
                        <User className="w-5 h-5 text-amber-400" />
                      </div>
                      <Circle className="w-3 h-3 text-emerald-400 fill-emerald-400 absolute -bottom-0.5 -right-0.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-white text-sm font-semibold truncate">{conv.clientName}</p>
                        <span className="text-white/25 text-[10px] flex-shrink-0 ml-1">{timeAgo(conv.lastActivity)}</span>
                      </div>
                      <p className="text-white/35 text-xs truncate mt-0.5">{conv.caseTitle}</p>
                      {lastMsg && (
                        <p className="text-white/25 text-xs truncate mt-1">
                          {lastMsg.from === "advocate" ? "You: " : ""}{decryptMessage(lastMsg.text).slice(0, 40)}...
                        </p>
                      )}
                    </div>
                    {u > 0 && (
                      <span className="w-5 h-5 rounded-full bg-amber-500 text-background text-[10px] font-bold flex items-center justify-center flex-shrink-0">{u}</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Chat window */}
        <div className="lg:col-span-2 bg-card/40 border border-white/10 rounded-2xl flex flex-col overflow-hidden">
          {activeConv ? (
            <>
              {/* Header */}
              <div className="px-5 py-4 border-b border-white/8 bg-white/3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
                  <User className="w-4 h-4 text-amber-400" />
                </div>
                <div className="flex-1">
                  <p className="text-white font-bold text-sm">{activeConv.clientName}</p>
                  <p className="text-white/35 text-xs">{activeConv.caseTitle}</p>
                </div>
                <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1.5 rounded-full">
                  <Lock className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400 text-[10px] font-bold">E2E ENCRYPTED</span>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                <div className="text-center">
                  <span className="text-[10px] text-white/20 bg-white/5 px-3 py-1 rounded-full">
                    🔒 Messages in this conversation are encrypted and private
                  </span>
                </div>
                {activeConv.messages.map((msg) => {
                  const isAdv = msg.from === "advocate";
                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${isAdv ? "flex-row-reverse" : "flex-row"} gap-2.5`}
                    >
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${isAdv ? "bg-amber-500/20 border border-amber-500/30" : "bg-white/10 border border-white/15"}`}>
                        <User className={`w-3.5 h-3.5 ${isAdv ? "text-amber-400" : "text-white/50"}`} />
                      </div>
                      <div className={`max-w-[75%] rounded-2xl px-4 py-3 ${isAdv ? "bg-amber-500/15 border border-amber-500/20" : "bg-white/8 border border-white/10"}`}>
                        <p className="text-white text-sm leading-relaxed">{decryptMessage(msg.text)}</p>
                        <div className="flex items-center justify-end gap-1 mt-1">
                          <Lock className="w-2.5 h-2.5 text-white/20" />
                          <span className="text-white/20 text-[10px]">{timeAgo(msg.timestamp)}</span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div className="px-4 py-4 border-t border-white/8">
                <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus-within:border-amber-500/30">
                  <input
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleSend()}
                    placeholder="Type a message... (encrypted)"
                    className="flex-1 bg-transparent text-white text-sm placeholder:text-white/25 focus:outline-none"
                  />
                  <div className="flex items-center gap-2">
                    <button className="text-white/30 hover:text-white/60 transition-colors">
                      <Paperclip className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleSend}
                      disabled={!input.trim()}
                      className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${input.trim() ? "bg-amber-500 text-background hover:bg-amber-600" : "bg-white/10 text-white/20"}`}
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <p className="text-center text-white/15 text-[10px] mt-2 flex items-center justify-center gap-1">
                  <Lock className="w-2.5 h-2.5" /> Messages are encrypted end-to-end · Rishika Nagpal & Associates
                </p>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-white/25">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                <MessageSquare className="w-8 h-8 text-amber-400/40" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-white/40">Select a conversation</p>
                <p className="text-xs mt-1">to view encrypted messages</p>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-emerald-400/60">
                <Shield className="w-3 h-3" /> AES-256 end-to-end encrypted
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
