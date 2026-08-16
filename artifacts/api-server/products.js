/**
 * Server-owned product catalog. Browser may send product_id only — never authoritative amount.
 */

const PRODUCTS = Object.freeze({
  consult_chat: {
    id: "consult_chat",
    name: "Advisory chat",
    amountInr: 99,
    currency: "INR",
    category: "consultation",
    unit: "2 mins",
  },
  consult_call: {
    id: "consult_call",
    name: "Advisory call",
    amountInr: 299,
    currency: "INR",
    category: "consultation",
    unit: "session",
  },
  consult_video: {
    id: "consult_video",
    name: "Advisory video",
    amountInr: 499,
    currency: "INR",
    category: "consultation",
    unit: "session",
  },
  proxy_standard: {
    id: "proxy_standard",
    name: "ProxyHub — Standard",
    amountInr: 499,
    currency: "INR",
    category: "proxy",
    urgency: "standard",
  },
  proxy_priority: {
    id: "proxy_priority",
    name: "ProxyHub — Priority",
    amountInr: 799,
    currency: "INR",
    category: "proxy",
    urgency: "priority",
  },
  proxy_urgent: {
    id: "proxy_urgent",
    name: "ProxyHub — Urgent",
    amountInr: 1299,
    currency: "INR",
    category: "proxy",
    urgency: "urgent",
  },
  chamber_core: {
    id: "chamber_core",
    name: "Chamber Core",
    amountInr: 500,
    currency: "INR",
    category: "chamber",
    planId: "core",
  },
  chamber_growth: {
    id: "chamber_growth",
    name: "Chamber Growth",
    amountInr: 1499,
    currency: "INR",
    category: "chamber",
    planId: "growth",
  },
  chamber_plus: {
    id: "chamber_plus",
    name: "Chambers+",
    amountInr: 2499,
    currency: "INR",
    category: "chamber",
    planId: "chambers_plus",
  },
});

/** Canonical ProxyHub minimum — single source of truth (UI + API must match). */
const PROXY_MIN_FEE_INR = PRODUCTS.proxy_standard.amountInr;

function resolveProductId({ productId, channel, urgency, planId } = {}) {
  if (productId && PRODUCTS[productId]) return productId;
  const ch = String(channel || "").toLowerCase();
  if (ch === "chat" || ch === "consultation_chat") return "consult_chat";
  if (ch === "call" || ch === "consultation_call") return "consult_call";
  if (ch === "video" || ch === "consultation_video") return "consult_video";
  const urg = String(urgency || "").toLowerCase();
  if (urg === "urgent" || urg === "emergency" || urg === "high" || urg === "asap") return "proxy_urgent";
  if (urg === "priority" || urg === "same_day" || urg === "same-day") return "proxy_priority";
  if (urg === "standard" || urg === "proxy") return "proxy_standard";
  const plan = String(planId || "").toLowerCase();
  if (plan === "core") return "chamber_core";
  if (plan === "growth") return "chamber_growth";
  if (plan === "chambers_plus" || plan === "plus") return "chamber_plus";
  return null;
}

function getProduct(productId) {
  return PRODUCTS[productId] || null;
}

/**
 * Resolve authoritative amount. Ignores client-supplied amount.
 */
function quoteProduct(input = {}) {
  const id = resolveProductId(input);
  const product = getProduct(id);
  if (!product) {
    const error = new Error("Unknown product. Send a valid product_id.");
    error.status = 400;
    error.code = "unknown_product";
    throw error;
  }
  return {
    productId: product.id,
    name: product.name,
    amountInr: product.amountInr,
    amountPaise: product.amountInr * 100,
    currency: product.currency,
    category: product.category,
    meta: product,
  };
}

function listProducts() {
  return Object.values(PRODUCTS);
}

module.exports = {
  PRODUCTS,
  PROXY_MIN_FEE_INR,
  resolveProductId,
  getProduct,
  quoteProduct,
  listProducts,
};
