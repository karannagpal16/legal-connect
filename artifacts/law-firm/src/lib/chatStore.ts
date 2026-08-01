/**
 * Demo direct-chat store retired — Legal Connect supervised updates are the only client↔counsel channel.
 * Kept as a stub so any stale import fails closed instead of restoring localStorage "E2E" chat.
 */

export type ChatMessage = {
  id: string;
  from: "advocate" | "client";
  text: string;
  timestamp: number;
  encrypted?: boolean;
  read?: boolean;
};

export type ChatConversation = {
  id: string;
  clientName: string;
  advocateName: string;
  caseTitle: string;
  lastActivity: number;
  messages: ChatMessage[];
};

const DISABLED_ERROR = "Direct chat is disabled. Use Legal Connect supervised case updates.";

export function getConversations(): ChatConversation[] {
  return [];
}

export function getConversation(_id: string): ChatConversation | null {
  return null;
}

export function sendMessage(_conversationId: string, _text: string): ChatConversation {
  throw new Error(DISABLED_ERROR);
}

export function markRead(_conversationId: string): void {
  // no-op — direct chat store removed
}

export function decryptMessage(text: string): string {
  return text;
}

export function encryptMessage(text: string): string {
  return text;
}
