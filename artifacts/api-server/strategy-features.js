/**
 * Product strategy feature pack:
 * ProxyHub 5-layer proof gate, Transparency Ledger, Case Health Score,
 * Cloudinary docs, Grievance Redressal, Terms of Engagement, NDOH reminders,
 * Bar Council Rule 36 guard, ProxyHub bi-directional ratings.
 */
const crypto = require("crypto");
const { createSupervisedPipeline } = require("./supervised-pipeline");

const RULE36_PATTERNS = [
  /\bguarantee(?:d)?\s+(?:win|success|acquittal)\b/i,
  /\b100%\s+(?:win|success|results?)\b/i,
  /\blowest\s+fee\b/i,
  /\bcheap(?:est)?\s+(?:lawyer|advocate)\b/i,
  /\bsolicit(?:ing|ation)?\b/i,
  /\btout(?:ing)?\b/i,
  /\bfixed\s+outcome\b/i,
  /\bno\s+win\s+no\s+fee\b/i,
];

function computeProxySettlement(grossAmount) {
  const gross = Math.max(0, Math.round(Number(grossAmount) || 0));
  const platformFee = Math.round(gross * 0.1);
  const appTaxGst = Math.round(gross * 0.03);
  const netToProxy = Math.max(0, gross - platformFee - appTaxGst);
  return {
    currency: "INR",
    gross,
    platformFee,
    platformFeePct: 10,
    appTaxGst,
    appTaxGstPct: 3,
    netToProxy,
    advocatePct: 87,
    note: "Platform fee 10% + app/GST tax 3%. Net payable to proxy counsel after LC Admin release (manual settlement).",
  };
}

/** ProxyHub posting time → escrow fee → SLA after LC assigns. */
const PROXY_URGENCY_TIERS = {
  urgent: {
    id: "urgent",
    label: "Urgent",
    fee: 1299,
    postingHint: "Need appearance soon (e.g. adjournment in ~15 minutes)",
    slaAfterAssign: "Proxy must complete within 1 hour after LC assigns",
    slaShort: "1 hour after assign",
  },
  priority: {
    id: "priority",
    label: "Priority · same day",
    fee: 799,
    postingHint: "Same business-day appearance",
    slaAfterAssign: "Proxy must complete within the same business day after LC assigns",
    slaShort: "Same business day",
  },
  standard: {
    id: "standard",
    label: "Standard · business hours",
    fee: 499,
    postingHint: "Next business day / normal court hours",
    slaAfterAssign: "Proxy must complete next business day during court hours",
    slaShort: "Next business day",
  },
};

function resolveProxyUrgency(value) {
  const raw = String(value || "").toLowerCase().trim();
  if (raw === "urgent" || raw === "high" || raw === "asap") return "urgent";
  if (raw === "priority" || raw === "same_day" || raw === "same-day") return "priority";
  return "standard";
}

function proxyUrgencyMeta(value) {
  return PROXY_URGENCY_TIERS[resolveProxyUrgency(value)];
}

