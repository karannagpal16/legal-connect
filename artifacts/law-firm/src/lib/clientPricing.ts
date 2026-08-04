/** Client advisory pricing shown on the client dashboard / booking flow. */

export type AdvisoryChannel = "chat" | "call" | "video";

export const CLIENT_ADVISORY_PRICING = {
  firstChatFree: true,
  chat: {
    amount: 99,
    unitLabel: "2 mins",
    detail: "First chat free, then ₹99 / 2 mins",
    shortPrice: "₹99 / 2 mins",
  },
  call: {
    amount: 299,
    unitLabel: "session",
    detail: "Private audio consultation — from ₹299",
    shortPrice: "from ₹299",
  },
  video: {
    amount: 499,
    unitLabel: "session",
    detail: "Private video consultation — from ₹499",
    shortPrice: "from ₹499",
  },
} as const;

export function advisoryAmount(channel: AdvisoryChannel): number {
  return CLIENT_ADVISORY_PRICING[channel].amount;
}
