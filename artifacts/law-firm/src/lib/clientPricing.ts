/** Client advisory pricing shown on the client dashboard / booking flow. */

export type AdvisoryChannel = "chat" | "call" | "video";

export const CLIENT_ADVISORY_PRICING = {
  firstChatFree: true,
  chat: {
    amount: 99,
    unitLabel: "session",
    detail: "First chat free, then ₹99 for a 45-minute LC chat session",
    shortPrice: "₹99 session",
  },
  call: {
    amount: 299,
    unitLabel: "session",
    detail: "LC audio session — ₹299 for 20 minutes",
    shortPrice: "₹299 session",
  },
  video: {
    amount: 499,
    unitLabel: "session",
    detail: "LC video session — ₹499 for 30 minutes",
    shortPrice: "₹499 session",
  },
} as const;

export function advisoryAmount(channel: AdvisoryChannel): number {
  return CLIENT_ADVISORY_PRICING[channel].amount;
}
