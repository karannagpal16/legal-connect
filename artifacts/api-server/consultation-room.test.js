process.env.DATA_ENCRYPTION_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
process.env.SESSION_SECRET = "local-dev-session-secret-at-least-32-chars!!";
process.env.NODE_ENV = "test";

const assert = require("assert");
const {
  maskBookingContacts,
  isAdvisoryHoldLocked,
  deriveStatus,
  roomRole,
  displayNameFor,
  sessionIdentity,
  SESSION_WINDOWS,
  createConsultationRoom,
} = require("./consultation-room");

const bookingBase = {
  id: "booking-1",
  userId: "client-1",
  assignedAdvocateId: "adv-1",
  clientName: "Priya Nagpal",
  clientEmail: "priya@example.com",
  clientPhone: "+919876543210",
  assignedAdvocateEmail: "adv@example.com",
  assignedAdvocatePhone: "9999911111",
  paymentStatus: "paid",
  workHoldStatus: "active",
  intakeStatus: "advocate_accepted",
  advocateAcceptedAt: "2026-09-11T07:00:00.000Z",
  conflictClearedAt: "2026-09-11T06:50:00.000Z",
  consultationChannel: "chat",
};

{
  const clientView = maskBookingContacts(bookingBase, "client");
  assert.equal(clientView.clientPhone, undefined);
  assert.equal(clientView.assignedAdvocatePhone, undefined);
  assert.ok(clientView.phoneMasked.includes("****"));
  assert.ok(!JSON.stringify(clientView).includes("9876543210"));
  const advocateView = maskBookingContacts(bookingBase, "advocate");
  assert.equal(advocateView.clientName, "Legal Connect client");
  assert.ok(!String(advocateView.clientEmail || "").includes("priya@"));
  const adminView = maskBookingContacts(bookingBase, "admin");
  assert.ok(adminView.clientPhoneMasked);
  assert.equal(adminView.clientPhone, undefined);
}

{
  assert.equal(isAdvisoryHoldLocked(bookingBase), true);
  assert.equal(isAdvisoryHoldLocked({ ...bookingBase, paymentStatus: "Pending", workHoldStatus: "pending" }), false);
  assert.equal(roomRole({ id: "client-1", role: "client" }, bookingBase), "client");
  assert.equal(roomRole({ id: "adv-1", role: "advocate" }, bookingBase), "advocate");
  assert.equal(roomRole({ id: "stranger", role: "client" }, bookingBase), null);
  assert.equal(displayNameFor("advocate"), "Legal Connect counsel");
  assert.equal(sessionIdentity("admin", "booking-1", "admin-1"), "admin-observer|booking-1|admin-1");
  assert.equal(sessionIdentity("client", "booking-1", "client-1"), "client|booking-1|client-1");
}

{
  assert.equal(deriveStatus({ ...bookingBase, assignedAdvocateId: null, intakeStatus: "paid_escrow_hold" }, {}), "awaiting_assign");
  assert.equal(deriveStatus({ ...bookingBase, advocateAcceptedAt: null, intakeStatus: "advocate_assigned" }, {}), "awaiting_accept");
  assert.equal(deriveStatus(bookingBase, {}), "open");
  assert.equal(deriveStatus({ ...bookingBase, advisoryCompletedAt: "2026-09-11T08:00:00.000Z" }, {}), "completed");
  assert.equal(deriveStatus(bookingBase, { leak_strikes: 2, status: "frozen" }), "frozen");
}

assert.equal(SESSION_WINDOWS.chat.durationMs, 45 * 60 * 1000);
assert.ok(!String(SESSION_WINDOWS.chat.label).includes("2 min"));

const rooms = [];
const messages = [];
let activeBooking = { ...bookingBase };
let currentUser = { id: "client-1", role: "client", name: "Priya" };
let nextBody = { body: "Need you on whatsapp 9876543210" };

