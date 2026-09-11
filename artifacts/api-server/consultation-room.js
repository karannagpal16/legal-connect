/**
 * LC Consultation Room — supervised live session on booking_id.
 *
 * Opens only after Work Completion Hold + LC assign + advocate accept.
 * Chat is first-party. Audio/video tokens are a later slice in this same room.
 * ProxyHub Q&A stays on task_id and must never share this thread.
 */

const crypto = require("crypto");
const { isWorkHoldActive, isComplimentaryHold } = require("./work-hold");
const { demoMemory } = require("./production-guards");
const { encryptText, decryptText } = require("./security");
const { redactContactLeaks } = require("./leak-filter");

const SESSION_WINDOWS = {
  chat: { channel: "chat", durationMs: 45 * 60 * 1000, amountInr: 99, label: "₹99 chat session · 45 min" },
  call: { channel: "call", durationMs: 20 * 60 * 1000, amountInr: 299, label: "₹299 audio session · 20 min" },
  video: { channel: "video", durationMs: 30 * 60 * 1000, amountInr: 499, label: "₹499 video session · 30 min" },
};

const WARNING_MS = 60 * 1000;
const FREEZE_AFTER_STRIKES = 2;
const MAX_MESSAGE_CHARS = 2000;
const CONTACT_RAW_FIELDS = [
  "clientEmail",
  "clientPhone",
  "email",
  "phone",
  "assignedAdvocateEmail",
  "assignedAdvocatePhone",
  "advocateEmail",
  "advocatePhone",
  "whatsapp",
  "clientWhatsapp",
  "mobile",
  "clientMobile",
];

function windowMeta(channel) {
  const key = String(channel || "chat").toLowerCase();
  if (key === "call" || key === "audio") return SESSION_WINDOWS.call;
  if (key === "video") return SESSION_WINDOWS.video;
  return SESSION_WINDOWS.chat;
}

function publicPricing() {
  return {
    first_chat_free: true,
    chat: { amount: SESSION_WINDOWS.chat.amountInr, unit: "session", durationMinutes: 45, label: SESSION_WINDOWS.chat.label },
    call: { amount: SESSION_WINDOWS.call.amountInr, unit: "session", durationMinutes: 20, label: SESSION_WINDOWS.call.label },
    video: { amount: SESSION_WINDOWS.video.amountInr, unit: "session", durationMinutes: 30, label: SESSION_WINDOWS.video.label },
  };
}

function maskPhoneValue(phone) {
  const value = String(phone || "").replace(/\s+/g, "");
  if (!value || /^not provided$/i.test(value)) return "";
  if (value.length < 6) return "••••";
  return `${value.slice(0, 3)}****${value.slice(-3)}`;
}

function maskEmailValue(email) {
  const value = String(email || "").trim();
  if (!value.includes("@")) return "";
  const [name, domain] = value.split("@");
  const visible = name.slice(0, 2);
  return `${visible}${"*".repeat(Math.max(name.length - 2, 2))}@${domain}`;
}

function isPlaceholderContact(value) {
  const text = String(value || "").trim();
  if (!text || /^not provided$/i.test(text)) return true;
  return /client@(?:demo\.)?legal-connect\.in/i.test(text);
}

