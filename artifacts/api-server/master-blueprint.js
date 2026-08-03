/**
 * Legal Connect — Master Architectural Blueprint runtime.
 *
 * Product APIs (aliases + new conversion/qa/seed) mapped onto existing
 * bookings / tasks / payments / legal_sources tables with explicit state machines.
 */

const ADVISORY_AMOUNTS = {
  chat: 499,
  call: 999,
  video: 1499,
};

const CONSULTATION_STATES = [
  "draft",
  "paid_escrow_hold",
  "advisory_in_progress",
  "advisory_completed",
  "cancelled",
];

const RETENTION_STATES = [
  "requested",
  "lc_under_review",
  "terms_quoted",
  "panel_lawyer_assigned",
  "engagement_active",
  "declined",
];

const PROXY_STATES = [
  "escrow_paid",
  "pending_admin_review",
  "proxy_assigned_by_lc",
  "checked_in",
  "proof_uploaded",
  "proof_approved",
  "escrow_released",
  "cancelled",
];

const DEFAULT_SEED_SOURCES = [
  {
    sourceType: "bare-act",
    sourceName: "Legal Connect Source Library",
    title: "Negotiable Instruments Act, 1881 - Section 138 cheque dishonour",
    actName: "Negotiable Instruments Act, 1881",
    sectionNo: "138",
    court: "Parliament of India",
    citation: "Negotiable Instruments Act, 1881, Section 138",
    sourceUrl: "https://www.indiacode.nic.in/",
    publishedDate: "1881-12-09",
    textContent:
      "Section 138 concerns dishonour of cheque for insufficiency of funds or similar reasons. A compliant path usually involves cheque return memo, statutory demand notice within the prescribed period, failure to pay after notice, and filing a complaint within limitation. Keywords: cheque bounce, section 138, negotiable instruments, demand notice, dishonour, limitation.",
  },
  {
    sourceType: "bare-act",
    sourceName: "Legal Connect Source Library",
    title: "Bharatiya Nagarik Suraksha Sanhita, 2023 - bail process overview",
    actName: "Bharatiya Nagarik Suraksha Sanhita, 2023",
    court: "Parliament of India",
    citation: "BNSS, 2023 bail overview",
    sourceUrl: "https://www.indiacode.nic.in/",
    publishedDate: "2023-12-25",
    textContent:
      "The BNSS is the primary procedural criminal law framework replacing the Code of Criminal Procedure. A bail query should identify the offence, custody status, court forum, documents, surety, and urgency. Keywords: BNSS, bail, arrest, custody, surety, criminal procedure.",
  },
  {
    sourceType: "bare-act",
    sourceName: "Legal Connect Source Library",
    title: "Consumer Protection Act, 2019 - consumer complaint basics",
    actName: "Consumer Protection Act, 2019",
    court: "Parliament of India",
    citation: "Consumer Protection Act, 2019",
    sourceUrl: "https://www.indiacode.nic.in/",
    publishedDate: "2019-08-09",
    textContent:
      "A consumer complaint can arise from defective goods, deficiency in services, unfair trade practice, or misleading advertisement. Keywords: consumer, defective goods, service deficiency, refund, warranty, complaint.",
  },
  {
    sourceType: "explainer",
    sourceName: "Legal Connect Client Explainers",
    title: "Client explainer - LC Gateway retention vs one-time advisory",
    court: "Legal Connect",
    citation: "LC Gateway explainer",
    publishedDate: "2026-08-03",
    textContent:
      "A one-time advisory session is Astrotalk-style guidance only. Clients cannot hire an advocate directly inside the app. To convert into full court representation, the client requests LC Gateway retention; Legal Connect reviews, quotes terms, and assigns a Bar-verified panel lawyer. Keywords: advisory, retention, LC Gateway, full representation, panel lawyer.",
  },
];

function normalizeChannel(value) {
  const channel = String(value || "chat").toLowerCase();
  if (channel === "call" || channel === "audio") return "call";
  if (channel === "video") return "video";
  return "chat";
}

function consultationStateFromBooking(booking = {}) {
  const payment = String(booking.paymentStatus || booking.payment_status || "").toLowerCase();
  const stage = String(booking.intakeStatus || booking.stageStatus || booking.status || "").toLowerCase();
  const product = String(booking.productType || booking.payload?.productType || "").toLowerCase();
  if (stage.includes("cancel")) return "cancelled";
  if (stage.includes("concluded") || stage === "advisory_completed" || booking.advisoryCompletedAt) {
    return "advisory_completed";
  }
  if (payment === "paid" || payment.includes("paid")) {
    if (stage.includes("work") || stage.includes("assigned") || stage.includes("accepted")) {
      return "advisory_in_progress";
    }
    return "paid_escrow_hold";
  }
  if (product === "advisory" || booking.consultationChannel) return "draft";
  return stage || "draft";
}