const fakeDb = {
  dbAvailable: true,
  async query(text, params = []) {
    if (/CREATE TABLE|CREATE INDEX/i.test(text)) return { rows: [] };
    if (/SELECT \* FROM bookings WHERE id::text/i.test(text)) {
      return { rows: [{ id: activeBooking.id, user_id: activeBooking.userId, payload: activeBooking, payment_status: "paid", work_hold_status: "active" }] };
    }
    if (/SELECT \* FROM bookings WHERE user_id::text/i.test(text)) {
      return { rows: [{ id: activeBooking.id, user_id: activeBooking.userId, payload: activeBooking, payment_status: "paid", work_hold_status: "active" }] };
    }
    if (/SELECT id FROM cases/i.test(text)) return { rows: [] };
    if (/SELECT \* FROM consultation_rooms WHERE booking_id/i.test(text)) {
      const row = rooms.find((item) => item.booking_id === params[0]);
      return { rows: row ? [row] : [] };
    }
    if (/INSERT INTO consultation_rooms/i.test(text)) {
      const row = {
        id: "11111111-1111-1111-1111-111111111111",
        booking_id: params[1],
        case_id: params[2],
        status: params[3],
        channel: params[4],
        window_starts_at: params[5],
        window_ends_at: params[6],
        freeze_reason: params[7],
        leak_strikes: params[8],
        payload: typeof params[9] === "string" ? JSON.parse(params[9] || "{}") : (params[9] || {}),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const idx = rooms.findIndex((item) => item.booking_id === row.booking_id);
      if (idx >= 0) rooms[idx] = { ...rooms[idx], ...row };
      else rooms.push(row);
      return { rows: [row] };
    }
    if (/INSERT INTO consultation_room_messages/i.test(text)) {
      const row = {
        id: `msg-${messages.length + 1}`,
        room_id: params[0],
        booking_id: params[1],
        sender_id: params[2],
        sender_role: params[3],
        body_redacted: params[4],
        body_original_cipher: params[5],
        leak_hits: JSON.parse(params[6] || "[]"),
        created_at: new Date().toISOString(),
      };
      messages.push(row);
      return { rows: [row] };
    }
    if (/SELECT \* FROM consultation_room_messages/i.test(text)) {
      return { rows: messages.filter((item) => item.room_id === params[0]) };
    }
    return { rows: [] };
  },
};

function mockRes() {
  return {
    status: 0,
    body: null,
    writeHead() {},
    end() {},
  };
}

const sent = [];
const consultationRoom = createConsultationRoom({
  db: fakeDb,
  config: { nodeEnv: "test" },
  demoStore: { bookings: [bookingBase], consultationRooms: [], consultationMessages: [] },
  sendJson(_res, status, body) {
    sent.push({ status, body });
  },
  async readBody() {
    return nextBody;
  },
  getAuthUser() {
    return currentUser;
  },
  canSeeAll(user) {
    return user && ["admin", "rna"].includes(user.role);
  },
  mapBooking(row) {
    return { ...bookingBase, ...activeBooking, id: row.id, userId: row.user_id };
  },
  writeAuditLog: async () => undefined,
  notify: async () => undefined,
  resolveRecipients: async () => [],
  resolveAdminRecipients: async () => [{ id: "admin-1" }],
  portalUrl: (path) => path,
});

(async () => {
  const res = mockRes();

  currentUser = null;
  sent.length = 0;
  await consultationRoom.handleConsultationRoomRoutes(
    { method: "GET" },
    res,
    new URL("http://local/api/consultation-rooms/booking-1"),
  );
  assert.equal(sent[sent.length - 1].status, 401);

  currentUser = { id: "client-1", role: "client", name: "Priya" };
  activeBooking = { ...bookingBase, advocateAcceptedAt: null, intakeStatus: "advocate_assigned" };
  sent.length = 0;
  await consultationRoom.handleConsultationRoomRoutes(
    { method: "POST" },
    res,
    new URL("http://local/api/consultation-rooms/booking-1/messages"),
  );
  const blocked = sent[sent.length - 1];
  assert.equal(blocked.status, 409);
  assert.equal(blocked.body.code, "ADVOCATE_ACCEPT_REQUIRED");

  rooms.length = 0;
  messages.length = 0;
  activeBooking = { ...bookingBase };

  sent.length = 0;
  await consultationRoom.handleConsultationRoomRoutes(
    { method: "GET" },
    res,
    new URL("http://local/api/consultation-rooms"),
  );
  const listed = sent[sent.length - 1];
  assert.equal(listed.status, 200);
  assert.equal(listed.body.rooms[0].status, "open");
  assert.equal(listed.body.rooms[0].windowStartsAt, null);
  assert.equal(rooms[0].window_starts_at, null);

  sent.length = 0;
  const handledGet = await consultationRoom.handleConsultationRoomRoutes(
    { method: "GET" },
    res,
    new URL("http://local/api/consultation-rooms/booking-1/messages"),
  );
  assert.equal(handledGet, true);
  const opened = sent.find((item) => item.body && item.body.room);
  assert.ok(opened, "GET should return a room");
  assert.equal(opened.body.room.status, "open");
  assert.equal(opened.body.room.canPost, true);
  assert.ok(opened.body.room.windowStartsAt);
  assert.equal(opened.body.room.selfIdentity, "client|booking-1|client-1");
  assert.equal(opened.body.room.counterpart.displayName, "Legal Connect counsel");
  assert.ok(!JSON.stringify(opened.body.booking).includes("9876543210"));
  assert.equal(opened.body.booking.phoneMasked.includes("****"), true);

  sent.length = 0;
  nextBody = { body: "Need you on whatsapp 9876543210" };
  await consultationRoom.handleConsultationRoomRoutes(
    { method: "POST" },
    res,
    new URL("http://local/api/consultation-rooms/booking-1/messages"),
  );
  const posted = sent[sent.length - 1];
  assert.equal(posted.status, 201);
  assert.ok(!posted.body.message.body.includes("9876543210"));
  assert.equal(posted.body.message.body.includes("[contact hidden]"), true);
  assert.equal(posted.body.message.bodyOriginal, undefined);
  assert.equal(posted.body.room.leakStrikes, 1);

  sent.length = 0;
  await consultationRoom.handleConsultationRoomRoutes(
    { method: "POST" },
    res,
    new URL("http://local/api/consultation-rooms/booking-1/messages"),
  );
  const second = sent[sent.length - 1];
  assert.equal(second.body.room.status, "frozen");
  assert.equal(second.body.room.canPost, false);

  sent.length = 0;
  await consultationRoom.handleConsultationRoomRoutes(
    { method: "GET" },
    res,
    new URL("http://local/api/consultation-rooms/booking-1"),
  );
  const frozenGet = sent[sent.length - 1];
  assert.equal(frozenGet.body.room.status, "frozen");
  assert.equal(frozenGet.body.messages.length >= 2, true);
  assert.ok(!JSON.stringify(frozenGet.body.messages).includes("9876543210"));
  assert.ok(!frozenGet.body.messages.some((item) => item.bodyOriginal));

  currentUser = { id: "admin-1", role: "admin", name: "LC Admin" };
  sent.length = 0;
  await consultationRoom.handleConsultationRoomRoutes(
    { method: "GET" },
    res,
    new URL("http://local/api/consultation-rooms/booking-1"),
  );
  const adminGet = sent[sent.length - 1];
  assert.equal(adminGet.body.room.selfRole, "admin");
  assert.ok(adminGet.body.messages.some((item) => String(item.bodyOriginal || "").includes("9876543210")));

  sent.length = 0;
  await consultationRoom.handleConsultationRoomRoutes(
    { method: "POST" },
    res,
    new URL("http://local/api/consultation-rooms/booking-1/reveal-contact"),
  );
  const revealed = sent[sent.length - 1];
  assert.equal(revealed.status, 200);
  assert.equal(revealed.body.reveal.clientPhone, "+919876543210");
  assert.equal(revealed.body.audited, true);

  console.log("consultation-room.test.js OK");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