function maskBookingContacts(booking, audience) {
  if (!booking || typeof booking !== "object") return booking;
  const role = String(audience || "").toLowerCase();
  const admin = role === "admin" || role === "rna";
  const clientEmail = isPlaceholderContact(booking.clientEmail || booking.email) ? "" : (booking.clientEmail || booking.email || "");
  const clientPhone = isPlaceholderContact(booking.clientPhone || booking.phone) ? "" : (booking.clientPhone || booking.phone || "");
  const advocateEmail = booking.assignedAdvocateEmail || booking.advocateEmail || "";
  const advocatePhone = booking.assignedAdvocatePhone || booking.advocatePhone || "";
  const safe = { ...booking };
  for (const key of CONTACT_RAW_FIELDS) delete safe[key];
  if (safe.payload && typeof safe.payload === "object") {
    const payload = { ...safe.payload };
    for (const key of CONTACT_RAW_FIELDS) delete payload[key];
    safe.payload = payload;
  }
  safe.clientEmailMasked = maskEmailValue(clientEmail);
  safe.clientPhoneMasked = maskPhoneValue(clientPhone);
  safe.emailMasked = safe.clientEmailMasked;
  safe.phoneMasked = safe.clientPhoneMasked;
  safe.advocateEmailMasked = maskEmailValue(advocateEmail);
  safe.advocatePhoneMasked = maskPhoneValue(advocatePhone);
  safe.contactPolicy = "Contact through Legal Connect only";
  if (role === "client") {
    safe.counterpartLabel = "Legal Connect counsel";
  } else if (role === "advocate") {
    safe.counterpartLabel = "Legal Connect client";
    if (!admin) safe.clientName = booking.clientName ? "Legal Connect client" : safe.clientName;
  }
  return safe;
}

function isAdvisoryHoldLocked(booking) {
  if (!booking) return false;
  const hold = String(booking.workHoldStatus || booking.work_hold_status || "").toLowerCase();
  const payment = String(booking.paymentStatus || booking.payment_status || "").toLowerCase();
  const paid = /paid|captured|verified|demo/.test(payment);
  if ((/active|lock|held/.test(hold) || isComplimentaryHold(booking)) && paid) return true;
  return isWorkHoldActive(booking);
}

function bookingChannel(booking) {
  return String(booking?.consultationChannel || booking?.payload?.consultationChannel || "chat").toLowerCase();
}

function assignedAdvocateId(booking) {
  return booking?.assignedAdvocateId
    || booking?.assigned_advocate_id
    || booking?.payload?.assignedAdvocateId
    || booking?.assignedTo
    || null;
}

function advocateAccepted(booking) {
  return Boolean(
    booking?.advocateAcceptedAt
    || booking?.payload?.advocateAcceptedAt
    || /advocate_accepted|work_in_progress|advisory_in_progress/i.test(String(booking?.intakeStatus || booking?.stageStatus || "")),
  );
}

function bookingClosed(booking) {
  const status = `${booking?.intakeStatus || ""} ${booking?.stageStatus || ""} ${booking?.paymentStatus || ""} ${booking?.status || ""}`.toLowerCase();
  return /refund|cancel|concluded|advisory_completed|expired|matter_concluded/.test(status)
    || Boolean(booking?.advisoryCompletedAt);
}

function conflictCleared(booking) {
  if (booking?.conflictClearedAt || booking?.payload?.conflictClearedAt) return true;
  const status = String(booking?.intakeStatus || booking?.stageStatus || "").toLowerCase();
  return /advocate_assigned|advocate_accepted|work_in_progress|advisory_in_progress|acknowledged_and_assigned/.test(status)
    || Boolean(assignedAdvocateId(booking));
}

function roomRole(authUser, booking) {
  if (!authUser) return null;
  if (["admin", "rna"].includes(String(authUser.role || ""))) return "admin";
  if (String(booking.userId || booking.user_id) === String(authUser.id)) return "client";
  if (String(assignedAdvocateId(booking)) === String(authUser.id)) return "advocate";
  return null;
}

function displayNameFor(role) {
  if (role === "client") return "Legal Connect client";
  if (role === "advocate") return "Legal Connect counsel";
  if (role === "admin") return "Legal Connect Admin";
  return "Legal Connect";
}

function sessionIdentity(role, bookingId, userId) {
  const tokenRole = role === "admin" ? "admin-observer" : (role === "advocate" ? "advocate" : "client");
  return `${tokenRole}|${bookingId || ""}|${userId || ""}`;
}

