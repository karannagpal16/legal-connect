export interface LegalQuote {
  original: string;
  translation: string;
  source: string;
  category: "Dharma" | "Constitution" | "Justice";
}

export const legalQuotes: LegalQuote[] = [
  {
    original: "यतो धर्मस्ततो जयः",
    translation: "Where there is Dharma, there is victory.",
    source: "Mahabharata",
    category: "Dharma",
  },
  {
    original: "धर्मो रक्षति रक्षितः",
    translation: "Dharma protects those who protect it.",
    source: "Manusmriti",
    category: "Dharma",
  },
  {
    original: "कर्मण्येवाधिकारस्ते मा फलेषु कदाचन",
    translation: "Your right is to action alone, never to its fruits.",
    source: "Bhagavad Gita 2.47",
    category: "Dharma",
  },
  {
    original: "सत्यमेव जयते",
    translation: "Truth alone triumphs.",
    source: "Mundaka Upanishad",
    category: "Dharma",
  },
  {
    original: "Constitutional morality is not a natural sentiment. It has to be cultivated.",
    translation: "Institutions endure when citizens and public officers practise constitutional restraint.",
    source: "Dr. B. R. Ambedkar",
    category: "Constitution",
  },
  {
    original: "The Constitution constitutes the nation.",
    translation: "Democracy calls upon every citizen to take part in nation-building.",
    source: "Nani Palkhivala",
    category: "Constitution",
  },
  {
    original: "If the Supreme Court cannot understand its own judgment, then who will?",
    translation: "Clarity in constitutional principle is a duty owed by the institution itself.",
    source: "Nani Palkhivala",
    category: "Justice",
  },
  {
    original: "The basic structure of our Constitution, like the North Star, guides those who interpret it.",
    translation: "Constitutional fundamentals keep the law on its proper course.",
    source: "Justice D. Y. Chandrachud",
    category: "Constitution",
  },
];

export interface WorkspaceDocument {
  id: string;
  name: string;
  category: string;
  uploadedAt: string;
  downloadPath?: string;
}

export interface WorkspaceCommunication {
  id: string;
  type: string;
  title: string;
  summary: string;
  occurredAt: string;
  recordingStatus?: string;
}

export interface WorkspaceFee {
  id: string;
  label: string;
  amount: number;
  status: string;
  dueDate?: string | null;
}

export interface PipelineProgress {
  stage: string;
  stageOrder: number;
  stageLabel: string;
  clientCopy: string;
  totalStages: number;
  steps: Array<{
    key: string;
    order: number;
    label: string;
    complete: boolean;
    current: boolean;
  }>;
}

export interface WorkspaceCase {
  id: string;
  caseTitle: string;
  caseNumber: string;
  courtName: string;
  status: string;
  stage: string;
  bookingId?: string | null;
  pipelineStage?: string | null;
  pipeline?: PipelineProgress | null;
  nextDate?: string | null;
  appearanceRequired: boolean;
  nextAction: string;
  costRisk?: string;
  healthScore?: number;
  healthBand?: string;
  health?: {
    score: number;
    band: string;
    factors?: Array<{ code: string; impact: number; label: string }>;
  };
  clientName?: string;
  counsel?: {
    name: string;
    displayName?: string;
    enrollment?: string;
    assignedAt?: string;
    contactPolicy?: string;
    fullNameHidden?: boolean;
  } | null;
  documents: WorkspaceDocument[];
  communications: WorkspaceCommunication[];
  fees: WorkspaceFee[];
}

export async function workspaceRequest<T>(path: string, token?: string | null, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers || {}),
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || payload.message || "This request could not be completed.");
  }
  return payload as T;
}

export function greetingFor(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function dailyQuote(date = new Date()) {
  const start = new Date(date.getFullYear(), 0, 0);
  const day = Math.floor((date.getTime() - start.getTime()) / 86400000);
  return legalQuotes[day % legalQuotes.length];
}
