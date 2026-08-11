/**
 * Semantic diff between two normalized court snapshots.
 */

function normalizeText(value) {
  return String(value || "").replace(/\s+/g, " ").trim().toLowerCase();
}

function sameDate(a, b) {
  const left = String(a || "").slice(0, 10);
  const right = String(b || "").slice(0, 10);
  return left === right;
}

function detectCourtChanges(previous, next) {
  const events = [];
  if (!next) return events;
  const prev = previous || {};

  if (!sameDate(prev.nextHearingDate, next.nextHearingDate) && next.nextHearingDate) {
    events.push({
      eventType: "next_hearing_changed",
      severity: "high",
      oldValue: prev.nextHearingDate || null,
      newValue: next.nextHearingDate,
      summary: `Next hearing changed${prev.nextHearingDate ? ` from ${String(prev.nextHearingDate).slice(0, 10)}` : ""} to ${String(next.nextHearingDate).slice(0, 10)}.`,
    });
  }

  if (normalizeText(prev.stage) !== normalizeText(next.stage) && next.stage) {
    events.push({
      eventType: "stage_changed",
      severity: "medium",
      oldValue: prev.stage || null,
      newValue: next.stage,
      summary: `Stage updated to ${next.stage}.`,
    });
  }

  if (normalizeText(prev.courtRoom) !== normalizeText(next.courtRoom) && next.courtRoom) {
    events.push({
      eventType: "court_room_changed",
      severity: "medium",
      oldValue: prev.courtRoom || null,
      newValue: next.courtRoom,
      summary: `Court room updated to ${next.courtRoom}.`,
    });
  }

  if (String(prev.causeListItemNumber || "") !== String(next.causeListItemNumber || "") && next.causeListItemNumber != null) {
    events.push({
      eventType: "cause_list_item_changed",
      severity: "low",
      oldValue: prev.causeListItemNumber == null ? null : String(prev.causeListItemNumber),
      newValue: String(next.causeListItemNumber),
      summary: `Cause-list item updated to ${next.causeListItemNumber}.`,
    });
  }

  const prevDisposed = /dispos|closed|dismiss/i.test(String(prev.status || ""));
  const nextDisposed = /dispos|closed|dismiss/i.test(String(next.status || ""));
  if (!prevDisposed && nextDisposed) {
    events.push({
      eventType: "case_disposed",
      severity: "high",
      oldValue: prev.status || null,
      newValue: next.status,
      summary: `Matter marked disposed/closed (${next.status}).`,
    });
  }

  const prevOrders = Array.isArray(prev.orders) ? prev.orders : [];
  const nextOrders = Array.isArray(next.orders) ? next.orders : [];
  const prevIds = new Set(prevOrders.map((item) => item.id || item.sourceUrl || item.title));
  for (const order of nextOrders) {
    const key = order.id || order.sourceUrl || order.title;
    if (key && !prevIds.has(key)) {
      events.push({
        eventType: "new_order_available",
        severity: "high",
        oldValue: null,
        newValue: order.title || order.id || "Order",
        summary: `New court order available: ${order.title || "Daily order"}.`,
        order,
      });
    }
  }

  return events;
}

module.exports = { detectCourtChanges, normalizeText };