function deriveStatus(booking, roomRow, now = Date.now()) {
  if (bookingClosed(booking)) return "completed";
  if (roomRow?.status === "frozen" || Number(roomRow?.leak_strikes || roomRow?.leakStrikes || 0) >= FREEZE_AFTER_STRIKES) {
    return "frozen";
  }
  if (!isAdvisoryHoldLocked(booking)) return "awaiting_hold";
  if (!assignedAdvocateId(booking) || !conflictCleared(booking)) return "awaiting_assign";
  if (!advocateAccepted(booking)) return "awaiting_accept";
  const ends = roomRow?.window_ends_at || roomRow?.windowEndsAt;
  if (ends && new Date(ends).getTime() <= now) return "expired";
  return "open";
}

function canPostToRoom(status, role) {
  if (status !== "open") return false;
  return role === "client" || role === "advocate" || role === "admin";
}

function mapRoomRow(row) {
  const payload = row.payload && typeof row.payload === "object" ? row.payload : {};
  return {
    id: row.id,
    bookingId: row.booking_id || row.bookingId,
    caseId: row.case_id || row.caseId || payload.caseId || null,
    status: row.status,
    channel: row.channel || payload.channel || "chat",
    windowStartsAt: row.window_starts_at || row.windowStartsAt || null,
    windowEndsAt: row.window_ends_at || row.windowEndsAt || null,
    freezeReason: row.freeze_reason || row.freezeReason || null,
    leakStrikes: Number(row.leak_strikes || row.leakStrikes || 0),
    payload,
    createdAt: row.created_at || row.createdAt,
    updatedAt: row.updated_at || row.updatedAt,
  };
}

function remainingMs(room, now = Date.now()) {
  if (!room?.windowEndsAt) return null;
  return Math.max(0, new Date(room.windowEndsAt).getTime() - now);
}

function publicRoom(room, booking, authUser, now = Date.now()) {
  const role = roomRole(authUser, booking);
  const status = deriveStatus(booking, {
    status: room.status,
    leak_strikes: room.leakStrikes,
    window_ends_at: room.windowEndsAt,
  }, now);
  const window = windowMeta(room.channel || bookingChannel(booking));
  const left = remainingMs({ ...room, windowEndsAt: room.windowEndsAt }, now);
  return {
    id: room.id,
    bookingId: room.bookingId,
    caseId: room.caseId,
    status,
    channel: window.channel,
    sessionLabel: window.label,
    windowStartsAt: room.windowStartsAt,
    windowEndsAt: room.windowEndsAt,
    remainingMs: left,
    warning: Boolean(left != null && left > 0 && left <= WARNING_MS),
    leakStrikes: room.leakStrikes,
    freezeReason: status === "frozen" ? (room.freezeReason || "Contact sharing is not allowed in the LC room.") : null,
    selfRole: role,
    selfDisplayName: displayNameFor(role),
    selfIdentity: sessionIdentity(role, room.bookingId, authUser?.id),
    counterpart: {
      role: role === "client" ? "advocate" : "client",
      displayName: role === "client" ? displayNameFor("advocate") : displayNameFor("client"),
    },
    canPost: canPostToRoom(status, role),
    canCall: false,
    mediaNote: "Audio and video join this same room in a later release. Chat is the live session now.",
    contactPolicy: "Numbers stay in the Identity Vault. Only Admin can unmask.",
  };
}

function publicMessage(row, { admin }) {
  const redacted = row.body_redacted || row.bodyRedacted || "";
  let original = null;
  if (admin) {
    original = row.body_original || row.bodyOriginal || null;
    if (!original && row.body_original_cipher) {
      original = decryptText(row.body_original_cipher) || null;
    }
    if (!original) original = redacted;
  }
  const senderRole = row.sender_role || row.senderRole || "system";
  return {
    id: row.id,
    bookingId: row.booking_id || row.bookingId,
    senderRole,
    displayName: displayNameFor(senderRole),
    body: redacted,
    bodyOriginal: admin ? original : undefined,
    leakHits: admin ? (row.leak_hits || row.leakHits || []) : undefined,
    createdAt: row.created_at || row.createdAt,
  };
}