function retentionStateFromBooking(booking = {}) {
  const retention = booking.retention || booking.payload?.retention || {};
  const explicit = String(retention.status || booking.retentionStatus || "").toLowerCase();
  if (explicit && RETENTION_STATES.includes(explicit)) return explicit;
  const stage = String(booking.intakeStatus || booking.stageStatus || "").toLowerCase();
  if (booking.assignedAdvocateId && (stage.includes("assigned") || stage.includes("accepted"))) {
    return "panel_lawyer_assigned";
  }
  if (retention.termsQuotedAt || booking.engagementQuotedAt) return "terms_quoted";
  if (stage.includes("under_review") || retention.requestedAt) return "lc_under_review";
  if (retention.requestedAt || booking.retentionRequestedAt) return "requested";
  return null;
}

function proxyStateFromTask(task = {}) {
  const escrow = String(task.escrowStatus || task.escrow_status || "").toLowerCase();
  const proof = String(task.proofStatus || task.proof_status || "").toLowerCase();
  const status = String(task.status || task.workflowStatus || "").toLowerCase();
  if (escrow.includes("released")) return "escrow_released";
  if (proof.includes("approved") || status.includes("completed")) return "proof_approved";
  if (proof.includes("submitted") || proof.includes("uploaded") || status.includes("proof")) return "proof_uploaded";
  if (status.includes("check")) return "checked_in";
  if (status.includes("accepted") || status.includes("assigned") || task.acceptedBy || task.assignedProxyName) {
    return "proxy_assigned_by_lc";
  }
  if (status.includes("pending") || status.includes("awaiting") || status.includes("review")) {
    return "pending_admin_review";
  }
  if (escrow.includes("lock") || escrow.includes("held") || Number(task.amount || 0) > 0) return "escrow_paid";
  if (status.includes("cancel")) return "cancelled";
  return status || "pending_admin_review";
}

function blueprintMeta() {
  return {
    ok: true,
    product: "Legal Connect Master Architectural Blueprint",
    flows: {
      A: "1-time advisory session → LC Gateway retention → full court representation",
      B: "Advocate Proxy mission → LC assign → supervised Q&A → proof → escrow release",
    },
    stateMachines: {
      consultation: CONSULTATION_STATES,
      retention: RETENTION_STATES,
      proxyTask: PROXY_STATES,
    },
    endpoints: [
      "POST /api/consultations/book-advisory",
      "POST /api/consultations/:id/complete-advisory",
      "POST /api/intakes/request-retention",
      "POST /api/admin/gateway/retention/:id/quote-terms",
      "POST /api/admin/gateway/retention/:id/assign-panel",
      "POST /api/tasks",
      "POST /api/admin/proxy-tasks/:id/assign-proxy",
      "POST /api/proxy-tasks/:id/qa",
      "GET /api/proxy-tasks/:id/qa",
      "POST /api/admin/legal-sources/seed",
      "GET /api/blueprint/meta",
    ],
    disclaimers: {
      noDirectHiring:
        "Clients cannot hire an advocate directly inside the app. Full court representation is only available through Legal Connect Gateway retention.",
    },
  };
}

