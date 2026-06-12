import { useState, useEffect, useRef } from "react";
import { MessageSquare, Lock, Send, Paperclip, Shield, User, Circle, Phone, Video, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { getConversations, getConversation, sendMessage, markRead, decryptMessage, ChatConversation } from "@/lib/chatStore";

function timeAgo(ts: number) {
  const diff = Date.now() - ts;
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

export function ClientChat() {
  const myConvId = "conv-1";
  const [conversation, setConversation] = useState<ChatConversation | undefined>(
    () => getConversation(myConvId)
  );
  const [input, setInput] = useState("");
  const [tab, setTab] = useState<"chat" | "info">("chat");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation?.messages.length]);

  useEffect(() => {
    markRead(myConvId, "client");
    setConversation(getConversation(myConvId));
  }, []);

  const handleSend = () => {
    if (!input.trim() || !conversation) return;
    sendMessage(myConvId, "client", input.trim());
    setConversation(getConversation(myConvId));
    setInput("");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-1">
        <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
          <MessageSquare className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          <h1 className="text-2xl font-serif font-bold text-[#1A2E2A]">My Advocate Chat</h1>
          <div className="flex items-center gap-1.5 text-xs text-emerald-400 mt-0.5">
            <Lock className="w-3 h-3" /> End-to-end encrypted · Your messages are private
          </div>
        </div>
      </div>

      {/* Encryption trust banner */}
      <div className="bg-emerald-500/8 border border-emerald-500/20 rounded-2xl p-4 flex items-center gap-3">
        <Shield className="w-5 h-5 text-emerald-400 flex-shrink-0" />
        <div>
          <p className="text-emerald-400 text-sm font-bold">Your conversation is fully encrypted</p>
          <p className="text-[#1A2E2A]/40 text-xs mt-0.5">Only you and your advocate can read these messages. Encrypted with AES-256.</p>
        </div>
        <div className="ml-auto flex-shrink-0 text-right">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse mx-auto mb-1" />
          <span className="text-[10px] text-emerald-400/60 font-bold">SECURE</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Advocate info panel */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-card/40 border border-[#1A2E2A]/10 rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="relative">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
                  <User className="w-7 h-7 text-amber-400" />
                </div>
                <Circle className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400 absolute -bottom-0.5 -right-0.5" />
              </div>
              <div>
                <p className="text-[#1A2E2A] font-bold">Adv. Arjun Mehra</p>
                <p className="text-[#1A2E2A]/40 text-xs">Senior Advocate</p>
                <p className="text-emerald-400 text-xs mt-0.5 flex items-center gap-1">
                  <Circle className="w-2 h-2 fill-emerald-400" /> Available
                </p>
              </div>
            </div>

            <div className="space-y-2 text-xs text-[#1A2E2A]/40 mb-4">
              <div className="flex justify-between">
                <span>Court</span>
                <span className="text-[#1A2E2A]/70">Delhi HC & SC</span>
              </div>
              <div className="flex justify-between">
                <span>Specialisation</span>
                <span className="text-[#1A2E2A]/70">Criminal, Property</span>
              </div>
              <div className="flex justify-between">
                <span>Your case</span>
                <span className="text-[#1A2E2A]/70">Tenancy Dispute</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button className="flex items-center justify-center gap-1.5 bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 border border-blue-500/25 rounded-xl py-2.5 text-xs font-bold transition-all">
                <Phone className="w-3.5 h-3.5" /> Audio Call
              </button>
              <button className="flex items-center justify-center gap-1.5 bg-violet-500/15 hover:bg-violet-500/25 text-violet-400 border border-violet-500/25 rounded-xl py-2.5 text-xs font-bold transition-all">
                <Video className="w-3.5 h-3.5" /> Video Call
              </button>
            </div>
          </div>

          <div className="bg-amber-500/8 border border-amber-500/20 rounded-2xl p-4">
            <p className="text-amber-400 text-xs font-bold mb-1 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" /> Legal Reminder
            </p>
            <p className="text-[#1A2E2A]/45 text-xs leading-relaxed">
              Do not share sensitive documents (Aadhaar, PAN, bank details) through this chat. Use secure file transfer for official documents.
            </p>
          </div>
        </div>

        {/* Chat window */}
        <div className="lg:col-span-2 bg-card/40 border border-[#1A2E2A]/10 rounded-2xl flex flex-col h-[520px] overflow-hidden">
          <div className="px-5 py-3.5 border-b border-[#1A2E2A]/8 bg-[#1A2E2A]/5 flex items-center justify-between">
            <span className="text-[#1A2E2A]/50 text-xs font-semibold uppercase tracking-wider">Tenancy Dispute – Rohini Property</span>
            <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
              <Lock className="w-2.5 h-2.5 text-emerald-400" />
              <span className="text-emerald-400 text-[10px] font-bold">ENCRYPTED</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            <div className="text-center">
              <span className="text-[10px] text-[#1A2E2A]/20 bg-[#1A2E2A]/5 px-3 py-1 rounded-full">
                🔒 This conversation is encrypted. Only you and your advocate can read these messages.
              </span>
            </div>
            {conversation?.messages.map((msg) => {
              const isClient = msg.from === "client";
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${isClient ? "flex-row-reverse" : "flex-row"} gap-2.5`}
                >
                  <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center border ${isClient ? "bg-blue-500/20 border-blue-500/30" : "bg-amber-500/20 border-amber-500/30"}`}>
                    <User className={`w-3.5 h-3.5 ${isClient ? "text-blue-400" : "text-amber-400"}`} />
                  </div>
                  <div className={`max-w-[78%] rounded-2xl px-4 py-3 ${isClient ? "bg-blue-500/15 border border-blue-500/20" : "bg-[#1A2E2A]/8 border border-[#1A2E2A]/10"}`}>
                    {!isClient && <p className="text-amber-400 text-[10px] font-bold mb-1">Adv. Arjun Mehra</p>}
                    <p className="text-[#1A2E2A] text-sm leading-relaxed">{decryptMessage(msg.text)}</p>
                    <div className="flex items-center justify-end gap-1 mt-1">
                      <Lock className="w-2.5 h-2.5 text-[#1A2E2A]/20" />
                      <span className="text-[#1A2E2A]/20 text-[10px]">{timeAgo(msg.timestamp)}</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          <div className="px-4 py-4 border-t border-[#1A2E2A]/8">
            <div className="flex items-center gap-3 bg-[#1A2E2A]/5 border border-[#1A2E2A]/10 rounded-xl px-4 py-3 focus-within:border-blue-500/30">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSend()}
                placeholder="Message your advocate... (encrypted)"
                className="flex-1 bg-transparent text-[#1A2E2A] text-sm placeholder:text-[#1A2E2A]/25 focus:outline-none"
              />
              <div className="flex items-center gap-2">
                <button className="text-[#1A2E2A]/30 hover:text-[#1A2E2A]/60 transition-colors">
                  <Paperclip className="w-4 h-4" />
                </button>
                <button
                  onClick={handleSend}
                  disabled={!input.trim()}
                  className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${input.trim() ? "bg-blue-500 text-[#1A2E2A] hover:bg-blue-600" : "bg-[#1A2E2A]/10 text-[#1A2E2A]/20"}`}
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <p className="text-center text-[#1A2E2A]/15 text-[10px] mt-2 flex items-center justify-center gap-1">
              <Lock className="w-2.5 h-2.5" /> End-to-end encrypted · Legal Connect
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