function createConsultationRoom(deps) {
  const {
    db,
    config,
    demoStore,
    sendJson,
    readBody,
    getAuthUser,
    canSeeAll,
    mapBooking,
    writeAuditLog,
    notify,
    resolveRecipients,
    resolveAdminRecipients,
    portalUrl,
  } = deps;

  const memory = () => {
    const store = demoMemory(config.nodeEnv, demoStore);
    if (!store) return null;
    if (!store.consultationRooms) store.consultationRooms = [];
    if (!store.consultationMessages) store.consultationMessages = [];
    return store;
  };

  let schemaReady = false;
  async function ensureSchema() {
    if (!db.dbAvailable) return false;
    if (schemaReady) return true;
    await db.query(`
      CREATE TABLE IF NOT EXISTS consultation_rooms (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        booking_id text NOT NULL UNIQUE,
        case_id text,
        status text NOT NULL DEFAULT 'awaiting_assign',
        channel text NOT NULL DEFAULT 'chat',
        window_starts_at timestamptz,
        window_ends_at timestamptz,
        freeze_reason text,
        leak_strikes integer NOT NULL DEFAULT 0,
        payload jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      )
    `);
    await db.query(`CREATE INDEX IF NOT EXISTS consultation_rooms_status_idx ON consultation_rooms (status, updated_at DESC)`);
    await db.query(`
      CREATE TABLE IF NOT EXISTS consultation_room_messages (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        room_id uuid NOT NULL REFERENCES consultation_rooms(id) ON DELETE CASCADE,
        booking_id text NOT NULL,
        sender_id text,
        sender_role text NOT NULL,
        body_redacted text NOT NULL,
        body_original_cipher text,
        leak_hits jsonb NOT NULL DEFAULT '[]'::jsonb,
        created_at timestamptz DEFAULT now()
      )
    `);
    await db.query(`CREATE INDEX IF NOT EXISTS consultation_room_messages_room_idx ON consultation_room_messages (room_id, created_at)`);
    schemaReady = true;
    return true;
  }

  async function loadBooking(bookingId) {
    if (!bookingId) return null;
    if (db.dbAvailable) {
      const result = await db.query(
        "SELECT * FROM bookings WHERE id::text = $1 LIMIT 1",
        [String(bookingId)],
      ).catch(() => ({ rows: [] }));
      if (result.rows[0]) return mapBooking(result.rows[0]);
    }
    const store = memory();
    return (store?.bookings || []).find((item) => String(item.id) === String(bookingId)) || null;
  }

  async function loadCaseId(bookingId) {
    if (!db.dbAvailable) return null;
    const result = await db.query(
      `SELECT id FROM cases WHERE payload->>'bookingId' = $1 ORDER BY created_at DESC LIMIT 1`,
      [String(bookingId)],
    ).catch(() => ({ rows: [] }));
    return result.rows[0]?.id || null;
  }

  async function readRoom(bookingId) {
    await ensureSchema();
    if (db.dbAvailable) {
      const result = await db.query(
        "SELECT * FROM consultation_rooms WHERE booking_id = $1 LIMIT 1",
        [String(bookingId)],
      ).catch(() => ({ rows: [] }));
      if (result.rows[0]) return mapRoomRow(result.rows[0]);
    }
    const store = memory();
    const row = (store?.consultationRooms || []).find((item) => String(item.bookingId) === String(bookingId));
    return row ? mapRoomRow(row) : null;
  }

  async function writeRoom(room) {
    await ensureSchema();
    const channel = room.channel || "chat";
    const payload = JSON.stringify(room.payload || {});
    if (db.dbAvailable) {
      const result = await db.query(
        `INSERT INTO consultation_rooms (
           id, booking_id, case_id, status, channel, window_starts_at, window_ends_at,
           freeze_reason, leak_strikes, payload, updated_at
         ) VALUES (
           COALESCE($1::uuid, gen_random_uuid()), $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, now()
         )
         ON CONFLICT (booking_id) DO UPDATE SET
           case_id = EXCLUDED.case_id,
           status = EXCLUDED.status,
           channel = EXCLUDED.channel,
           window_starts_at = EXCLUDED.window_starts_at,
           window_ends_at = EXCLUDED.window_ends_at,
           freeze_reason = EXCLUDED.freeze_reason,
           leak_strikes = EXCLUDED.leak_strikes,
           payload = EXCLUDED.payload,
           updated_at = now()
         RETURNING *`,
        [
          room.id || null,
          String(room.bookingId),
          room.caseId || null,
          room.status,
          channel,
          room.windowStartsAt || null,
          room.windowEndsAt || null,
          room.freezeReason || null,
          Number(room.leakStrikes || 0),
          payload,
        ],
      );
      return mapRoomRow(result.rows[0]);
    }
    const store = memory();
    if (!store) throw new Error("Consultation room storage is unavailable.");
    const existing = store.consultationRooms.findIndex((item) => String(item.bookingId) === String(room.bookingId));
    const saved = {
      id: room.id || crypto.randomUUID(),
      booking_id: String(room.bookingId),
      bookingId: String(room.bookingId),
      case_id: room.caseId || null,
      status: room.status,
      channel,
      window_starts_at: room.windowStartsAt || null,
      window_ends_at: room.windowEndsAt || null,
      freeze_reason: room.freezeReason || null,
      leak_strikes: Number(room.leakStrikes || 0),
      payload: room.payload || {},
      created_at: room.createdAt || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    if (existing >= 0) store.consultationRooms[existing] = { ...store.consultationRooms[existing], ...saved };
    else store.consultationRooms.unshift(saved);
    return mapRoomRow(saved);
  }

  async function ensureRoom(booking, { startWindow = false } = {}) {
    const existing = await readRoom(booking.id);
    const channel = bookingChannel(booking);
    const window = windowMeta(channel);
    const caseId = existing?.caseId || await loadCaseId(booking.id);
    let next = existing || {
      id: null,
      bookingId: booking.id,
      caseId,
      status: "awaiting_assign",
      channel: window.channel,
      windowStartsAt: null,
      windowEndsAt: null,
      freezeReason: null,
      leakStrikes: 0,
      payload: { product: "advisory" },
    };
    const status = deriveStatus(booking, next);
    next.status = status;
    next.channel = window.channel;
    next.caseId = caseId || next.caseId;
    if (startWindow && status === "open" && !next.windowStartsAt) {
      const start = new Date();
      next.windowStartsAt = start.toISOString();
      next.windowEndsAt = new Date(start.getTime() + window.durationMs).toISOString();
    }
    if (status === "frozen" && !next.freezeReason) {
      next.freezeReason = "Contact sharing is not allowed in the LC room.";
    }
    return writeRoom(next);
  }

  async function listMessages(room, { admin, since } = {}) {
    await ensureSchema();
    if (db.dbAvailable) {
      const params = [room.id];
      let sql = "SELECT * FROM consultation_room_messages WHERE room_id = $1";
      if (since) {
        params.push(since);
        sql += ` AND created_at > $2`;
      }
      sql += " ORDER BY created_at ASC LIMIT 400";
      const result = await db.query(sql, params).catch(() => ({ rows: [] }));
      return result.rows.map((row) => publicMessage(row, { admin }));
    }
    const store = memory();
    const rows = (store?.consultationMessages || [])
      .filter((item) => String(item.room_id || item.roomId) === String(room.id))
      .filter((item) => !since || new Date(item.created_at || item.createdAt).getTime() > new Date(since).getTime())
      .sort((a, b) => new Date(a.created_at || a.createdAt) - new Date(b.created_at || b.createdAt));
    return rows.map((row) => publicMessage(row, { admin }));
  }

  async function insertMessage(room, { senderId, senderRole, body, hits }) {
    await ensureSchema();
    const cipher = encryptText(body.original) || body.original;
    if (db.dbAvailable) {
      const result = await db.query(
        `INSERT INTO consultation_room_messages (
           room_id, booking_id, sender_id, sender_role, body_redacted, body_original_cipher, leak_hits
         ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
         RETURNING *`,
        [
          room.id,
          String(room.bookingId),
          senderId || null,
          senderRole,
          body.redacted,
          cipher,
          JSON.stringify(hits || []),
        ],
      );
      return result.rows[0];
    }
    const store = memory();
    if (!store) throw new Error("Consultation room storage is unavailable.");
    const row = {
      id: crypto.randomUUID(),
      room_id: room.id,
      booking_id: String(room.bookingId),
      sender_id: senderId || null,
      sender_role: senderRole,
      body_redacted: body.redacted,
      body_original_cipher: cipher,
      body_original: body.original,
      leak_hits: hits || [],
      created_at: new Date().toISOString(),
    };
    store.consultationMessages.push(row);
    return row;
  }

  async function listRoomsForUser(authUser) {
    const store = memory();
    let bookings = [];
    if (db.dbAvailable) {
      if (canSeeAll(authUser)) {
        const result = await db.query("SELECT * FROM bookings ORDER BY created_at DESC LIMIT 80");
        bookings = result.rows.map(mapBooking);
      } else if (authUser.role === "advocate") {
        const result = await db.query(
          "SELECT * FROM bookings WHERE payload->>'assignedAdvocateId' = $1 OR payload->>'assignedTo' = $1 ORDER BY created_at DESC LIMIT 40",
          [String(authUser.id)],
        );
        bookings = result.rows.map(mapBooking);
      } else {
        const result = await db.query(
          "SELECT * FROM bookings WHERE user_id::text = $1 ORDER BY created_at DESC LIMIT 40",
          [String(authUser.id)],
        );
        bookings = result.rows.map(mapBooking);
      }
    } else {
      bookings = store?.bookings || [];
    }
    const rooms = [];
    for (const booking of bookings) {
      if (roomRole(authUser, booking) == null) continue;
      if (!isAdvisoryHoldLocked(booking) && !canSeeAll(authUser)) continue;
      const room = await ensureRoom(booking);
      rooms.push(publicRoom(room, booking, authUser));
    }
    return rooms;
  }

  function gateError(status) {
    if (status === "awaiting_hold") return { code: "HOLD_REQUIRED", error: "The consultation room opens after the session is paid and locked." };
    if (status === "awaiting_assign") return { code: "LC_ASSIGN_REQUIRED", error: "Legal Connect must assign counsel after the conflict check. No assignment means no room." };
    if (status === "awaiting_accept") return { code: "ADVOCATE_ACCEPT_REQUIRED", error: "Counsel has been assigned. The room opens after they accept." };
    if (status === "frozen") return { code: "ROOM_FROZEN", error: "This room is frozen because contact details were shared. Admin has been flagged." };
    if (status === "expired") return { code: "WINDOW_ENDED", error: "The paid session window has ended. Pay to extend, or ask Admin to grant time." };
    if (status === "completed") return { code: "SESSION_CLOSED", error: "This advisory session is closed." };
    return { code: "ROOM_CLOSED", error: "This consultation room is not open." };
  }

  async function requireRoomAccess(req, res, bookingId) {
    const authUser = getAuthUser(req);
    if (!authUser) {
      sendJson(res, 401, { ok: false, error: "Login is required." });
      return null;
    }
    const booking = await loadBooking(bookingId);
    if (!booking) {
      sendJson(res, 404, { ok: false, error: "Booking not found." });
      return null;
    }
    const role = roomRole(authUser, booking);
    if (!role) {
      sendJson(res, 403, { ok: false, error: "Forbidden." });
      return null;
    }
    const room = await ensureRoom(booking, { startWindow: true });
    return { authUser, booking, room, role };
  }

  async function postMessage(req, res, bookingId) {
    const access = await requireRoomAccess(req, res, bookingId);
    if (!access) return;
    const { authUser, booking, room, role } = access;
    const status = deriveStatus(booking, room);
    if (!canPostToRoom(status, role)) {
      sendJson(res, 409, { ok: false, ...gateError(status) });
      return;
    }
    const body = await readBody(req);
    if (body.attachment || body.file || body.files || body.image) {
      sendJson(res, 415, { ok: false, error: "Files stay on the Case Card. The live room is text only." });
      return;
    }
    const text = String(body.body || body.message || body.summary || "").trim();
    if (!text || text.length > MAX_MESSAGE_CHARS) {
      sendJson(res, 400, { ok: false, error: `Message must be between 1 and ${MAX_MESSAGE_CHARS} characters.` });
      return;
    }
    const filtered = redactContactLeaks(text);
    let nextRoom = room;
    if (filtered.leaked) {
      const strikes = Number(room.leakStrikes || 0) + 1;
      const frozen = strikes >= FREEZE_AFTER_STRIKES;
      nextRoom = await writeRoom({
        ...room,
        leakStrikes: strikes,
        status: frozen ? "frozen" : room.status,
        freezeReason: frozen ? "Contact sharing is not allowed in the LC room." : room.freezeReason,
      });
      await writeAuditLog(
        authUser,
        "consultation_leak_flagged",
        "booking",
        bookingId,
        "Contact leak filtered in LC Consultation Room",
        { strikes, hits: filtered.hits.map((hit) => hit.type), frozen },
      ).catch(() => undefined);
      try {
        await notify({
          eventType: "consultation_leak_flagged",
          title: frozen ? "Consultation room frozen" : "Contact leak blocked in LC room",
          message: frozen
            ? "A party tried to share contact details twice. The room is frozen pending Admin review."
            : "A contact leak was stripped from the LC Consultation Room.",
          recipients: await resolveAdminRecipients(),
          payload: { bookingId, actionType: "ADMIN_ASSIGN", targetUrl: `/admin/control?tab=intakes&bookingId=${bookingId}` },
          sendEmail: frozen,
          ctaLabel: "Open Case Card",
          ctaUrl: portalUrl(`/admin/control?tab=intakes&bookingId=${bookingId}`),
        });
      } catch {
        // Notify is best-effort; the message is still stored.
      }
    }
    const row = await insertMessage(nextRoom, {
      senderId: authUser.id,
      senderRole: role,
      body: filtered,
      hits: filtered.hits,
    });
    sendJson(res, 201, {
      ok: true,
      room: publicRoom(nextRoom, booking, authUser),
      message: publicMessage(row, { admin: role === "admin" }),
    });
  }

  async function revealContact(req, res, bookingId) {
    const authUser = getAuthUser(req);
    if (!authUser || !canSeeAll(authUser)) {
      sendJson(res, 403, { ok: false, error: "Admin access required." });
      return;
    }
    const booking = await loadBooking(bookingId);
    if (!booking) {
      sendJson(res, 404, { ok: false, error: "Booking not found." });
      return;
    }
    await writeAuditLog(
      authUser,
      "reveal_contact",
      "booking",
      bookingId,
      "Admin unmasked consultation contacts",
      { audience: "admin" },
    ).catch(() => undefined);
    sendJson(res, 200, {
      ok: true,
      reveal: {
        bookingId,
        clientName: booking.clientName || null,
        clientEmail: booking.clientEmail || booking.email || null,
        clientPhone: booking.clientPhone || booking.phone || null,
        advocateName: booking.assignedAdvocateName || null,
        advocateEmail: booking.assignedAdvocateEmail || booking.advocateEmail || null,
        advocatePhone: booking.assignedAdvocatePhone || booking.advocatePhone || null,
      },
      audited: true,
    });
  }

  async function extendWindow(req, res, bookingId) {
    const authUser = getAuthUser(req);
    if (!authUser || !canSeeAll(authUser)) {
      sendJson(res, 403, { ok: false, error: "Admin access required." });
      return;
    }
    const booking = await loadBooking(bookingId);
    if (!booking) {
      sendJson(res, 404, { ok: false, error: "Booking not found." });
      return;
    }
    const body = await readBody(req);
    const minutes = Math.min(60, Math.max(5, Number(body.minutes || 15)));
    const room = await ensureRoom(booking);
    const frozen = Number(room.leakStrikes || 0) >= FREEZE_AFTER_STRIKES || room.status === "frozen";
    const base = Math.max(Date.now(), room.windowEndsAt ? new Date(room.windowEndsAt).getTime() : Date.now());
    const updated = await writeRoom({
      ...room,
      status: frozen ? "frozen" : "open",
      windowStartsAt: room.windowStartsAt || new Date().toISOString(),
      windowEndsAt: new Date(base + minutes * 60 * 1000).toISOString(),
    });
    await writeAuditLog(authUser, "consultation_window_extended", "booking", bookingId, `Admin granted ${minutes} more minutes`, { minutes });
    sendJson(res, 200, { ok: true, room: publicRoom(updated, booking, authUser) });
  }

  async function handleConsultationRoomRoutes(req, res, url) {
    const listMatch = url.pathname === "/api/consultation-rooms";
    const roomMatch = url.pathname.match(/^\/api\/consultation-rooms\/([^/]+)(?:\/(messages|events|reveal-contact|extend))?$/);
    const legacyReveal = url.pathname.match(/^\/api\/admin\/bookings\/([^/]+)\/reveal-contact$/);

    if (legacyReveal && req.method === "POST") {
      await revealContact(req, res, legacyReveal[1]);
      return true;
    }
    if (!listMatch && !roomMatch) return false;

    if (listMatch && req.method === "GET") {
      const authUser = getAuthUser(req);
      if (!authUser) {
        sendJson(res, 401, { ok: false, error: "Login is required." });
        return true;
      }
      const rooms = await listRoomsForUser(authUser);
      sendJson(res, 200, { ok: true, rooms });
      return true;
    }

    if (!roomMatch) return false;
    const bookingId = roomMatch[1];
    const action = roomMatch[2] || "";

    if (req.method === "GET" && (action === "" || action === "messages")) {
      const access = await requireRoomAccess(req, res, bookingId);
      if (!access) return true;
      const { authUser, booking, room, role } = access;
      if (role === "admin") {
        const observers = Array.isArray(room.payload?.adminObservedBy) ? room.payload.adminObservedBy : [];
        if (!observers.includes(authUser.id)) {
          await writeRoom({
            ...room,
            payload: { ...(room.payload || {}), adminObservedBy: [...observers, authUser.id] },
          });
          await writeAuditLog(
            authUser,
            "consultation_admin_observer",
            "booking",
            bookingId,
            "Admin joined LC room as observer",
            { identity: sessionIdentity("admin", bookingId, authUser.id) },
          ).catch(() => undefined);
        }
      }
      const since = url.searchParams.get("since") || null;
      const messages = await listMessages(room, { admin: role === "admin", since });
      sendJson(res, 200, {
        ok: true,
        room: publicRoom(room, booking, authUser),
        messages,
        booking: maskBookingContacts(booking, role === "admin" ? "admin" : role),
      });
      return true;
    }

    if (req.method === "POST" && (action === "" || action === "messages")) {
      await postMessage(req, res, bookingId);
      return true;
    }

    if (req.method === "POST" && action === "reveal-contact") {
      await revealContact(req, res, bookingId);
      return true;
    }

    if (req.method === "POST" && action === "extend") {
      await extendWindow(req, res, bookingId);
      return true;
    }

    return false;
  }

  return {
    handleConsultationRoomRoutes,
    ensureRoom,
    loadBooking,
    maskBookingContacts,
    deriveStatus,
    publicRoom,
  };
}

module.exports = {
  SESSION_WINDOWS,
  WARNING_MS,
  FREEZE_AFTER_STRIKES,
  publicPricing,
  maskBookingContacts,
  maskPhoneValue,
  maskEmailValue,
  isAdvisoryHoldLocked,
  deriveStatus,
  roomRole,
  displayNameFor,
  sessionIdentity,
  createConsultationRoom,
};