function createStrategyFeatures(deps) {
  const {
    db,
    config,
    notify,
    resolveRecipients,
    resolveAdminRecipients,
    portalUrl,
    sendJson,
    readBody,
    readRawBody,
    getAuthUser,
    canSeeAll,
    mapTask,
    mapCase,
    writeAuditLog,
    createReceipt,
    escapeHtml,
    sendEmail,
    demoStore,
    isUuid,
    safeAttachmentName,
    dispatchSms,
  } = deps;

  const supervised = createSupervisedPipeline({ db });
  let schemaReady = false;

  function assertRule36Safe(text) {
    const value = String(text || "").trim();
    if (!value) return { ok: true, text: value };
    for (const pattern of RULE36_PATTERNS) {
      if (pattern.test(value)) {
        return {
          ok: false,
          error: "Bar Council Rule 36: this wording looks like solicitation or guaranteed-outcome advertising and cannot be saved.",
          matched: pattern.source,
        };
      }
    }
    return { ok: true, text: value };
  }

  function validateProxyPostingFields(body = {}) {
    const cnr = String(body.cnr || body.cnrNumber || "").trim().toUpperCase();
    const roomNo = String(body.roomNo || body.room || "").trim();
    const passoverScript = String(body.passoverScript || body.passoverInstructions || body.taskDescription || "").trim();
    const appearanceType = String(body.appearanceType || body.taskType || "").trim();
    const hearingDate = String(body.hearingDate || body.date || "").trim();
    const urgency = resolveProxyUrgency(body.urgency || body.timingTier || body.timing || "standard");
    const urgencyMeta = proxyUrgencyMeta(urgency);
    const missing = [];
    if (!cnr || cnr.length < 8) missing.push("CNR number");
    if (!roomNo) missing.push("room number");
    if (!passoverScript || passoverScript.length < 12) missing.push("passover script");
    if (!appearanceType) missing.push("appearance type");
    if (!hearingDate) missing.push("hearing date");
    if (missing.length) {
      return { ok: false, error: `ProxyHub Layer 1 requires: ${missing.join(", ")}.` };
    }
    const rule36 = assertRule36Safe(passoverScript);
    if (!rule36.ok) return rule36;
    return {
      ok: true,
      fields: {
        cnr,
        roomNo,
        itemNo: String(body.itemNo || body.item_no || "").trim() || null,
        passoverScript,
        appearanceType,
        hearingDate,
        urgency,
        timingTier: urgency,
        slaAfterAssign: urgencyMeta.slaAfterAssign,
        catalogFee: urgencyMeta.fee,
        urgencyLabel: urgencyMeta.label,
      },
    };
  }

  function computeCaseHealthScore(matter = {}, extras = {}) {
    let score = 72;
    const factors = [];
    const nextDate = matter.nextDate || matter.next_date || null;
    if (nextDate) {
      const days = Math.ceil((new Date(nextDate).getTime() - Date.now()) / 86400000);
      if (Number.isFinite(days)) {
        if (days < 0) {
          score -= 28;
          factors.push({ code: "overdue_hearing", impact: -28, label: "Hearing date has passed without update" });
        } else if (days <= 2) {
          score -= 10;
          factors.push({ code: "imminent_hearing", impact: -10, label: "Hearing within 48 hours" });
        } else if (days <= 7) {
          score -= 4;
          factors.push({ code: "near_hearing", impact: -4, label: "Hearing within a week" });
        } else {
          score += 6;
          factors.push({ code: "dated_matter", impact: 6, label: "Next date is scheduled" });
        }
      }
    } else {
      score -= 18;
      factors.push({ code: "missing_ndoh", impact: -18, label: "No next date of hearing" });
    }
    if (matter.appearanceRequired) {
      score -= 8;
      factors.push({ code: "appearance_required", impact: -8, label: "Personal appearance flagged" });
    }
    const dueFees = (extras.fees || matter.fees || []).filter((fee) => String(fee.status || "").toLowerCase() === "due");
    if (dueFees.length) {
      const hit = Math.min(20, dueFees.length * 8);
      score -= hit;
      factors.push({ code: "fees_due", impact: -hit, label: `${dueFees.length} fee item(s) due` });
    }
    const docs = extras.documents || matter.documents || [];
    if (!docs.length) {
      score -= 8;
      factors.push({ code: "no_documents", impact: -8, label: "No documents on file" });
    } else {
      score += 5;
      factors.push({ code: "documents_present", impact: 5, label: "Documents uploaded" });
    }
    const updates = extras.communications || matter.communications || [];
    if (!updates.length) {
      score -= 6;
      factors.push({ code: "silent_matter", impact: -6, label: "No recent case communications" });
    }
    if (String(matter.status || "").toLowerCase() === "closed" || String(matter.stage || "").toLowerCase() === "disposed") {
      score = Math.max(score, 88);
      factors.push({ code: "closed", impact: 0, label: "Matter closed / disposed" });
    }
    score = Math.max(0, Math.min(100, Math.round(score)));
    let band = "Needs attention";
    if (score >= 80) band = "Healthy";
    else if (score >= 60) band = "Watch";
    else if (score >= 40) band = "At risk";
    else band = "Critical";
    return { score, band, factors, scoredAt: new Date().toISOString() };
  }

  async function ensureStrategySchema() {
    if (!db.dbAvailable || schemaReady) return;
    await db.query(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS proof_hash text`);
    await db.query(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS proof_status text DEFAULT 'none'`);
    await db.query(`ALTER TABLE cases ADD COLUMN IF NOT EXISTS health_score integer`);
    await db.query(`ALTER TABLE cases ADD COLUMN IF NOT EXISTS health_scored_at timestamptz`);
    await db.query(`ALTER TABLE case_documents ADD COLUMN IF NOT EXISTS public_url text`);
    await db.query(`ALTER TABLE case_documents ADD COLUMN IF NOT EXISTS provider text DEFAULT 'local'`);
    await db.query(`ALTER TABLE case_documents ADD COLUMN IF NOT EXISTS checksum text`);
    await db.query(`
      CREATE TABLE IF NOT EXISTS grievances (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id text,
        against_user_id text,
        target_type text,
        target_id text,
        category text,
        description text,
        status text DEFAULT 'open',
        sla_due_at timestamptz,
        resolution text,
        payload jsonb DEFAULT '{}'::jsonb,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      )
    `);
    await db.query(`CREATE INDEX IF NOT EXISTS grievances_status_idx ON grievances (status, created_at DESC)`);
    await db.query(`
      CREATE TABLE IF NOT EXISTS engagement_agreements (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        case_id text,
        booking_id text,
        client_user_id text,
        advocate_user_id text,
        html_body text,
        content_hash text,
        client_signed_at timestamptz,
        advocate_signed_at timestamptz,
        client_signature text,
        advocate_signature text,
        status text DEFAULT 'draft',
        pdf_url text,
        payload jsonb DEFAULT '{}'::jsonb,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      )
    `);
    await db.query(`
      CREATE TABLE IF NOT EXISTS reminder_jobs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        case_id text,
        user_id text,
        channel text,
        template_key text,
        fire_at timestamptz,
        status text DEFAULT 'pending',
        last_error text,
        payload jsonb DEFAULT '{}'::jsonb,
        created_at timestamptz DEFAULT now(),
        sent_at timestamptz
      )
    `);
    await db.query(`CREATE UNIQUE INDEX IF NOT EXISTS reminder_jobs_unique_idx ON reminder_jobs (case_id, template_key) WHERE status <> 'cancelled'`);
    await db.query(`
      CREATE TABLE IF NOT EXISTS task_ratings (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        task_id text NOT NULL,
        rater_id text NOT NULL,
        ratee_id text,
        rater_role text,
        stars integer NOT NULL,
        comment text,
        created_at timestamptz DEFAULT now(),
        UNIQUE (task_id, rater_id)
      )
    `);
    await db.query(`CREATE INDEX IF NOT EXISTS task_ratings_task_idx ON task_ratings (task_id)`);
    await db.query(`ALTER TABLE case_updates ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending_lc_review'`);
    await db.query(`ALTER TABLE case_updates ADD COLUMN IF NOT EXISTS author_id text`);
    await db.query(`ALTER TABLE case_updates ADD COLUMN IF NOT EXISTS author_role text`);
    await db.query(`ALTER TABLE case_updates ADD COLUMN IF NOT EXISTS reviewed_by text`);
    await db.query(`ALTER TABLE case_updates ADD COLUMN IF NOT EXISTS reviewed_at timestamptz`);
    await db.query(`ALTER TABLE case_updates ADD COLUMN IF NOT EXISTS return_reason text`);
    await db.query(`UPDATE case_updates SET status = 'pending_lc_review' WHERE status IS NULL OR status = 'visible'`);
    await db.query(`CREATE INDEX IF NOT EXISTS case_updates_status_idx ON case_updates (status, created_at DESC)`);
    await db.query(`
      CREATE TABLE IF NOT EXISTS case_update_replies (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        update_id uuid NOT NULL,
        case_id uuid,
        author_id text,
        author_role text,
        message text NOT NULL,
        status text DEFAULT 'pending_lc_review',
        reviewed_by text,
        reviewed_at timestamptz,
        return_reason text,
        payload jsonb DEFAULT '{}'::jsonb,
        created_at timestamptz DEFAULT now()
      )
    `);
    await db.query(`CREATE INDEX IF NOT EXISTS case_update_replies_status_idx ON case_update_replies (status, created_at DESC)`);
    await db.query(`CREATE INDEX IF NOT EXISTS case_update_replies_update_idx ON case_update_replies (update_id, created_at DESC)`);
    schemaReady = true;
  }

  function mergeTaskPayload(task, patch) {
    const current = task.payload && typeof task.payload === "object" ? task.payload : {};
    return { ...current, ...patch };
  }

  async function loadTask(taskId) {
    if (db.dbAvailable) {
      const result = await db.query("SELECT * FROM tasks WHERE id = $1 LIMIT 1", [taskId]);
      return result.rows[0] ? mapTask(result.rows[0]) : null;
    }
    const row = (demoStore.tasks || []).find((item) => String(item.id) === String(taskId));
    return row ? mapTask(row) : null;
  }

  async function saveTaskPatch(taskId, { status, escrowStatus, proofUrl, proofHash, proofStatus, payloadPatch }) {
    if (db.dbAvailable) {
      const existing = await db.query("SELECT * FROM tasks WHERE id = $1 LIMIT 1", [taskId]);
      if (!existing.rows[0]) return null;
      const nextPayload = mergeTaskPayload(existing.rows[0], payloadPatch || {});
      const result = await db.query(
        `UPDATE tasks
         SET status = COALESCE($2, status),
             escrow_status = COALESCE($3, escrow_status),
             proof_url = COALESCE($4, proof_url),
             proof_hash = COALESCE($5, proof_hash),
             proof_status = COALESCE($6, proof_status),
             payload = COALESCE(payload, '{}'::jsonb) || $7::jsonb,
             updated_at = now()
         WHERE id = $1
         RETURNING *`,
        [
          taskId,
          status || null,
          escrowStatus || null,
          proofUrl || null,
          proofHash || null,
          proofStatus || null,
          JSON.stringify(nextPayload),
        ],
      );
      return mapTask(result.rows[0]);
    }
    const task = (demoStore.tasks || []).find((item) => String(item.id) === String(taskId));
    if (!task) return null;
    Object.assign(task, {
      ...(status ? { status } : {}),
      ...(escrowStatus ? { escrowStatus } : {}),
      ...(proofUrl ? { proofUrl } : {}),
      ...(proofHash ? { proofHash } : {}),
      ...(proofStatus ? { proofStatus } : {}),
      ...(payloadPatch || {}),
      updatedAt: new Date().toISOString(),
    });
    return mapTask(task);
  }

  async function notifyTaskLayer(task, { eventType, title, message, priority = "normal", sendSms = false, includeAdmins = false }) {
    const ids = [task.postedBy, task.acceptedBy, task.clientUserId, task.client_user_id].filter(Boolean);
    let recipients = await resolveRecipients(ids);
    if (includeAdmins) {
      recipients = [...recipients, ...(await resolveAdminRecipients())];
    }
    await notify({
      eventType,
      title,
      message,
      recipients,
      payload: { taskId: task.id, layer: eventType, status: task.status, proofStatus: task.proofStatus || task.proof_status },
      sendEmail: true,
      sendSms,
      ctaLabel: "Open ProxyHub",
      ctaUrl: portalUrl("/advocate/proxy"),
      priority,
    });
  }

  async function uploadToCloudinary({ buffer, fileName, mimeType, folder = "legal-connect" }) {
    if (!config.cloudinaryCloudName || !config.cloudinaryApiKey || !config.cloudinaryApiSecret) {
      return { ok: false, reason: "Cloudinary not configured" };
    }
    const timestamp = Math.floor(Date.now() / 1000);
    const publicId = `${folder}/${Date.now()}-${safeAttachmentName(fileName).replace(/\.[^.]+$/, "")}`;
    const toSign = `folder=${folder}&public_id=${publicId}&timestamp=${timestamp}${config.cloudinaryApiSecret}`;
    const signature = crypto.createHash("sha1").update(toSign).digest("hex");
    const form = new FormData();
    form.append("file", new Blob([buffer], { type: mimeType || "application/octet-stream" }), fileName);
    form.append("api_key", config.cloudinaryApiKey);
    form.append("timestamp", String(timestamp));
    form.append("folder", folder);
    form.append("public_id", publicId);
    form.append("signature", signature);
    const response = await fetch(`https://api.cloudinary.com/v1_1/${config.cloudinaryCloudName}/auto/upload`, {
      method: "POST",
      body: form,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return { ok: false, reason: data.error?.message || `Cloudinary ${response.status}` };
    }
    return {
      ok: true,
      url: data.secure_url || data.url,
      publicId: data.public_id,
      bytes: data.bytes,
      etag: data.etag,
    };
  }

  async function dispatchWhatsApp({ to, body }) {
    if (!config.twilioAccountSid || !config.twilioAuthToken || !config.twilioWhatsappFrom) {
      // Fall back to SMS channel when WhatsApp sender is absent.
      if (dispatchSms) {
        return dispatchSms({ to, body: `[WhatsApp fallback] ${body}` });
      }
      return { ok: false, reason: "Twilio WhatsApp not configured" };
    }
    if (!to) return { ok: false, reason: "missing-phone" };
    try {
      const url = `https://api.twilio.com/2010-04-01/Accounts/${config.twilioAccountSid}/Messages.json`;
      const encoded = Buffer.from(`${config.twilioAccountSid}:${config.twilioAuthToken}`).toString("base64");
      const params = new URLSearchParams({
        To: String(to).startsWith("whatsapp:") ? String(to) : `whatsapp:${to}`,
        From: String(config.twilioWhatsappFrom).startsWith("whatsapp:")
          ? String(config.twilioWhatsappFrom)
          : `whatsapp:${config.twilioWhatsappFrom}`,
        Body: String(body || "").slice(0, 1500),
      });
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Basic ${encoded}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) return { ok: false, reason: data.message || `Twilio ${response.status}` };
      return { ok: true, sid: data.sid || null };
    } catch (error) {
      return { ok: false, reason: error?.message || "whatsapp-failed" };
    }
  }

  function engagementHtml({ clientName, advocateName, caseTitle, courtName }) {
    return `<!doctype html><html><body style="font-family:Georgia,serif;color:#172133;padding:32px">
      <h1 style="color:#0b1f3a">Terms of Engagement</h1>
      <p>This agreement records the engagement between <strong>${escapeHtml(clientName || "Client")}</strong> and <strong>${escapeHtml(advocateName || "Counsel")}</strong> for the matter <strong>${escapeHtml(caseTitle || "Legal matter")}</strong>${courtName ? ` before ${escapeHtml(courtName)}` : ""}.</p>
      <ol>
        <li>Counsel will act with professional diligence and confidentiality.</li>
        <li>Fees, expenses and escrow releases follow Legal Connect receipts.</li>
        <li>Neither party may solicit guaranteed outcomes (Bar Council Rule 36).</li>
        <li>Both parties must digitally acknowledge before the first paid session.</li>
        <li>Grievances may be raised through Legal Connect Grievance Redressal.</li>
      </ol>
      <p style="margin-top:28px;color:#6b7280;font-size:12px">Hash-backed acknowledgement · Legal Connect</p>
    </body></html>`;
  }

  async function getTransparencyStats() {
    if (db.dbAvailable) {
      const [tasks, advocates, bookings, proofs, grievancesOpen] = await Promise.all([
        db.query(`SELECT
          count(*)::int AS total,
          count(*) FILTER (WHERE lower(coalesce(status,'')) IN ('completed','closed','payment released'))::int AS completed,
          count(*) FILTER (WHERE lower(coalesce(escrow_status,'')) IN ('locked','held'))::int AS escrow_held,
          count(*) FILTER (WHERE coalesce(proof_status,'') IN ('submitted','approved'))::int AS proofs
          FROM tasks`),
        db.query(`SELECT count(*)::int AS count FROM users WHERE lower(coalesce(role,'')) = 'advocate'`),
        db.query(`SELECT count(*)::int AS paid FROM bookings WHERE lower(coalesce(payment_status,'')) IN ('paid','captured')`),
        db.query(`SELECT count(*)::int AS count FROM tasks WHERE proof_hash IS NOT NULL`),
        db.query(`SELECT count(*)::int AS count FROM grievances WHERE lower(coalesce(status,'')) IN ('open','in_review')`).catch(() => ({ rows: [{ count: 0 }] })),
      ]);
      return {
        generatedAt: new Date().toISOString(),
        missionsPosted: tasks.rows[0]?.total || 0,
        missionsCompleted: tasks.rows[0]?.completed || 0,
        escrowHeldMissions: tasks.rows[0]?.escrow_held || 0,
        proofsSubmitted: proofs.rows[0]?.count || tasks.rows[0]?.proofs || 0,
        verifiedAdvocates: advocates.rows[0]?.count || 0,
        paidBookings: bookings.rows[0]?.paid || 0,
        openGrievances: grievancesOpen.rows[0]?.count || 0,
        feeSplit: { advocatePct: 87, platformPct: 10, gatewayGstPct: 3 },
      };
    }
    return {
      generatedAt: new Date().toISOString(),
      missionsPosted: (demoStore.tasks || []).length,
      missionsCompleted: (demoStore.tasks || []).filter((t) => /completed|closed|released/i.test(String(t.status || ""))).length,
      escrowHeldMissions: (demoStore.tasks || []).filter((t) => /lock|held/i.test(String(t.escrowStatus || t.escrow_status || ""))).length,
      proofsSubmitted: (demoStore.tasks || []).filter((t) => t.proofHash || t.proofUrl).length,
      verifiedAdvocates: (demoStore.users || []).filter((u) => u.role === "advocate").length,
      paidBookings: (demoStore.bookings || []).filter((b) => /paid|captured/i.test(String(b.paymentStatus || b.payment_status || ""))).length,
      openGrievances: (demoStore.grievances || []).filter((g) => g.status === "open").length,
      feeSplit: { advocatePct: 87, platformPct: 10, gatewayGstPct: 3 },
      mode: "sample",
    };
  }

  async function scheduleNdohRemindersForCase(matter, userId) {
    const nextDate = matter.nextDate || matter.next_date;
    if (!nextDate || !userId) return [];
    const hearing = new Date(nextDate);
    if (Number.isNaN(hearing.getTime())) return [];
    const templates = [
      { key: "ndoh_d7", offsetDays: -7, hour: 10 },
      { key: "ndoh_d3", offsetDays: -3, hour: 10 },
      { key: "ndoh_d1", offsetDays: -1, hour: 10 },
      { key: "ndoh_morning", offsetDays: 0, hour: 7 },
    ];
    const created = [];
    for (const template of templates) {
      const fireAt = new Date(hearing);
      fireAt.setDate(fireAt.getDate() + template.offsetDays);
      fireAt.setHours(template.hour, 0, 0, 0);
      if (fireAt.getTime() < Date.now() - 3600000) continue;
      if (db.dbAvailable) {
        const result = await db.query(
          `INSERT INTO reminder_jobs (case_id, user_id, channel, template_key, fire_at, status, payload)
           VALUES ($1, $2, 'whatsapp', $3, $4, 'pending', $5)
           ON CONFLICT DO NOTHING
           RETURNING *`,
          [matter.id, userId, template.key, fireAt.toISOString(), JSON.stringify({ nextDate, title: matter.title || matter.caseTitle })],
        ).catch(async () => db.query(
          `INSERT INTO reminder_jobs (case_id, user_id, channel, template_key, fire_at, status, payload)
           SELECT $1, $2, 'whatsapp', $3, $4, 'pending', $5
           WHERE NOT EXISTS (
             SELECT 1 FROM reminder_jobs WHERE case_id = $1 AND template_key = $3 AND status <> 'cancelled'
           ) RETURNING *`,
          [matter.id, userId, template.key, fireAt.toISOString(), JSON.stringify({ nextDate, title: matter.title || matter.caseTitle })],
        ));
        if (result.rows[0]) created.push(result.rows[0]);
      } else {
        demoStore.reminderJobs = demoStore.reminderJobs || [];
        if (!demoStore.reminderJobs.some((job) => job.caseId === matter.id && job.templateKey === template.key)) {
          const job = {
            id: `reminder-${Date.now()}-${template.key}`,
            caseId: matter.id,
            userId,
            channel: "whatsapp",
            templateKey: template.key,
            fireAt: fireAt.toISOString(),
            status: "pending",
          };
          demoStore.reminderJobs.push(job);
          created.push(job);
        }
      }
    }
    return created;
  }

  async function processDueReminders({ limit = 40 } = {}) {
    const sent = [];
    if (db.dbAvailable) {
      const due = await db.query(
        `SELECT * FROM reminder_jobs
         WHERE status = 'pending' AND fire_at <= now()
         ORDER BY fire_at ASC LIMIT $1`,
        [limit],
      );
      for (const job of due.rows) {
        const users = await resolveRecipients([job.user_id]);
        const user = users[0];
        const title = job.payload?.title || "Court hearing reminder";
        const message = `NDOH reminder (${job.template_key}): ${title} is listed on ${job.payload?.nextDate || "the scheduled date"}.`;
        if (user) {
          await notify({
            eventType: "ndoh_reminder",
            title: "Hearing reminder",
            message,
            recipients: [user],
            payload: { reminderId: job.id, templateKey: job.template_key, caseId: job.case_id },
            sendEmail: true,
            sendSms: false,
            ctaLabel: "Open case",
            ctaUrl: portalUrl("/client"),
            priority: "high",
          });
          if (user.phone) await dispatchWhatsApp({ to: user.phone, body: message });
        }
        await db.query("UPDATE reminder_jobs SET status = 'sent', sent_at = now() WHERE id = $1", [job.id]);
        sent.push(job.id);
      }
      return sent;
    }
    demoStore.reminderJobs = demoStore.reminderJobs || [];
    for (const job of demoStore.reminderJobs.filter((item) => item.status === "pending" && new Date(item.fireAt).getTime() <= Date.now()).slice(0, limit)) {
      job.status = "sent";
      job.sentAt = new Date().toISOString();
      sent.push(job.id);
    }
    return sent;
  }

  async function scanMissingProxyAppearances() {
    const alerts = [];
    const today = new Date().toISOString().slice(0, 10);
    const candidates = db.dbAvailable
      ? (await db.query("SELECT * FROM tasks WHERE lower(coalesce(status,'')) IN ('assigned','checked_in','open') ORDER BY updated_at DESC LIMIT 100")).rows.map(mapTask)
      : (demoStore.tasks || []).map(mapTask);
    for (const task of candidates) {
      const hearingDate = String(task.hearingDate || task.hearing_date || "").slice(0, 10);
      const checkedIn = Boolean(task.checkedInAt || task.checked_in_at || task.payload?.checkedInAt);
      const proofStatus = task.proofStatus || task.proof_status || "none";
      if (hearingDate && hearingDate <= today && !checkedIn && proofStatus === "none" && !task.noAppearanceAlerted) {
        await saveTaskPatch(task.id, {
          payloadPatch: { noAppearanceAlerted: true, noAppearanceAt: new Date().toISOString() },
          status: task.status,
        });
        const refreshed = { ...task, noAppearanceAlerted: true };
        await notifyTaskLayer(refreshed, {
          eventType: "proxy_no_appearance",
          title: "⚠️ No appearance recorded today",
          message: `${task.title || "Proxy mission"} had a hearing on ${hearingDate}, but no check-in or proof was recorded.`,
          priority: "urgent",
          sendSms: true,
          includeAdmins: true,
        });
        alerts.push(task.id);
      }
    }
    return alerts;
  }

  async function handleStrategyRoutes(req, res, url) {
    await ensureStrategySchema().catch(() => undefined);

    if (url.pathname === "/api/public/transparency" && req.method === "GET") {
      sendJson(res, 200, { ok: true, ledger: await getTransparencyStats() });
      return true;
    }

    if (url.pathname === "/api/compliance/rule36" && req.method === "POST") {
      const body = await readBody(req);
      const result = assertRule36Safe(body.text || body.copy || body.message || "");
      sendJson(res, result.ok ? 200 : 422, { ok: result.ok, ...result });
      return true;
    }

    if (url.pathname === "/api/cases/health/recompute" && req.method === "POST") {
      const authUser = getAuthUser(req);
      if (!authUser || !canSeeAll(authUser)) {
        sendJson(res, 403, { ok: false, error: "Admin access required." });
        return true;
      }
      if (!db.dbAvailable) {
        sendJson(res, 200, { ok: true, updated: 0, mode: "demo" });
        return true;
      }
      const cases = await db.query("SELECT * FROM cases ORDER BY updated_at DESC LIMIT 500");
      let updated = 0;
      for (const row of cases.rows) {
        const matter = mapCase(row);
        const health = computeCaseHealthScore(matter, {});
        await db.query(
          `UPDATE cases SET health_score = $2, health_scored_at = now(),
           payload = COALESCE(payload, '{}'::jsonb) || $3::jsonb, updated_at = now()
           WHERE id = $1`,
          [row.id, health.score, JSON.stringify({ healthScore: health })],
        );
        updated += 1;
      }
      sendJson(res, 200, { ok: true, updated });
      return true;
    }

    const caseHealthMatch = url.pathname.match(/^\/api\/cases\/([^/]+)\/health$/);
    if (caseHealthMatch && req.method === "GET") {
      const authUser = getAuthUser(req);
      if (!authUser) {
        sendJson(res, 401, { ok: false, error: "Login is required." });
        return true;
      }
      const caseId = caseHealthMatch[1];
      let matter = null;
      if (db.dbAvailable && isUuid(caseId)) {
        const result = await db.query("SELECT * FROM cases WHERE id = $1 LIMIT 1", [caseId]);
        if (!result.rows[0]) {
          sendJson(res, 404, { ok: false, error: "Case not found." });
          return true;
        }
        matter = mapCase(result.rows[0]);
      } else {
        matter = (demoStore.cases || []).find((item) => String(item.id) === String(caseId)) || null;
        if (matter) matter = mapCase(matter);
      }
      if (!matter) {
        sendJson(res, 404, { ok: false, error: "Case not found." });
        return true;
      }
      const health = computeCaseHealthScore(matter, { fees: matter.fees || [], documents: matter.documents || [], communications: matter.communications || [] });
      if (db.dbAvailable && isUuid(caseId)) {
        await db.query(
          `UPDATE cases SET health_score = $2, health_scored_at = now(),
           payload = COALESCE(payload, '{}'::jsonb) || $3::jsonb WHERE id = $1`,
          [caseId, health.score, JSON.stringify({ healthScore: health })],
        );
      }
      sendJson(res, 200, { ok: true, caseId, health });
      return true;
    }

    const caseDocsMatch = url.pathname.match(/^\/api\/cases\/([^/]+)\/documents$/);
    if (caseDocsMatch && req.method === "POST") {
      const authUser = getAuthUser(req);
      if (!authUser) {
        sendJson(res, 401, { ok: false, error: "Login is required." });
        return true;
      }
      const caseId = caseDocsMatch[1];
      const fileName = safeAttachmentName(req.headers["x-file-name"] || "document.pdf");
      const mimeType = String(req.headers["content-type"] || "application/octet-stream").split(";")[0];
      const raw = await readRawBody(req, 8 * 1024 * 1024);
      if (!raw?.length) {
        sendJson(res, 400, { ok: false, error: "Empty upload." });
        return true;
      }
      const checksum = crypto.createHash("sha256").update(raw).digest("hex");
      const cloud = await uploadToCloudinary({ buffer: raw, fileName, mimeType, folder: "legal-connect/case-docs" });
      const storageKey = cloud.ok ? `cloudinary:${cloud.publicId}` : `inline:${checksum.slice(0, 16)}`;
      const publicUrl = cloud.ok ? cloud.url : null;
      if (db.dbAvailable && isUuid(caseId)) {
        const created = await db.query(
          `INSERT INTO case_documents (case_id, uploaded_by, file_name, category, storage_key, mime_type, size_bytes, checksum, public_url, provider)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
          [
            caseId,
            isUuid(authUser.id) ? authUser.id : null,
            fileName,
            req.headers["x-doc-category"] || "Case document",
            storageKey,
            mimeType,
            raw.length,
            checksum,
            publicUrl,
            cloud.ok ? "cloudinary" : "local",
          ],
        ).catch(async () => db.query(
          `INSERT INTO case_documents (case_id, uploaded_by, file_name, category, storage_key, mime_type, size_bytes, checksum)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
          [
            caseId,
            isUuid(authUser.id) ? authUser.id : null,
            fileName,
            req.headers["x-doc-category"] || "Case document",
            storageKey,
            mimeType,
            raw.length,
            checksum,
          ],
        ));
        sendJson(res, 201, {
          ok: true,
          document: {
            id: created.rows[0].id,
            name: fileName,
            url: publicUrl,
            provider: cloud.ok ? "cloudinary" : "local",
            checksum,
            downloadPath: publicUrl || `/api/cases/${caseId}/documents/${created.rows[0].id}`,
          },
          cloudinaryConfigured: Boolean(config.cloudinaryCloudName && config.cloudinaryApiKey && config.cloudinaryApiSecret),
        });
        return true;
      }
      sendJson(res, 201, {
        ok: true,
        document: {
          id: `doc-${Date.now()}`,
          name: fileName,
          url: publicUrl,
          provider: cloud.ok ? "cloudinary" : "local",
          checksum,
        },
        mode: "demo",
      });
      return true;
    }

    if (url.pathname === "/api/grievances" && req.method === "GET") {
      const authUser = getAuthUser(req);
      if (!authUser) {
        sendJson(res, 401, { ok: false, error: "Login is required." });
        return true;
      }
      if (db.dbAvailable) {
        const result = canSeeAll(authUser)
          ? await db.query("SELECT * FROM grievances ORDER BY created_at DESC LIMIT 100")
          : await db.query("SELECT * FROM grievances WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100", [authUser.id]);
        sendJson(res, 200, { ok: true, grievances: result.rows });
        return true;
      }
      const rows = (demoStore.grievances || []).filter((item) => canSeeAll(authUser) || String(item.userId) === String(authUser.id));
      sendJson(res, 200, { ok: true, grievances: rows });
      return true;
    }

    if (url.pathname === "/api/grievances" && req.method === "POST") {
      const authUser = getAuthUser(req);
      if (!authUser) {
        sendJson(res, 401, { ok: false, error: "Login is required." });
        return true;
      }
      const body = await readBody(req);
      const description = String(body.description || "").trim();
      const category = String(body.category || "general").trim();
      if (description.length < 12) {
        sendJson(res, 400, { ok: false, error: "Please describe the grievance in at least 12 characters." });
        return true;
      }
      const rule36 = assertRule36Safe(description);
      if (!rule36.ok) {
        sendJson(res, 422, { ok: false, error: rule36.error });
        return true;
      }
      const slaDueAt = new Date(Date.now() + 72 * 3600 * 1000).toISOString();
      const record = {
        id: `grievance-${Date.now()}`,
        userId: authUser.id,
        againstUserId: body.againstUserId || null,
        targetType: body.targetType || null,
        targetId: body.targetId || null,
        category,
        description,
        status: "open",
        slaDueAt,
        createdAt: new Date().toISOString(),
      };
      if (db.dbAvailable) {
        const created = await db.query(
          `INSERT INTO grievances (user_id, against_user_id, target_type, target_id, category, description, status, sla_due_at, payload)
           VALUES ($1,$2,$3,$4,$5,$6,'open',$7,$8) RETURNING *`,
          [authUser.id, body.againstUserId || null, body.targetType || null, body.targetId || null, category, description, slaDueAt, JSON.stringify({ source: "portal" })],
        );
        const admins = await resolveAdminRecipients();
        await notify({
          eventType: "grievance_filed",
          title: "Grievance filed",
          message: `A ${category} grievance was filed and must be reviewed within 72 hours.`,
          recipients: [...(await resolveRecipients([authUser.id])), ...admins],
          payload: { grievanceId: created.rows[0].id },
          sendEmail: true,
          ctaLabel: "Open grievances",
          ctaUrl: portalUrl(canSeeAll(authUser) ? "/admin" : "/client/grievance"),
          priority: "high",
        });
        sendJson(res, 201, { ok: true, grievance: created.rows[0] });
        return true;
      }
      demoStore.grievances = demoStore.grievances || [];
      demoStore.grievances.unshift(record);
      sendJson(res, 201, { ok: true, grievance: record, mode: "demo" });
      return true;
    }

    const grievanceMatch = url.pathname.match(/^\/api\/admin\/grievances\/([^/]+)$/);
    if (grievanceMatch && req.method === "PATCH") {
      const authUser = getAuthUser(req);
      if (!authUser || !canSeeAll(authUser)) {
        sendJson(res, 403, { ok: false, error: "Admin access required." });
        return true;
      }
      const body = await readBody(req);
      const status = ["open", "in_review", "resolved", "rejected"].includes(body.status) ? body.status : null;
      if (!status) {
        sendJson(res, 400, { ok: false, error: "Invalid grievance status." });
        return true;
      }
      if (db.dbAvailable) {
        const updated = await db.query(
          `UPDATE grievances SET status = $2, resolution = $3, updated_at = now() WHERE id = $1 RETURNING *`,
          [grievanceMatch[1], status, body.resolution || null],
        );
        if (!updated.rows[0]) {
          sendJson(res, 404, { ok: false, error: "Grievance not found." });
          return true;
        }
        await notify({
          eventType: "grievance_updated",
          title: `Grievance ${status.replace(/_/g, " ")}`,
          message: body.resolution || `Your grievance is now ${status.replace(/_/g, " ")}.`,
          recipients: await resolveRecipients([updated.rows[0].user_id]),
          payload: { grievanceId: updated.rows[0].id, status },
          sendEmail: true,
          ctaLabel: "View grievance",
          ctaUrl: portalUrl("/client/grievance"),
        });
        sendJson(res, 200, { ok: true, grievance: updated.rows[0] });
        return true;
      }
      sendJson(res, 200, { ok: true, grievance: { id: grievanceMatch[1], status, resolution: body.resolution || null } });
      return true;
    }

    if (url.pathname === "/api/engagements/generate" && req.method === "POST") {
      const authUser = getAuthUser(req);
      if (!authUser) {
        sendJson(res, 401, { ok: false, error: "Login is required." });
        return true;
      }
      const body = await readBody(req);
      const html = engagementHtml({
        clientName: body.clientName || authUser.name,
        advocateName: body.advocateName || "Assigned counsel",
        caseTitle: body.caseTitle || "Engaged matter",
        courtName: body.courtName,
      });
      const contentHash = crypto.createHash("sha256").update(html).digest("hex");
      if (db.dbAvailable) {
        const created = await db.query(
          `INSERT INTO engagement_agreements (case_id, booking_id, client_user_id, advocate_user_id, html_body, content_hash, status, payload)
           VALUES ($1,$2,$3,$4,$5,$6,'awaiting_signatures',$7) RETURNING *`,
          [
            body.caseId || null,
            body.bookingId || null,
            body.clientUserId || (authUser.role === "client" ? authUser.id : null),
            body.advocateUserId || (authUser.role === "advocate" ? authUser.id : null),
            html,
            contentHash,
            JSON.stringify({ generatedBy: authUser.id }),
          ],
        );
        sendJson(res, 201, { ok: true, engagement: created.rows[0] });
        return true;
      }
      const engagement = {
        id: `engagement-${Date.now()}`,
        htmlBody: html,
        contentHash,
        status: "awaiting_signatures",
        clientUserId: body.clientUserId || authUser.id,
        advocateUserId: body.advocateUserId || null,
      };
      demoStore.engagements = demoStore.engagements || [];
      demoStore.engagements.unshift(engagement);
      sendJson(res, 201, { ok: true, engagement, mode: "demo" });
      return true;
    }

    const engagementSignMatch = url.pathname.match(/^\/api\/engagements\/([^/]+)\/sign$/);
    if (engagementSignMatch && req.method === "POST") {
      const authUser = getAuthUser(req);
      if (!authUser) {
        sendJson(res, 401, { ok: false, error: "Login is required." });
        return true;
      }
      const body = await readBody(req);
      const signature = String(body.signature || authUser.name || "").trim();
      if (signature.length < 2) {
        sendJson(res, 400, { ok: false, error: "Typed signature is required." });
        return true;
      }
      if (db.dbAvailable) {
        const existing = await db.query("SELECT * FROM engagement_agreements WHERE id = $1 LIMIT 1", [engagementSignMatch[1]]);
        if (!existing.rows[0]) {
          sendJson(res, 404, { ok: false, error: "Engagement not found." });
          return true;
        }
        const row = existing.rows[0];
        const isClient = authUser.role === "client" || String(row.client_user_id) === String(authUser.id);
        const updated = await db.query(
          isClient
            ? `UPDATE engagement_agreements SET client_signed_at = now(), client_signature = $2,
               status = CASE WHEN advocate_signed_at IS NOT NULL THEN 'fully_signed' ELSE 'awaiting_advocate' END,
               updated_at = now() WHERE id = $1 RETURNING *`
            : `UPDATE engagement_agreements SET advocate_signed_at = now(), advocate_signature = $2,
               status = CASE WHEN client_signed_at IS NOT NULL THEN 'fully_signed' ELSE 'awaiting_client' END,
               updated_at = now() WHERE id = $1 RETURNING *`,
          [engagementSignMatch[1], signature],
        );
        sendJson(res, 200, { ok: true, engagement: updated.rows[0] });
        return true;
      }
      const engagement = (demoStore.engagements || []).find((item) => String(item.id) === String(engagementSignMatch[1]));
      if (!engagement) {
        sendJson(res, 404, { ok: false, error: "Engagement not found." });
        return true;
      }
      if (authUser.role === "client") {
        engagement.clientSignedAt = new Date().toISOString();
        engagement.clientSignature = signature;
      } else {
        engagement.advocateSignedAt = new Date().toISOString();
        engagement.advocateSignature = signature;
      }
      engagement.status = engagement.clientSignedAt && engagement.advocateSignedAt ? "fully_signed" : engagement.status;
      sendJson(res, 200, { ok: true, engagement });
      return true;
    }

    if (url.pathname === "/api/reminders/ndoh/process" && req.method === "POST") {
      const authUser = getAuthUser(req);
      if (!authUser || !canSeeAll(authUser)) {
        sendJson(res, 403, { ok: false, error: "Admin access required." });
        return true;
      }
      const sent = await processDueReminders();
      const noAppearance = await scanMissingProxyAppearances();
      sendJson(res, 200, { ok: true, remindersSent: sent.length, noAppearanceAlerts: noAppearance.length });
      return true;
    }

    if (url.pathname === "/api/reminders/ndoh/schedule" && req.method === "POST") {
      const authUser = getAuthUser(req);
      if (!authUser) {
        sendJson(res, 401, { ok: false, error: "Login is required." });
        return true;
      }
      const body = await readBody(req);
      const matter = { id: body.caseId, nextDate: body.nextDate, title: body.title || body.caseTitle };
      const created = await scheduleNdohRemindersForCase(matter, body.userId || authUser.id);
      sendJson(res, 200, { ok: true, scheduled: created.length, jobs: created });
      return true;
    }

    const conflictMatch = url.pathname.match(/^\/api\/tasks\/([^/]+)\/conflict-declare$/);
    if (conflictMatch && req.method === "POST") {
      const authUser = getAuthUser(req);
      if (!authUser) {
        sendJson(res, 401, { ok: false, error: "Login is required." });
        return true;
      }
      const body = await readBody(req);
      if (!body.declared) {
        sendJson(res, 400, { ok: false, error: "Conflict of interest declaration must be accepted." });
        return true;
      }
      const task = await loadTask(conflictMatch[1]);
      if (!task) {
        sendJson(res, 404, { ok: false, error: "Task not found." });
        return true;
      }
      const updated = await saveTaskPatch(conflictMatch[1], {
        payloadPatch: {
          conflictDeclaredAt: new Date().toISOString(),
          conflictDeclaredBy: authUser.id,
          conflictNote: String(body.note || "").slice(0, 500),
          transparencyLayer: "acceptance",
        },
      });
      await writeAuditLog(authUser, "proxy_conflict_declared", "task", conflictMatch[1], "Conflict of interest declaration signed.", { note: body.note || null });
      await notifyTaskLayer(updated, {
        eventType: "proxy_conflict_declared",
        title: "Conflict declaration recorded",
        message: `Proxy counsel signed the conflict declaration for ${updated.title || "the mission"}.`,
        priority: "high",
      });
      sendJson(res, 200, { ok: true, task: updated });
      return true;
    }

    const checkInMatch = url.pathname.match(/^\/api\/tasks\/([^/]+)\/check-in$/);
    if (checkInMatch && req.method === "POST") {
      const authUser = getAuthUser(req);
      if (!authUser) {
        sendJson(res, 401, { ok: false, error: "Login is required." });
        return true;
      }
      const task = await loadTask(checkInMatch[1]);
      if (!task) {
        sendJson(res, 404, { ok: false, error: "Task not found." });
        return true;
      }
      if (!task.conflictDeclaredAt && !task.payload?.conflictDeclaredAt) {
        sendJson(res, 409, { ok: false, error: "Declare conflict of interest before check-in." });
        return true;
      }
      const proofWindowOpensAt = new Date().toISOString();
      const proofWindowClosesAt = new Date(Date.now() + 8 * 3600 * 1000).toISOString();
      const updated = await saveTaskPatch(checkInMatch[1], {
        status: "Checked In",
        proofStatus: "window_open",
        payloadPatch: {
          checkedInAt: proofWindowOpensAt,
          checkedInBy: authUser.id,
          proofWindowOpensAt,
          proofWindowClosesAt,
          transparencyLayer: "day_of",
        },
      });
      await notifyTaskLayer(updated, {
        eventType: "proxy_checked_in",
        title: "Proxy checked in",
        message: `${authUser.name || "Proxy counsel"} checked in. Proof upload window is now open.`,
        priority: "high",
        sendSms: true,
      });
      sendJson(res, 200, { ok: true, task: updated });
      return true;
    }

    const proofMatch = url.pathname.match(/^\/api\/tasks\/([^/]+)\/proof$/);
    if (proofMatch && req.method === "POST") {
      const authUser = getAuthUser(req);
      if (!authUser) {
        sendJson(res, 401, { ok: false, error: "Login is required." });
        return true;
      }
      const task = await loadTask(proofMatch[1]);
      if (!task) {
        sendJson(res, 404, { ok: false, error: "Task not found." });
        return true;
      }
      if (!(task.checkedInAt || task.payload?.checkedInAt)) {
        sendJson(res, 409, { ok: false, error: "Check in before uploading proof." });
        return true;
      }
      const contentType = String(req.headers["content-type"] || "");
      let fileBuffer = null;
      let fileName = safeAttachmentName(req.headers["x-file-name"] || "order-sheet.pdf");
      let proofUrl = null;
      if (contentType.includes("application/json")) {
        const body = await readBody(req);
        proofUrl = body.proofUrl || body.url || null;
        if (body.base64) fileBuffer = Buffer.from(String(body.base64).replace(/^data:[^;]+;base64,/, ""), "base64");
        if (body.fileName) fileName = safeAttachmentName(body.fileName);
      } else {
        fileBuffer = await readRawBody(req, 8 * 1024 * 1024);
      }
      if (!fileBuffer?.length && !proofUrl) {
        sendJson(res, 400, { ok: false, error: "Proof file is required." });
        return true;
      }
      const proofHash = fileBuffer?.length
        ? crypto.createHash("sha256").update(fileBuffer).digest("hex")
        : crypto.createHash("sha256").update(String(proofUrl)).digest("hex");
      if (db.dbAvailable) {
        const reused = await db.query(
          `SELECT id FROM tasks WHERE proof_hash = $1 AND id <> $2 LIMIT 1`,
          [proofHash, proofMatch[1]],
        );
        if (reused.rows[0]) {
          sendJson(res, 409, { ok: false, error: "This order sheet scan was already used on another mission. Upload a fresh scan." });
          return true;
        }
      } else if ((demoStore.tasks || []).some((item) => item.proofHash === proofHash && String(item.id) !== String(proofMatch[1]))) {
        sendJson(res, 409, { ok: false, error: "This order sheet scan was already used on another mission. Upload a fresh scan." });
        return true;
      }
      if (fileBuffer?.length) {
        const cloud = await uploadToCloudinary({
          buffer: fileBuffer,
          fileName,
          mimeType: contentType.split(";")[0] || "application/pdf",
          folder: "legal-connect/proxy-proofs",
        });
        if (cloud.ok) proofUrl = cloud.url;
        else if (!proofUrl) proofUrl = `local://proof/${proofHash.slice(0, 16)}/${fileName}`;
      }
      const updated = await saveTaskPatch(proofMatch[1], {
        status: "Proof Uploaded",
        proofUrl,
        proofHash,
        proofStatus: "submitted",
        payloadPatch: {
          proofSubmittedAt: new Date().toISOString(),
          proofSubmittedBy: authUser.id,
          transparencyLayer: "proof",
        },
      });
      await notifyTaskLayer(updated, {
        eventType: "proxy_proof_submitted",
        title: "Proof submitted for main counsel review",
        message: `Order sheet proof was uploaded for ${updated.title || "the mission"}. Escrow stays locked until the posting counsel marks proof satisfactory, then LC Admin releases net funds after taxes.`,
        priority: "high",
        includeAdmins: true,
      });
      sendJson(res, 200, { ok: true, task: updated });
      return true;
    }

    const proofReviewMatch = url.pathname.match(/^\/api\/tasks\/([^/]+)\/proof-review$/);
    if (proofReviewMatch && req.method === "POST") {
      const authUser = getAuthUser(req);
      if (!authUser) {
        sendJson(res, 401, { ok: false, error: "Login is required." });
        return true;
      }
      const task = await loadTask(proofReviewMatch[1]);
      if (!task) {
        sendJson(res, 404, { ok: false, error: "Task not found." });
        return true;
      }
      const body = await readBody(req);
      const decision = String(body.decision || body.verdict || "").trim().toLowerCase();
      const reason = String(body.reason || body.note || "").trim();
      const isPoster = String(task.postedBy || task.payload?.postedBy || "") === String(authUser.id || "");
      if (!isPoster && !canSeeAll(authUser)) {
        sendJson(res, 403, { ok: false, error: "Only the posting counsel (or LC Admin) can review proof." });
        return true;
      }
      const proofStatus = String(task.proofStatus || task.proof_status || "").toLowerCase();
      if (proofStatus !== "submitted") {
        sendJson(res, 409, { ok: false, error: "Proof is not awaiting main counsel review." });
        return true;
      }
      if (!["ok", "approved", "satisfied", "not_ok", "rejected", "unsatisfied"].includes(decision)) {
        sendJson(res, 400, { ok: false, error: "decision must be ok or not_ok." });
        return true;
      }
      const satisfied = ["ok", "approved", "satisfied"].includes(decision);
      if (!satisfied && reason.length < 8) {
        sendJson(res, 400, { ok: false, error: "State the reason (at least 8 characters) when proof is not satisfactory." });
        return true;
      }
      if (satisfied) {
        const settlement = computeProxySettlement(task.amount || task.fee || 0);
        const updated = await saveTaskPatch(proofReviewMatch[1], {
          status: "Proof Approved by Counsel",
          proofStatus: "poster_approved",
          escrowStatus: task.escrowStatus || "Locked",
          payloadPatch: {
            posterProofDecision: "ok",
            posterProofReason: reason || null,
            posterProofReviewedAt: new Date().toISOString(),
            posterProofReviewedBy: authUser.id,
            settlementPreview: settlement,
            transparencyLayer: "poster_proof_review",
            blueprintState: "proof_approved",
          },
        });
        await writeAuditLog(authUser, "proxy_proof_poster_ok", "task", proofReviewMatch[1], "Main counsel satisfied with proxy proof", {
          decision: "ok",
        });
        await notifyTaskLayer(updated, {
          eventType: "proxy_proof_poster_approved",
          title: "Main counsel approved proof",
          message: `${updated.title || "Proxy mission"} proof was marked satisfactory. LC Admin can now release ₹${settlement.netToProxy.toLocaleString("en-IN")} net (after 10% platform + 3% tax) for manual settlement.`,
          priority: "high",
          includeAdmins: true,
        });
        sendJson(res, 200, { ok: true, decision: "ok", task: updated, settlement });
        return true;
      }

      const updated = await saveTaskPatch(proofReviewMatch[1], {
        status: "Proof Rejected",
        proofStatus: "rejected",
        escrowStatus: task.escrowStatus || "Locked",
        payloadPatch: {
          posterProofDecision: "not_ok",
          posterProofReason: reason,
          posterProofReviewedAt: new Date().toISOString(),
          posterProofReviewedBy: authUser.id,
          proofWindow: "reopen",
          transparencyLayer: "poster_proof_review",
        },
      });
      await writeAuditLog(authUser, "proxy_proof_poster_reject", "task", proofReviewMatch[1], "Main counsel rejected proxy proof", {
        decision: "not_ok",
        reason,
      });
      await notifyTaskLayer(updated, {
        eventType: "proxy_proof_poster_rejected",
        title: "Proof not accepted — re-upload required",
        message: `Posting counsel rejected the proof for ${updated.title || "the mission"}: ${reason}. Escrow remains locked. Proxy counsel must upload a fresh order sheet.`,
        priority: "high",
        includeAdmins: true,
        sendSms: true,
      });
      sendJson(res, 200, { ok: true, decision: "not_ok", task: updated, reason });
      return true;
    }

    const rateMatch = url.pathname.match(/^\/api\/tasks\/([^/]+)\/rate$/);
    if (rateMatch && req.method === "POST") {
      const authUser = getAuthUser(req);
      if (!authUser) {
        sendJson(res, 401, { ok: false, error: "Login is required." });
        return true;
      }
      const body = await readBody(req);
      const stars = Number(body.stars || body.rating || 0);
      if (!Number.isFinite(stars) || stars < 1 || stars > 5) {
        sendJson(res, 400, { ok: false, error: "Rating must be between 1 and 5 stars." });
        return true;
      }
      const task = await loadTask(rateMatch[1]);
      if (!task) {
        sendJson(res, 404, { ok: false, error: "Task not found." });
        return true;
      }
      const isPoster = String(task.postedBy) === String(authUser.id);
      const isProxy = String(task.acceptedBy) === String(authUser.id);
      if (!isPoster && !isProxy && !canSeeAll(authUser)) {
        sendJson(res, 403, { ok: false, error: "Only the posting advocate or assigned proxy can rate this mission." });
        return true;
      }
      const rateeId = isPoster ? task.acceptedBy : task.postedBy;
      const comment = String(body.comment || "").slice(0, 500);
      if (db.dbAvailable) {
        const created = await db.query(
          `INSERT INTO task_ratings (task_id, rater_id, ratee_id, rater_role, stars, comment)
           VALUES ($1,$2,$3,$4,$5,$6)
           ON CONFLICT (task_id, rater_id) DO UPDATE SET stars = EXCLUDED.stars, comment = EXCLUDED.comment
           RETURNING *`,
          [rateMatch[1], authUser.id, rateeId || null, isPoster ? "poster" : "proxy", stars, comment || null],
        );
        await notify({
          eventType: "proxy_rating_received",
          title: "ProxyHub rating received",
          message: `You received a ${stars}-star rating on ${task.title || "a proxy mission"}.`,
          recipients: await resolveRecipients([rateeId].filter(Boolean)),
          payload: { taskId: rateMatch[1], stars },
          sendEmail: true,
          ctaLabel: "Open ProxyHub",
          ctaUrl: portalUrl("/advocate/proxy"),
        });
        sendJson(res, 200, { ok: true, rating: created.rows[0] });
        return true;
      }
      demoStore.taskRatings = demoStore.taskRatings || [];
      const rating = { id: `rating-${Date.now()}`, taskId: rateMatch[1], raterId: authUser.id, rateeId, stars, comment };
      demoStore.taskRatings = demoStore.taskRatings.filter((item) => !(item.taskId === rating.taskId && item.raterId === rating.raterId));
      demoStore.taskRatings.unshift(rating);
      sendJson(res, 200, { ok: true, rating });
      return true;
    }

    if (url.pathname === "/api/proxy-hub/scan-no-appearance" && req.method === "POST") {
      const authUser = getAuthUser(req);
      if (!authUser || !canSeeAll(authUser)) {
        sendJson(res, 403, { ok: false, error: "Admin access required." });
        return true;
      }
      const alerts = await scanMissingProxyAppearances();
      sendJson(res, 200, { ok: true, alerts: alerts.length, taskIds: alerts });
      return true;
    }

    // ── LC-supervised case update pipeline ──────────────────────────────────
    const caseUpdatesMatch = url.pathname.match(/^\/api\/cases\/([^/]+)\/updates$/);
    if (caseUpdatesMatch && req.method === "GET") {
      const authUser = getAuthUser(req);
      if (!authUser) {
        sendJson(res, 401, { ok: false, error: "Login is required." });
        return true;
      }
      const caseId = caseUpdatesMatch[1];
      const isAdmin = canSeeAll(authUser);
      const isClient = String(authUser.role || "").toLowerCase() === "client";
      if (db.dbAvailable && isUuid(caseId)) {
        const updates = isAdmin || !isClient
          ? await db.query(
              `SELECT * FROM case_updates WHERE case_id = $1 ORDER BY created_at DESC LIMIT 100`,
              [caseId],
            )
          : await db.query(
              `SELECT * FROM case_updates
               WHERE case_id = $1 AND status IN ('approved', 'approved_and_released')
               ORDER BY created_at DESC LIMIT 100`,
              [caseId],
            );
        const replies = await db.query(
          `SELECT * FROM case_update_replies WHERE case_id = $1 ORDER BY created_at ASC LIMIT 200`,
          [caseId],
        );
        const visibleReplies = (replies.rows || []).filter((row) => {
          if (isAdmin) return true;
          if (String(row.author_id) === String(authUser.id)) return true;
          return row.status === "approved";
        });
        sendJson(res, 200, {
          ok: true,
          updates: updates.rows.map((row) => ({
            ...row,
            replies: visibleReplies.filter((reply) => String(reply.update_id) === String(row.id)),
          })),
        });
        return true;
      }
      const demoUpdates = (demoStore.caseUpdates || []).filter((item) => String(item.caseId) === String(caseId));
      sendJson(res, 200, {
        ok: true,
        updates: demoUpdates.filter((item) => isAdmin || !isClient || item.status === "approved"),
        mode: "demo",
      });
      return true;
    }

    if (caseUpdatesMatch && req.method === "POST") {
      const authUser = getAuthUser(req);
      if (!authUser) {
        sendJson(res, 401, { ok: false, error: "Login is required." });
        return true;
      }
      const role = String(authUser.role || "").toLowerCase();
      if (!["advocate", "intern", "admin"].includes(role) && !canSeeAll(authUser)) {
        sendJson(res, 403, { ok: false, error: "Only counsel or Legal Connect staff can post case updates." });
        return true;
      }
      const caseId = caseUpdatesMatch[1];
      const body = await readBody(req);
      const message = String(body.message || body.update || "").trim();
      const updateType = String(body.updateType || body.type || "progress").trim();
      if (message.length < 12) {
        sendJson(res, 400, { ok: false, error: "Case update must be at least 12 characters." });
        return true;
      }
      const rule36 = assertRule36Safe(message);
      if (!rule36.ok) {
        sendJson(res, 422, { ok: false, error: rule36.error });
        return true;
      }
      const status = canSeeAll(authUser) && body.publishImmediately ? "approved" : "pending_lc_review";
      const record = {
        id: `update-${Date.now()}`,
        caseId,
        updateType,
        message,
        status,
        authorId: authUser.id,
        authorRole: role,
        createdAt: new Date().toISOString(),
        payload: body.payload || {},
      };
      if (db.dbAvailable && isUuid(caseId)) {
        const created = await db.query(
          `INSERT INTO case_updates (case_id, update_type, message, payload, status, author_id, author_role, reviewed_by, reviewed_at)
           VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7, $8, $9)
           RETURNING *`,
          [
            caseId,
            updateType,
            message,
            JSON.stringify(record.payload),
            status,
            String(authUser.id),
            role,
            status === "approved" ? String(authUser.id) : null,
            status === "approved" ? new Date().toISOString() : null,
          ],
        );
        const parties = await supervised.caseClientAndAdvocate(caseId);
        if (status === "pending_lc_review") {
          const bookingId = parties.bookingId || await supervised.bookingIdForCase(caseId);
          if (bookingId) {
            await supervised.syncBookingPipelineStage(bookingId, "advocate_update_pending", {
              lastUpdateId: created.rows[0].id,
              lastUpdateAt: new Date().toISOString(),
            });
          }
          await supervised.syncCasePipelineStage(caseId, "advocate_update_pending", {
            lastUpdateId: created.rows[0].id,
          });
        }
        if (status === "approved") {
          await supervised.mirrorApprovedUpdateToCommunications(caseId, created.rows[0], authUser.id);
          const bookingId = parties.bookingId || await supervised.bookingIdForCase(caseId);
          if (bookingId) await supervised.syncBookingPipelineStage(bookingId, "lc_update_approved");
          await supervised.syncCasePipelineStage(caseId, "lc_update_approved");
        }
        await notify({
          eventType: status === "approved" ? "case_update_published" : "case_update_pending_review",
          title: status === "approved" ? "Case update released" : "Advocate update awaiting LC review",
          message: status === "approved"
            ? `Legal Connect released a counsel update on ${parties.caseTitle || "your matter"}.`
            : `${authUser.name || "Counsel"} submitted an update for Legal Connect review before client release.`,
          recipients: status === "approved"
            ? await resolveRecipients([parties.clientId, authUser.id].filter(Boolean))
            : await resolveAdminRecipients(),
          payload: {
            caseId,
            updateId: created.rows[0].id,
            status,
            bookingId: parties.bookingId || null,
            clientId: parties.clientId,
            advocateId: parties.advocateId || authUser.id,
          },
          sendEmail: true,
          priority: "high",
          ctaLabel: status === "approved" ? "Open case updates" : "Review updates",
          ctaUrl: portalUrl(status === "approved" ? "/client/updates" : "/admin/pending-updates"),
        });
        if (status === "pending_lc_review") {
          await notify({
            eventType: "case_update_held_for_lc",
            title: "Update submitted to Legal Connect",
            message: "Your update is held for LC review. It will reach the client only after approval.",
            recipients: await resolveRecipients([authUser.id]),
            payload: { caseId, updateId: created.rows[0].id, status },
            sendEmail: true,
            ctaLabel: "Open case updates",
            ctaUrl: portalUrl("/advocate/updates"),
          });
        }
        sendJson(res, 201, { ok: true, update: created.rows[0], supervised: true });
        return true;
      }
      demoStore.caseUpdates = demoStore.caseUpdates || [];
      demoStore.caseUpdates.unshift(record);
      sendJson(res, 201, { ok: true, update: record, mode: "demo" });
      return true;
    }

    if (url.pathname === "/api/admin/pending-updates" && req.method === "GET") {
      const authUser = getAuthUser(req);
      if (!authUser || !canSeeAll(authUser)) {
        sendJson(res, 403, { ok: false, error: "Admin access required." });
        return true;
      }
      if (db.dbAvailable) {
        const [updates, replies] = await Promise.all([
          db.query(`SELECT * FROM case_updates WHERE status = 'pending_lc_review' ORDER BY created_at ASC LIMIT 100`),
          db.query(`SELECT * FROM case_update_replies WHERE status = 'pending_lc_review' ORDER BY created_at ASC LIMIT 100`),
        ]);
        sendJson(res, 200, {
          ok: true,
          pendingUpdates: updates.rows,
          pendingReplies: replies.rows,
        });
        return true;
      }
      sendJson(res, 200, {
        ok: true,
        pendingUpdates: (demoStore.caseUpdates || []).filter((item) => item.status === "pending_lc_review"),
        pendingReplies: (demoStore.caseUpdateReplies || []).filter((item) => item.status === "pending_lc_review"),
        mode: "demo",
      });
      return true;
    }

    // Plan alias: POST /api/admin/updates/:id/approve|return
    const adminUpdateAlias = url.pathname.match(/^\/api\/admin\/updates\/([^/]+)\/(approve|return)$/);
    const adminUpdateAction = url.pathname.match(/^\/api\/admin\/pending-updates\/([^/]+)\/(approve|return)$/)
      || adminUpdateAlias;
    if (adminUpdateAction && req.method === "POST") {
      const authUser = getAuthUser(req);
      if (!authUser || !canSeeAll(authUser)) {
        sendJson(res, 403, { ok: false, error: "Admin access required." });
        return true;
      }
      const updateId = adminUpdateAction[1];
      const action = adminUpdateAction[2];
      const body = await readBody(req);
      const requestedKind = String(body.kind || "").toLowerCase();
      let kind = requestedKind === "reply" ? "reply" : requestedKind === "update" ? "update" : null;
      const nextStatus = action === "approve" ? "approved" : "returned";
      const returnReason = action === "return" ? String(body.reason || body.returnReason || "").trim() : null;
      if (action === "return" && (!returnReason || returnReason.length < 4)) {
        sendJson(res, 400, { ok: false, error: "A return reason is required." });
        return true;
      }
      if (db.dbAvailable) {
        // When kind is omitted (plan alias /api/admin/updates/:id/approve), detect update vs reply.
        if (!kind) {
          const [asUpdate, asReply] = await Promise.all([
            db.query("SELECT id FROM case_updates WHERE id = $1 LIMIT 1", [updateId]).catch(() => ({ rows: [] })),
            db.query("SELECT id FROM case_update_replies WHERE id = $1 LIMIT 1", [updateId]).catch(() => ({ rows: [] })),
          ]);
          if (asUpdate.rows[0]) kind = "update";
          else if (asReply.rows[0]) kind = "reply";
          else {
            sendJson(res, 404, { ok: false, error: "Update not found." });
            return true;
          }
        }
        if (kind === "reply") {
          const updated = await db.query(
            `UPDATE case_update_replies
             SET status = $2, reviewed_by = $3, reviewed_at = now(), return_reason = $4
             WHERE id = $1
             RETURNING *`,
            [updateId, nextStatus, String(authUser.id), returnReason],
          );
          if (!updated.rows[0]) {
            sendJson(res, 404, { ok: false, error: "Reply not found." });
            return true;
          }
          const parties = await supervised.caseClientAndAdvocate(updated.rows[0].case_id);
          const parentUpdate = await db.query(
            `SELECT author_id FROM case_updates WHERE id = $1 LIMIT 1`,
            [updated.rows[0].update_id],
          ).catch(() => ({ rows: [] }));
          const advocateId = parentUpdate.rows[0]?.author_id || parties.advocateId;
          await notify({
            eventType: action === "approve" ? "case_reply_approved" : "case_reply_returned",
            title: action === "approve" ? "Client reply forwarded by Legal Connect" : "Client reply returned",
            message: action === "approve"
              ? "Legal Connect reviewed and forwarded a client reply to counsel."
              : `Legal Connect returned a client reply: ${returnReason}`,
            recipients: await resolveRecipients(
              action === "approve"
                ? [updated.rows[0].author_id, advocateId].filter(Boolean)
                : [updated.rows[0].author_id].filter(Boolean),
            ),
            payload: {
              replyId: updateId,
              status: nextStatus,
              caseId: updated.rows[0].case_id,
              clientId: parties.clientId,
              advocateId,
            },
            sendEmail: true,
            priority: "high",
            ctaLabel: "Open updates",
            ctaUrl: portalUrl(action === "approve" ? "/advocate/updates" : "/client/updates"),
          });
          sendJson(res, 200, { ok: true, reply: updated.rows[0], supervised: true });
          return true;
        }
        const updated = await db.query(
          `UPDATE case_updates
           SET status = $2, reviewed_by = $3, reviewed_at = now(), return_reason = $4
           WHERE id = $1
           RETURNING *`,
          [updateId, nextStatus, String(authUser.id), returnReason],
        );
        if (!updated.rows[0]) {
          sendJson(res, 404, { ok: false, error: "Update not found." });
          return true;
        }
        const parties = await supervised.caseClientAndAdvocate(updated.rows[0].case_id);
        if (action === "approve") {
          await supervised.mirrorApprovedUpdateToCommunications(updated.rows[0].case_id, updated.rows[0], authUser.id);
          const bookingId = parties.bookingId || await supervised.bookingIdForCase(updated.rows[0].case_id);
          if (bookingId) {
            await supervised.syncBookingPipelineStage(bookingId, "lc_update_approved", {
              lastReleasedUpdateId: updated.rows[0].id,
              lastReleasedAt: new Date().toISOString(),
            });
          }
          await supervised.syncCasePipelineStage(updated.rows[0].case_id, "lc_update_approved", {
            lastReleasedUpdateId: updated.rows[0].id,
          });
        }
        await notify({
          eventType: action === "approve" ? "case_update_approved" : "case_update_returned",
          title: action === "approve" ? "Update released to client" : "Case update returned to advocate",
          message: action === "approve"
            ? `Legal Connect approved and released counsel's update on ${parties.caseTitle || "your matter"}.`
            : `Legal Connect returned your case update: ${returnReason}`,
          recipients: await resolveRecipients(
            action === "approve"
              ? [parties.clientId, updated.rows[0].author_id].filter(Boolean)
              : [updated.rows[0].author_id].filter(Boolean),
          ),
          payload: {
            updateId,
            status: nextStatus,
            caseId: updated.rows[0].case_id,
            clientId: parties.clientId,
            advocateId: updated.rows[0].author_id,
            bookingId: parties.bookingId,
          },
          sendEmail: true,
          sendSms: action === "approve",
          priority: "high",
          ctaLabel: action === "approve" ? "Read update" : "Revise update",
          ctaUrl: portalUrl(action === "approve" ? "/client/updates" : "/advocate/updates"),
        });
        sendJson(res, 200, { ok: true, update: updated.rows[0], supervised: true });
        return true;
      }

      // Demo / memory fallback — mutate in-memory queues so LC gate smoke works offline.
      if (!kind) {
        const asUpdate = (demoStore.caseUpdates || []).find((item) => String(item.id) === String(updateId));
        const asReply = (demoStore.caseUpdateReplies || []).find((item) => String(item.id) === String(updateId));
        if (asUpdate) kind = "update";
        else if (asReply) kind = "reply";
        else {
          sendJson(res, 404, { ok: false, error: "Update not found." });
          return true;
        }
      }
      if (kind === "reply") {
        const reply = (demoStore.caseUpdateReplies || []).find((item) => String(item.id) === String(updateId));
        if (!reply) {
          sendJson(res, 404, { ok: false, error: "Reply not found." });
          return true;
        }
        Object.assign(reply, {
          status: nextStatus,
          reviewedBy: authUser.id,
          reviewedAt: new Date().toISOString(),
          returnReason: returnReason,
        });
        sendJson(res, 200, { ok: true, reply, supervised: true, mode: "demo" });
        return true;
      }
      const demoUpdate = (demoStore.caseUpdates || []).find((item) => String(item.id) === String(updateId));
      if (!demoUpdate) {
        sendJson(res, 404, { ok: false, error: "Update not found." });
        return true;
      }
      Object.assign(demoUpdate, {
        status: nextStatus,
        reviewedBy: authUser.id,
        reviewedAt: new Date().toISOString(),
        returnReason: returnReason,
      });
      if (action === "approve") {
        const linkedCase = (demoStore.cases || []).find((item) => String(item.id) === String(demoUpdate.caseId));
        if (linkedCase) {
          linkedCase.stage = "lc_update_approved";
          linkedCase.pipelineStage = "lc_update_approved";
          linkedCase.intakeStatus = "lc_update_approved";
        }
        const bookingId = linkedCase?.bookingId || linkedCase?.payload?.bookingId;
        const linkedBooking = (demoStore.bookings || []).find((item) => String(item.id) === String(bookingId));
        if (linkedBooking) {
          linkedBooking.intakeStatus = "lc_update_approved";
          linkedBooking.stageStatus = "lc_update_approved";
        }
      }
      sendJson(res, 200, { ok: true, update: demoUpdate, supervised: true, mode: "demo" });
      return true;
    }

    const caseReplyMatch = url.pathname.match(/^\/api\/cases\/([^/]+)\/updates\/([^/]+)\/replies$/);
    if (caseReplyMatch && req.method === "POST") {
      const authUser = getAuthUser(req);
      if (!authUser) {
        sendJson(res, 401, { ok: false, error: "Login is required." });
        return true;
      }
      const caseId = caseReplyMatch[1];
      const updateId = caseReplyMatch[2];
      const body = await readBody(req);
      const message = String(body.message || "").trim();
      if (message.length < 4) {
        sendJson(res, 400, { ok: false, error: "Reply must be at least 4 characters." });
        return true;
      }
      const rule36 = assertRule36Safe(message);
      if (!rule36.ok) {
        sendJson(res, 422, { ok: false, error: rule36.error });
        return true;
      }
      const role = String(authUser.role || "").toLowerCase();
      const status = canSeeAll(authUser) ? "approved" : "pending_lc_review";
      if (db.dbAvailable && isUuid(caseId) && isUuid(updateId)) {
        const parent = await db.query(`SELECT id, status FROM case_updates WHERE id = $1 AND case_id = $2 LIMIT 1`, [updateId, caseId]);
        if (!parent.rows[0]) {
          sendJson(res, 404, { ok: false, error: "Parent update not found." });
          return true;
        }
        if (role === "client" && !["approved", "approved_and_released"].includes(String(parent.rows[0].status || ""))) {
          sendJson(res, 403, { ok: false, error: "You can only reply to approved case updates." });
          return true;
        }
        const created = await db.query(
          `INSERT INTO case_update_replies (update_id, case_id, author_id, author_role, message, status, reviewed_by, reviewed_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           RETURNING *`,
          [
            updateId,
            caseId,
            String(authUser.id),
            role,
            message,
            status,
            status === "approved" ? String(authUser.id) : null,
            status === "approved" ? new Date().toISOString() : null,
          ],
        );
        await notify({
          eventType: "case_reply_pending_review",
          title: status === "approved" ? "Case reply posted" : "Case reply awaiting LC review",
          message: `${authUser.name || "A user"} replied on a case update.`,
          recipients: status === "approved" ? await resolveRecipients([authUser.id]) : await resolveAdminRecipients(),
          payload: { caseId, updateId, replyId: created.rows[0].id, status },
          sendEmail: true,
          ctaLabel: "Review replies",
          ctaUrl: portalUrl("/admin/pending-updates"),
        });
        sendJson(res, 201, { ok: true, reply: created.rows[0] });
        return true;
      }
      const reply = {
        id: `reply-${Date.now()}`,
        updateId,
        caseId,
        authorId: authUser.id,
        authorRole: role,
        message,
        status,
        createdAt: new Date().toISOString(),
      };
      demoStore.caseUpdateReplies = demoStore.caseUpdateReplies || [];
      demoStore.caseUpdateReplies.unshift(reply);
      sendJson(res, 201, { ok: true, reply, mode: "demo" });
      return true;
    }

    return false;
  }

  return {
    ensureStrategySchema,
    handleStrategyRoutes,
    assertRule36Safe,
    validateProxyPostingFields,
    computeCaseHealthScore,
    scheduleNdohRemindersForCase,
    processDueReminders,
    scanMissingProxyAppearances,
    getTransparencyStats,
    notifyTaskLayer,
    saveTaskPatch,
    loadTask,
    computeProxySettlement,
    proxyUrgencyMeta,
    resolveProxyUrgency,
    PROXY_URGENCY_TIERS,
  };
}

module.exports = {
  createStrategyFeatures,
  RULE36_PATTERNS,
  computeProxySettlement,
  PROXY_URGENCY_TIERS,
  resolveProxyUrgency,
  proxyUrgencyMeta,
};
