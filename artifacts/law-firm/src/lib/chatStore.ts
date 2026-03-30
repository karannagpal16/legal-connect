export interface ChatMessage {
  id: string;
  from: "client" | "advocate";
  text: string;
  timestamp: number;
  encrypted: boolean;
  read: boolean;
  attachment?: { name: string; type: string };
}

export interface ChatConversation {
  id: string;
  clientName: string;
  advocateName: string;
  caseTitle: string;
  messages: ChatMessage[];
  lastActivity: number;
}

const STORAGE_KEY = "rna_chat_store";

function xorEncrypt(text: string, key = 42): string {
  return btoa(text.split("").map((c) => String.fromCharCode(c.charCodeAt(0) ^ key)).join(""));
}

function xorDecrypt(encoded: string, key = 42): string {
  try {
    return atob(encoded).split("").map((c) => String.fromCharCode(c.charCodeAt(0) ^ key)).join("");
  } catch {
    return encoded;
  }
}

function loadStore(): ChatConversation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getInitialConversations();
    return JSON.parse(raw);
  } catch {
    return getInitialConversations();
  }
}

function saveStore(convs: ChatConversation[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(convs));
}

function getInitialConversations(): ChatConversation[] {
  const now = Date.now();
  return [
    {
      id: "conv-1",
      clientName: "Rahul Sharma",
      advocateName: "Adv. Rishika Nagpal",
      caseTitle: "Tenancy Dispute – Rohini Property",
      lastActivity: now - 3600000,
      messages: [
        { id: "m1", from: "advocate", text: xorEncrypt("Good morning, Rahul. I've reviewed the rent agreement you sent."), timestamp: now - 7200000, encrypted: true, read: true },
        { id: "m2", from: "client", text: xorEncrypt("Good morning Madam. What's your assessment?"), timestamp: now - 7100000, encrypted: true, read: true },
        { id: "m3", from: "advocate", text: xorEncrypt("The landlord has violated clause 5(b) of the agreement. We have a strong case for the security deposit recovery. I'll file the notice tomorrow."), timestamp: now - 3600000, encrypted: true, read: true },
      ],
    },
    {
      id: "conv-2",
      clientName: "Priya Mehta",
      advocateName: "Adv. Rishika Nagpal",
      caseTitle: "Consumer Complaint – XYZ Electronics",
      lastActivity: now - 86400000,
      messages: [
        { id: "m4", from: "client", text: xorEncrypt("Hello, I have the purchase receipt and the service denial email. Should I send them?"), timestamp: now - 90000000, encrypted: true, read: true },
        { id: "m5", from: "advocate", text: xorEncrypt("Yes please send both. Also, do you have a written response from the company? That will strengthen our consumer complaint significantly."), timestamp: now - 86400000, encrypted: true, read: false },
      ],
    },
    {
      id: "conv-3",
      clientName: "Deepak Nair",
      advocateName: "Adv. Rishika Nagpal",
      caseTitle: "Employment Settlement",
      lastActivity: now - 172800000,
      messages: [
        { id: "m6", from: "client", text: xorEncrypt("My employer has offered a settlement. Is it a fair offer?"), timestamp: now - 172800000, encrypted: true, read: true },
        { id: "m7", from: "advocate", text: xorEncrypt("Send me the settlement letter. I'll review all clauses, especially the full and final settlement clause and the NDA they want you to sign."), timestamp: now - 172000000, encrypted: true, read: true },
      ],
    },
  ];
}

export function getConversations(): ChatConversation[] {
  return loadStore();
}

export function getConversation(id: string): ChatConversation | undefined {
  return loadStore().find((c) => c.id === id);
}

export function sendMessage(convId: string, from: "client" | "advocate", text: string): ChatConversation {
  const convs = loadStore();
  const idx = convs.findIndex((c) => c.id === convId);
  const newMsg: ChatMessage = {
    id: `msg-${Date.now()}`,
    from,
    text: xorEncrypt(text),
    timestamp: Date.now(),
    encrypted: true,
    read: false,
  };
  if (idx !== -1) {
    convs[idx].messages.push(newMsg);
    convs[idx].lastActivity = Date.now();
  }
  saveStore(convs);
  return convs[idx];
}

export function markRead(convId: string, reader: "client" | "advocate") {
  const convs = loadStore();
  const idx = convs.findIndex((c) => c.id === convId);
  if (idx !== -1) {
    convs[idx].messages = convs[idx].messages.map((m) =>
      m.from !== reader ? { ...m, read: true } : m
    );
    saveStore(convs);
  }
}

export function decryptMessage(text: string): string {
  return xorDecrypt(text);
}

export function unreadCount(convs: ChatConversation[], role: "client" | "advocate"): number {
  return convs.reduce((total, conv) => {
    return total + conv.messages.filter((m) => m.from !== role && !m.read).length;
  }, 0);
}