function createMasterBlueprint(deps) {
  const {
    db,
    config,
    notify,
    resolveRecipients,
    resolveAdminRecipients,
    portalUrl,
    sendJson,
    readBody,
    getAuthUser,
    canSeeAll,
    mapBooking,
    mapTask,
    writeAuditLog,
    demoStore,
    activateBookingAsPaid,
    numericAmount,
    isMasterTestUser,
    strategyFeatures,
  } = deps;

  async function loadBooking(id) {
    if (db.dbAvailable) {
      const result = await db.query("SELECT * FROM bookings WHERE id = $1 LIMIT 1", [id]);
      if (!result.rows[0]) return null;
      return mapBooking(result.rows[0]);
    }
    return (demoStore.bookings || []).find((row) => row.id === id) || null;
  }

  async function patchBookingPayload(id, patch = {}, columns = {}) {
    if (!db.dbAvailable) {
      const booking = (demoStore.bookings || []).find((row) => row.id === id);
      if (!booking) return null;
      Object.assign(booking, columns, patch);
      booking.payload = { ...(booking.payload || {}), ...patch };
      return booking;
    }
    const current = await db.query("SELECT * FROM bookings WHERE id = $1 LIMIT 1", [id]);
    if (!current.rows[0]) return null;
    const payload = {
      ...(current.rows[0].payload || {}),
      ...patch,
    };
    const sets = ["payload = $2", "updated_at = now()"];
    const values = [id, JSON.stringify(payload)];
    let idx = 3;
    if (columns.stage_status != null) {
      sets.push(`stage_status = $${idx++}`);
      values.push(columns.stage_status);
    }
    if (columns.payment_status != null) {
      sets.push(`payment_status = $${idx++}`);
      values.push(columns.payment_status);
    }
    if (columns.work_hold_status != null) {
      sets.push(`work_hold_status = $${idx++}`);
      values.push(columns.work_hold_status);
    }
    if (columns.assigned_advocate_id != null) {
      sets.push(`assigned_advocate_id = $${idx++}`);
      values.push(columns.assigned_advocate_id || null);
    }
    if (columns.assigned_advocate_name != null) {
      sets.push(`assigned_advocate_name = $${idx++}`);
      values.push(columns.assigned_advocate_name || null);
    }
    const result = await db.query(
      `UPDATE bookings SET ${sets.join(", ")} WHERE id = $1 RETURNING *`,
      values,
    );
    return mapBooking(result.rows[0]);
  }

  async function loadTask(id) {
    if (db.dbAvailable) {
      const result = await db.query("SELECT * FROM tasks WHERE id = $1 LIMIT 1", [id]);
      if (!result.rows[0]) return null;
      return mapTask(result.rows[0]);
    }
    return (demoStore.tasks || []).find((row) => row.id === id) || null;
  }

  async function patchTaskPayload(id, patch = {}, columns = {}) {
    if (!db.dbAvailable) {
      const task = (demoStore.tasks || []).find((row) => row.id === id);
      if (!task) return null;
      Object.assign(task, columns);
      task.payload = { ...(task.payload || {}), ...patch };
      return mapTask ? mapTask(task) : task;
    }
    const current = await db.query("SELECT * FROM tasks WHERE id = $1 LIMIT 1", [id]);
    if (!current.rows[0]) return null;
    const payload = { ...(current.rows[0].payload || {}), ...patch };
    const sets = ["payload = $2", "updated_at = now()"];
    const values = [id, JSON.stringify(payload)];
    let idx = 3;
    if (columns.status != null) {
      sets.push(`status = $${idx++}`);
      values.push(columns.status);
    }
    if (columns.accepted_by != null) {
      sets.push(`accepted_by = $${idx++}`);
      values.push(columns.accepted_by);
    }
    if (columns.escrow_status != null) {
      sets.push(`escrow_status = $${idx++}`);
      values.push(columns.escrow_status);
    }
    const result = await db.query(
      `UPDATE tasks SET ${sets.join(", ")} WHERE id = $1 RETURNING *`,
      values,
    );
    return mapTask(result.rows[0]);
  }

  async function bookAdvisory(req, res, body, authUser) {
    const channel = normalizeChannel(body.consultationChannel || body.channel || body.mode);
    const amount = Number.isFinite(Number(body.amount))
      ? Number(body.amount)
      : ADVISORY_AMOUNTS[channel];
    const masterFree = await isMasterTestUser(authUser);
    const firstChatFree = channel === "chat" && Boolean(body.firstChatFree);
    const serviceType = body.serviceType || `1-time advisory (${channel})`;
    const bookingBody = {
      ...body,
      serviceType,
      legalIssueType: body.legalIssueType || body.issueType || serviceType,
      amount: masterFree || firstChatFree ? 0 : amount,
      consultationChannel: channel,
      productType: "advisory",
      assignmentPolicy: "legal-connect-managed",
      noDirectHiringDisclaimer: true,
      paymentStatus: masterFree || firstChatFree ? "paid" : "Pending",
      workHoldStatus: masterFree || firstChatFree ? "active" : "pending",
      intakeStatus: masterFree || firstChatFree ? "paid_escrow_hold" : "draft",
      stageStatus: masterFree || firstChatFree ? "paid_escrow_hold" : "draft",
      source: body.source || "master-blueprint-advisory",
      retentionEligible: true,
    };

    if (!db.dbAvailable) {
      const booking = {
        id: `booking-advisory-${Date.now()}`,
        userId: authUser.id,
        status: bookingBody.paymentStatus,
        createdAt: new Date().toISOString(),
        ...bookingBody,
        payload: bookingBody,
      };
      demoStore.bookings.unshift(booking);
      if (masterFree || firstChatFree) {
        await activateBookingAsPaid(booking.id, authUser, {
          masterTestFree: masterFree,
          firstChatFree,
          mode: "advisory",
        });
      }
      sendJson(res, 201, {
        ok: true,
        consultation: {
          ...booking,
          consultationState: consultationStateFromBooking(booking),
        },
        nextStep: masterFree || firstChatFree
          ? {
              action: "open_advisory_room",
              href: "/client",
              message: "Advisory session secured. After the session you can request LC Gateway retention for full court representation.",
            }
          : {
              action: "pay_escrow",
              href: "/client/book",
              amount,
              message: "Complete payment to place the advisory fee in Work Completion Hold.",
            },
        disclaimer:
          "This is a one-time advisory session. You cannot hire this advocate directly in the app. Full court representation requires LC Gateway retention.",
      });
      return;
    }

    const result = await db.query(
      `INSERT INTO bookings (user_id, service_type, amount, payment_status, receipt_no, next_destination, work_hold_status, stage_status, payload)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        authUser.id,
        serviceType,
        bookingBody.amount,
        bookingBody.paymentStatus,
        body.receiptNo || null,
        "/client",
        bookingBody.workHoldStatus,
        bookingBody.stageStatus,
        JSON.stringify({ ...bookingBody, user_id: authUser.id, role: authUser.role }),
      ],
    );
    let saved = mapBooking(result.rows[0]);
    if (masterFree || firstChatFree) {
      await activateBookingAsPaid(saved.id, authUser, {
        masterTestFree: masterFree,
        firstChatFree,
        mode: "advisory",
      });
      saved = (await loadBooking(saved.id)) || saved;
    }

    await writeAuditLog(
      authUser,
      "advisory_booked",
      "booking",
      saved.id,
      "1-time advisory session booked via Master Blueprint API",
      { channel, amount: bookingBody.amount },
    );

    const recipients = [
      ...(await resolveRecipients([authUser.id])),
      ...(await resolveAdminRecipients()),
    ];
    await notify({
      eventType: "advisory_booked",
      title: "1-time advisory session booked",
      message: `${authUser.name || "Client"} booked a ${channel} advisory. LC Gateway retention remains available after the session.`,
      recipients,
      payload: {
        bookingId: saved.id,
        consultationChannel: channel,
        actionType: "CASE_UPDATE",
        targetUrl: "/admin/control",
      },
      sendEmail: true,
      ctaLabel: "Open Ops Command",
      ctaUrl: portalUrl("/admin/control"),
    });

    sendJson(res, 201, {
      ok: true,
      consultation: {
        ...saved,
        consultationState: consultationStateFromBooking(saved),
        consultationChannel: channel,
        productType: "advisory",
      },
      paymentRequired: !(masterFree || firstChatFree),
      amount: bookingBody.amount,
      nextStep: masterFree || firstChatFree
        ? {
            action: "open_advisory_room",
            href: "/client",
            message: "Advisory session secured. Use Request LC Gateway retention when you want full court representation.",
          }
        : {
            action: "create_payment_order",
            href: "/api/payments/create-order",
            bookingId: saved.id,
            amount,
            message: "Create Razorpay order against this bookingId, then verify payment.",
          },
      disclaimer:
        "This is a one-time advisory session. You cannot hire an advocate directly in the app. Full court representation requires LC Gateway retention.",
      stateMachine: CONSULTATION_STATES,
    });
  }

  async function completeAdvisory(req, res, bookingId, authUser) {
    const booking = await loadBooking(bookingId);
    if (!booking) {
      sendJson(res, 404, { ok: false, error: "Advisory booking not found." });
      return;
    }
    const isOwner = String(booking.userId) === String(authUser.id);
    if (!isOwner && !canSeeAll(authUser)) {
      sendJson(res, 403, { ok: false, error: "Not allowed to complete this advisory." });
      return;
    }
    const updated = await patchBookingPayload(
      bookingId,
      {
        advisoryCompletedAt: new Date().toISOString(),
        productType: "advisory",
        retentionEligible: true,
      },
      { stage_status: "advisory_completed" },
    );
    await writeAuditLog(authUser, "advisory_completed", "booking", bookingId, "Advisory marked completed", {});
    sendJson(res, 200, {
      ok: true,
      consultation: {
        ...updated,
        consultationState: "advisory_completed",
      },
      nextStep: {
        action: "request_retention",
        href: "/api/intakes/request-retention",
        message: "Client may now request LC Gateway retention for full court representation.",
      },
    });
  }

  async function requestRetention(req, res, body, authUser) {
    const bookingId = body.bookingId || body.intakeId || body.consultationId;
    if (!bookingId) {
      sendJson(res, 400, { ok: false, error: "bookingId is required." });
      return;
    }
    const booking = await loadBooking(bookingId);
    if (!booking) {
      sendJson(res, 404, { ok: false, error: "Intake/advisory booking not found." });
      return;
    }
    const isOwner = String(booking.userId) === String(authUser.id);
    const isAdvocateSuggesting = String(authUser.role || "").toLowerCase() === "advocate"
      && Boolean(body.advocateSuggestedRetention);
    const isAssignedAdvocate = String(booking.assignedAdvocateId || "") === String(authUser.id);
    if (!isOwner && !canSeeAll(authUser) && !(isAdvocateSuggesting || isAssignedAdvocate)) {
      sendJson(res, 403, { ok: false, error: "Only the client, assigned advocate, or LC admin can request retention." });
      return;
    }

    const now = new Date().toISOString();
    const retention = {
      status: "requested",
      requestedAt: now,
      requestedBy: authUser.id,
      preferredCourts: body.preferredCourts || body.courts || [],
      matterSummary: body.matterSummary || body.summary || booking.problemSummary || booking.particulars || "",
      urgency: body.urgency || booking.urgency || "normal",
      requestedEngagement: "full_representation",
      sourceAdvisoryId: bookingId,
      advocateSuggestedRetention: Boolean(body.advocateSuggestedRetention),
      suggestedByAdvocateId: body.suggestedByAdvocateId || null,
    };

    const updated = await patchBookingPayload(
      bookingId,
      {
        productType: booking.productType || "advisory",
        retention,
        retentionStatus: "requested",
        retentionRequestedAt: now,
        requestedEngagement: "full_representation",
      },
      { stage_status: "lc_under_review" },
    );

    await writeAuditLog(
      authUser,
      "retention_requested",
      "booking",
      bookingId,
      "LC Gateway retention requested for full court representation",
      retention,
    );

    await notify({
      eventType: "retention_requested",
      title: "LC Gateway retention requested",
      message: "Client requested conversion from one-time advisory to full court representation. Review on the Gateway Onboarding desk.",
      recipients: await resolveAdminRecipients(),
      payload: {
        bookingId,
        actionType: "CASE_UPDATE",
        targetUrl: "/admin/control",
        retentionStatus: "requested",
      },
      sendEmail: true,
      ctaLabel: "Open Gateway desk",
      ctaUrl: portalUrl("/admin/control"),
      priority: "high",
    });

    sendJson(res, 200, {
      ok: true,
      intake: {
        ...updated,
        retentionState: "requested",
        consultationState: consultationStateFromBooking(updated),
      },
      stateMachine: RETENTION_STATES,
      message: "Retention request received. Legal Connect will review, quote terms, and assign a panel lawyer.",
      disclaimer:
        "No direct in-app hiring. Panel assignment happens only through Legal Connect Gateway.",
    });
  }

  async function quoteRetentionTerms(req, res, bookingId, body, authUser) {
    if (!canSeeAll(authUser)) {
      sendJson(res, 403, { ok: false, error: "Admin only." });
      return;
    }
    const booking = await loadBooking(bookingId);
    if (!booking) {
      sendJson(res, 404, { ok: false, error: "Booking not found." });
      return;
    }
    const now = new Date().toISOString();
    const retention = {
      ...(booking.retention || booking.payload?.retention || {}),
      status: "terms_quoted",
      termsQuotedAt: now,
      quotedBy: authUser.id,
      quotedAmount: numericAmount(body.quotedAmount || body.amount || 0),
      termsSummary: body.termsSummary || body.summary || "LC Gateway full representation terms",
      engagementTier: "full_representation",
    };
    const updated = await patchBookingPayload(
      bookingId,
      { retention, retentionStatus: "terms_quoted", engagementQuotedAt: now },
      { stage_status: "lc_under_review" },
    );
    await notify({
      eventType: "retention_terms_quoted",
      title: "LC Gateway terms ready",
      message: retention.termsSummary,
      recipients: await resolveRecipients([booking.userId].filter(Boolean)),
      payload: { bookingId, retentionStatus: "terms_quoted", amount: retention.quotedAmount },
      sendEmail: true,
      ctaLabel: "Open engagement",
      ctaUrl: portalUrl("/client/engagement"),
    });
    sendJson(res, 200, { ok: true, intake: { ...updated, retentionState: "terms_quoted" } });
  }

  async function assignPanelLawyer(req, res, bookingId, body, authUser) {
    if (!canSeeAll(authUser)) {
      sendJson(res, 403, { ok: false, error: "Admin only." });
      return;
    }
    const advocateId = body.advocateId || body.assignedAdvocateId || body.panelLawyerId;
    const advocateName = body.advocateName || body.assignedAdvocateName || body.panelLawyerName;
    if (!advocateId) {
      sendJson(res, 400, { ok: false, error: "advocateId is required." });
      return;
    }
    const booking = await loadBooking(bookingId);
    if (!booking) {
      sendJson(res, 404, { ok: false, error: "Booking not found." });
      return;
    }
    const now = new Date().toISOString();
    const retention = {
      ...(booking.retention || booking.payload?.retention || {}),
      status: "panel_lawyer_assigned",
      assignedAt: now,
      assignedBy: authUser.id,
      panelLawyerId: advocateId,
      panelLawyerName: advocateName || null,
    };
    const updated = await patchBookingPayload(
      bookingId,
      {
        retention,
        retentionStatus: "panel_lawyer_assigned",
        assignedAdvocateId: advocateId,
        assignedAdvocateName: advocateName || null,
        productType: "full_representation",
      },
      {
        stage_status: "advocate_assigned",
        assigned_advocate_id: advocateId,
        assigned_advocate_name: advocateName || null,
      },
    );

    // Prefer existing intake assign route semantics via audit + notify
    await writeAuditLog(
      authUser,
      "gateway_panel_assigned",
      "booking",
      bookingId,
      `Panel lawyer assigned via LC Gateway: ${advocateName || advocateId}`,
      { advocateId, advocateName },
    );
    await notify({
      eventType: "retention_panel_assigned",
      title: "Panel lawyer assigned by Legal Connect",
      message: "Your full court representation request has a Bar-verified panel lawyer assigned by LC Gateway.",
      recipients: [
        ...(await resolveRecipients([booking.userId, advocateId].filter(Boolean))),
        ...(await resolveAdminRecipients()),
      ],
      payload: {
        bookingId,
        lawyerId: advocateId,
        lawyerName: advocateName,
        actionType: "LAWYER_ASSIGNED",
        targetUrl: "/client",
      },
      sendEmail: true,
      ctaLabel: "Open matter",
      ctaUrl: portalUrl("/client"),
    });
    sendJson(res, 200, {
      ok: true,
      intake: { ...updated, retentionState: "panel_lawyer_assigned" },
      stateMachine: RETENTION_STATES,
    });
  }

  async function assignProxy(req, res, taskId, body, authUser) {
    if (!canSeeAll(authUser)) {
      sendJson(res, 403, { ok: false, error: "Admin only." });
      return;
    }
    const proxyId = body.proxyAdvocateId || body.advocateId || body.assignedTo || body.proxyId;
    const proxyName = body.proxyAdvocateName || body.advocateName || body.assignedProxyName || body.proxyName;
    if (!proxyId) {
      sendJson(res, 400, { ok: false, error: "proxyAdvocateId is required." });
      return;
    }
    const task = await loadTask(taskId);
    if (!task) {
      sendJson(res, 404, { ok: false, error: "Proxy task not found." });
      return;
    }
    const updated = await patchTaskPayload(
      taskId,
      {
        assignedProxyId: proxyId,
        assignedProxyName: proxyName || null,
        assignedByAdmin: authUser.id,
        assignedAt: new Date().toISOString(),
        workflowStatus: "Accepted",
        blueprintState: "proxy_assigned_by_lc",
      },
      {
        status: "Accepted",
        accepted_by: proxyId,
        escrow_status: task.escrowStatus || "Locked",
      },
    );
    await writeAuditLog(
      authUser,
      "assign_proxy",
      "task",
      taskId,
      `Proxy assigned by LC: ${proxyName || proxyId}`,
      { proxyId, proxyName },
    );
    await notify({
      eventType: "proxy_assigned",
      title: "Proxy mission assigned",
      message: `${proxyName || "Panel proxy"} assigned by Legal Connect for the court mission.`,
      recipients: await resolveRecipients([proxyId, task.postedBy || task.userId].filter(Boolean)),
      payload: { taskId, lawyerId: proxyId, lawyerName: proxyName, actionType: "QUEST_ACTION" },
      sendEmail: true,
      ctaLabel: "Open ProxyHub",
      ctaUrl: portalUrl("/advocate/proxy"),
    });
    sendJson(res, 200, {
      ok: true,
      task: { ...updated, proxyState: "proxy_assigned_by_lc" },
      stateMachine: PROXY_STATES,
    });
  }

  async function proxyQa(req, res, taskId, body, authUser) {
    const task = await loadTask(taskId);
    if (!task) {
      sendJson(res, 404, { ok: false, error: "Proxy task not found." });
      return;
    }
    const message = String(body.message || body.question || body.answer || "").trim();
    if (!message) {
      sendJson(res, 400, { ok: false, error: "message is required." });
      return;
    }
    const entry = {
      id: `qa-${Date.now()}`,
      at: new Date().toISOString(),
      authorId: authUser.id,
      authorRole: authUser.role,
      authorName: authUser.name || authUser.email || authUser.role,
      kind: body.kind || (canSeeAll(authUser) ? "lc_moderation" : "counsel_query"),
      message,
      visibleTo: body.visibleTo || ["admin", "poster", "proxy"],
    };
    const thread = Array.isArray(task.payload?.qaThread) ? task.payload.qaThread : [];
    thread.push(entry);
    const updated = await patchTaskPayload(taskId, {
      qaThread: thread,
      lastQaAt: entry.at,
      adminQuery: canSeeAll(authUser) ? message : task.payload?.adminQuery,
    });
    await writeAuditLog(authUser, "proxy_qa", "task", taskId, "Supervised proxy Q&A message", {
      kind: entry.kind,
    });
    sendJson(res, 200, {
      ok: true,
      taskId,
      qaThread: thread,
      task: { ...updated, proxyState: proxyStateFromTask(updated) },
      moderation: "LC-supervised — no direct unsupervised counsel chat",
    });
  }

  async function getProxyQa(req, res, taskId, authUser) {
    const task = await loadTask(taskId);
    if (!task) {
      sendJson(res, 404, { ok: false, error: "Proxy task not found." });
      return;
    }
    const thread = Array.isArray(task.payload?.qaThread) ? task.payload.qaThread : [];
    sendJson(res, 200, {
      ok: true,
      taskId,
      proxyState: proxyStateFromTask(task),
      qaThread: thread,
    });
  }

  async function seedLegalSources(req, res, body, authUser) {
    if (!canSeeAll(authUser)) {
      sendJson(res, 403, { ok: false, error: "Admin only." });
      return;
    }
    const sources = Array.isArray(body.sources) && body.sources.length
      ? body.sources
      : DEFAULT_SEED_SOURCES;
    if (!db.dbAvailable) {
      sendJson(res, 503, { ok: false, error: "Database required to seed LawBot sources." });
      return;
    }

    const existing = await db.query("SELECT id, title FROM legal_sources");
    const byTitle = new Map(
      (existing.rows || []).map((row) => [String(row.title || "").toLowerCase(), row.id]),
    );
    const results = [];
    for (const source of sources) {
      const title = String(source.title || "").trim();
      if (!title || !source.textContent) {
        results.push({ title, ok: false, error: "title and textContent required" });
        continue;
      }
      let id = byTitle.get(title.toLowerCase());
      if (!id) {
        const inserted = await db.query(
          `INSERT INTO legal_sources
            (source_type, source_name, title, court, act_name, section_no, citation, source_url, published_date, status, text_content, uploaded_by)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'approved',$10,$11)
           RETURNING id`,
          [
            source.sourceType || "bare-act",
            source.sourceName || "Legal Connect Source Library",
            title,
            source.court || null,
            source.actName || null,
            source.sectionNo || null,
            source.citation || null,
            source.sourceUrl || null,
            source.publishedDate || null,
            source.textContent,
            authUser.id,
          ],
        );
        id = inserted.rows[0].id;
        byTitle.set(title.toLowerCase(), id);
      } else {
        await db.query(
          `UPDATE legal_sources
           SET status = 'approved', text_content = $2, updated_at = now()
           WHERE id = $1`,
          [id, source.textContent],
        );
      }

      await db.query("DELETE FROM legal_chunks WHERE source_id = $1", [id]);
      const chunkText = String(source.textContent);
      const chunkSize = 900;
      let chunkCount = 0;
      for (let i = 0, index = 0; i < chunkText.length; i += chunkSize, index += 1) {
        const slice = chunkText.slice(i, i + chunkSize).trim();
        if (!slice) continue;
        await db.query(
          `INSERT INTO legal_chunks (source_id, chunk_index, chunk_ref, chunk_text, embedding)
           VALUES ($1, $2, $3, $4, $5)`,
          [id, index, `${title} #${index + 1}`, slice, JSON.stringify({ todo: "pgvector" })],
        );
        chunkCount += 1;
      }
      results.push({ title, id, ok: true, chunks: chunkCount });
    }

    const counts = await db.query(
      `SELECT
         (SELECT COUNT(*)::int FROM legal_sources WHERE status = 'approved') AS approved_sources_count,
         (SELECT COUNT(*)::int FROM legal_chunks) AS legal_chunks_count`,
    );
    await writeAuditLog(authUser, "lawbot_seed", "legal_sources", "batch", "LawBot knowledge seeded", {
      count: results.length,
    });
    sendJson(res, 200, {
      ok: true,
      seeded: results,
      approved_sources_count: counts.rows[0]?.approved_sources_count || 0,
      legal_chunks_count: counts.rows[0]?.legal_chunks_count || 0,
    });
  }

  async function handleBlueprintRoutes(req, res, url) {
    if (url.pathname === "/api/blueprint/meta" && req.method === "GET") {
      sendJson(res, 200, blueprintMeta());
      return true;
    }

    if (url.pathname === "/api/consultations/book-advisory" && req.method === "POST") {
      const authUser = getAuthUser(req);
      if (!authUser) {
        sendJson(res, 401, { ok: false, error: "Login is required." });
        return true;
      }
      if (String(authUser.role).toLowerCase() !== "client" && !canSeeAll(authUser)) {
        sendJson(res, 403, { ok: false, error: "Client role required to book advisory." });
        return true;
      }
      const body = await readBody(req);
      await bookAdvisory(req, res, body, authUser);
      return true;
    }

    const completeMatch = url.pathname.match(/^\/api\/consultations\/([^/]+)\/complete-advisory$/);
    if (completeMatch && req.method === "POST") {
      const authUser = getAuthUser(req);
      if (!authUser) {
        sendJson(res, 401, { ok: false, error: "Login is required." });
        return true;
      }
      await completeAdvisory(req, res, completeMatch[1], authUser);
      return true;
    }

    if (url.pathname === "/api/intakes/request-retention" && req.method === "POST") {
      const authUser = getAuthUser(req);
      if (!authUser) {
        sendJson(res, 401, { ok: false, error: "Login is required." });
        return true;
      }
      const body = await readBody(req);
      await requestRetention(req, res, body, authUser);
      return true;
    }

    const quoteMatch = url.pathname.match(/^\/api\/admin\/gateway\/retention\/([^/]+)\/quote-terms$/);
    if (quoteMatch && req.method === "POST") {
      const authUser = getAuthUser(req);
      if (!authUser) {
        sendJson(res, 401, { ok: false, error: "Login is required." });
        return true;
      }
      const body = await readBody(req);
      await quoteRetentionTerms(req, res, quoteMatch[1], body, authUser);
      return true;
    }

    const assignPanelMatch = url.pathname.match(/^\/api\/admin\/gateway\/retention\/([^/]+)\/assign-panel$/);
    if (assignPanelMatch && req.method === "POST") {
      const authUser = getAuthUser(req);
      if (!authUser) {
        sendJson(res, 401, { ok: false, error: "Login is required." });
        return true;
      }
      const body = await readBody(req);
      await assignPanelLawyer(req, res, assignPanelMatch[1], body, authUser);
      return true;
    }

    // One-click gateway actions bundle for Admin Control Desk
    const gatewayActionMatch = url.pathname.match(/^\/api\/admin\/gateway\/retention\/([^/]+)\/(start-review|request-info|quote-terms|assign-panel)$/);
    if (gatewayActionMatch && req.method === "POST") {
      const authUser = getAuthUser(req);
      if (!authUser) {
        sendJson(res, 401, { ok: false, error: "Login is required." });
        return true;
      }
      if (!canSeeAll(authUser)) {
        sendJson(res, 403, { ok: false, error: "Admin only." });
        return true;
      }
      const bookingId = gatewayActionMatch[1];
      const action = gatewayActionMatch[2];
      const body = await readBody(req);
      if (action === "quote-terms") {
        await quoteRetentionTerms(req, res, bookingId, body, authUser);
        return true;
      }
      if (action === "assign-panel") {
        await assignPanelLawyer(req, res, bookingId, body, authUser);
        return true;
      }
      if (action === "start-review") {
        const updated = await patchBookingPayload(
          bookingId,
          {
            retention: {
              ...((await loadBooking(bookingId))?.retention || {}),
              status: "lc_under_review",
              reviewStartedAt: new Date().toISOString(),
            },
            retentionStatus: "lc_under_review",
          },
          { stage_status: "lc_under_review" },
        );
        sendJson(res, 200, { ok: true, intake: { ...updated, retentionState: "lc_under_review" }, action });
        return true;
      }
      if (action === "request-info") {
        const note = String(body.note || body.message || "Additional documents required for LC Gateway retention.").trim();
        const updated = await patchBookingPayload(bookingId, {
          retention: {
            ...((await loadBooking(bookingId))?.retention || {}),
            status: "lc_under_review",
            infoRequestedAt: new Date().toISOString(),
            infoRequestNote: note,
          },
          lastLcNote: note,
          missingDocuments: body.missingDocuments || [],
        }, { stage_status: "info_requested" });
        await notify({
          eventType: "retention_info_requested",
          title: "Documents needed for LC Gateway retention",
          message: note,
          recipients: await resolveRecipients([(await loadBooking(bookingId))?.userId].filter(Boolean)),
          payload: { bookingId, actionType: "DOCUMENT_REQUIRED", targetUrl: "/client" },
          sendEmail: true,
          ctaLabel: "Upload documents",
          ctaUrl: portalUrl("/client"),
        });
        sendJson(res, 200, { ok: true, intake: updated, action });
        return true;
      }
    }

    const assignProxyMatch = url.pathname.match(/^\/api\/admin\/proxy-tasks\/([^/]+)\/assign-proxy$/);
    if (assignProxyMatch && req.method === "POST") {
      const authUser = getAuthUser(req);
      if (!authUser) {
        sendJson(res, 401, { ok: false, error: "Login is required." });
        return true;
      }
      const body = await readBody(req);
      await assignProxy(req, res, assignProxyMatch[1], body, authUser);
      return true;
    }

    const qaMatch = url.pathname.match(/^\/api\/proxy-tasks\/([^/]+)\/qa$/);
    if (qaMatch && req.method === "POST") {
      const authUser = getAuthUser(req);
      if (!authUser) {
        sendJson(res, 401, { ok: false, error: "Login is required." });
        return true;
      }
      const body = await readBody(req);
      await proxyQa(req, res, qaMatch[1], body, authUser);
      return true;
    }
    if (qaMatch && req.method === "GET") {
      const authUser = getAuthUser(req);
      if (!authUser) {
        sendJson(res, 401, { ok: false, error: "Login is required." });
        return true;
      }
      await getProxyQa(req, res, qaMatch[1], authUser);
      return true;
    }

    if (url.pathname === "/api/admin/legal-sources/seed" && req.method === "POST") {
      const authUser = getAuthUser(req);
      if (!authUser) {
        sendJson(res, 401, { ok: false, error: "Login is required." });
        return true;
      }
      const body = await readBody(req);
      await seedLegalSources(req, res, body, authUser);
      return true;
    }

    return false;
  }

  return {
    handleBlueprintRoutes,
    blueprintMeta,
    consultationStateFromBooking,
    retentionStateFromBooking,
    proxyStateFromTask,
    CONSULTATION_STATES,
    RETENTION_STATES,
    PROXY_STATES,
  };
}

module.exports = {
  createMasterBlueprint,
  blueprintMeta,
  consultationStateFromBooking,
  retentionStateFromBooking,
  proxyStateFromTask,
  CONSULTATION_STATES,
  RETENTION_STATES,
  PROXY_STATES,
  ADVISORY_AMOUNTS,
};
