/**
 * Status progression workflows:
 * 1) Intern Quest — Open → In Progress → Submitted for Review → Completed
 * 2) ProxyHub — pending_admin_review → query_raised → Open → Accepted → Proof Uploaded → Completed
 * 3) Client Intake — draft → intake_submitted → lc_under_review → advocate_assigned → advocate_accepted/work_in_progress → concluded
 */

const COMPLETION_TIME_OPTIONS = [
  "Within 24 hours",
  "1–2 days",
  "3–5 days",
  "1 week",
  "2 weeks",
];

const PROXY_MARKETPLACE_STATUSES = new Set([
  "Open",
  "open",
  "pending_admin_review",
  "query_raised",
  "Awaiting Admin Assignment",
]);

function createWorkflowProgressions(deps) {
  const {
    db,
    notify,
    resolveRecipients,
    resolveAdminRecipients,
    portalUrl,
    sendJson,
    readBody,
    getAuthUser,
    canSeeAll,
    mapTask,
    mapInternQuest,
    mapBooking,
    writeAuditLog,
    demoStore,
    ensureInternQuestsTable,
  } = deps;

  async function loadQuest(id) {
    if (db.dbAvailable) {
      await ensureInternQuestsTable();
      const result = await db.query("SELECT * FROM intern_quests WHERE id = $1 LIMIT 1", [id]);
      return result.rows[0] ? mapInternQuest(result.rows[0]) : null;
    }
    const quest = (demoStore.internQuests || []).find((item) => String(item.id) === String(id));
    return quest ? mapInternQuest(quest) : null;
  }

  async function saveQuest(id, patch) {
    if (db.dbAvailable) {
      await ensureInternQuestsTable();
      const result = await db.query(
        `UPDATE intern_quests SET
           status = COALESCE($2, status),
           assigned_to = COALESCE($3, assigned_to),
           student_id = COALESCE($4, student_id),
           completion_eta = COALESCE($5, completion_eta),
           submission_url = COALESCE($6, submission_url),
           submission_notes = COALESCE($7, submission_notes),
           awarded_xp = COALESCE($8, awarded_xp),
           reviewed_by = COALESCE($9, reviewed_by),
           reviewed_at = CASE WHEN $10 THEN now() ELSE reviewed_at END,
           payload = COALESCE(payload, '{}'::jsonb) || COALESCE($11::jsonb, '{}'::jsonb),
           updated_at = now()
         WHERE id = $1
         RETURNING *`,
        [
          id,
          patch.status || null,
          patch.assignedTo || null,
          patch.studentId || null,
          patch.completionEta || null,
          patch.submissionUrl || null,
          patch.submissionNotes || null,
          patch.awardedXp == null ? null : Number(patch.awardedXp),
          patch.reviewedBy || null,
          Boolean(patch.markReviewed),
          patch.payload ? JSON.stringify(patch.payload) : null,
        ],
      );
      return result.rows[0] ? mapInternQuest(result.rows[0]) : null;
    }
    const quest = (demoStore.internQuests || []).find((item) => String(item.id) === String(id));
    if (!quest) return null;
    Object.assign(quest, {
      status: patch.status || quest.status,
      assignedTo: patch.assignedTo || quest.assignedTo,
      studentId: patch.studentId || quest.studentId,
      completionEta: patch.completionEta || quest.completionEta,
      submissionUrl: patch.submissionUrl || quest.submissionUrl,
      submissionNotes: patch.submissionNotes || quest.submissionNotes,
      awardedXp: patch.awardedXp == null ? quest.awardedXp : Number(patch.awardedXp),
      reviewedBy: patch.reviewedBy || quest.reviewedBy,
      reviewedAt: patch.markReviewed ? new Date().toISOString() : quest.reviewedAt,
      ...(patch.payload || {}),
      updatedAt: new Date().toISOString(),
    });
    return mapInternQuest(quest);
  }

  async function loadTask(id) {
    if (db.dbAvailable) {
      const result = await db.query("SELECT * FROM tasks WHERE id = $1 LIMIT 1", [id]);
      return result.rows[0] ? mapTask(result.rows[0]) : null;
    }
    const task = (demoStore.tasks || []).find((item) => String(item.id) === String(id));
    return task ? mapTask(task) : null;
  }

  async function patchTask(id, { status, acceptedBy, proofStatus, escrowStatus, payload }) {
    if (db.dbAvailable) {
      const result = await db.query(
        `UPDATE tasks
         SET status = COALESCE($2, status),
             accepted_by = COALESCE($3, accepted_by),
             proof_status = COALESCE($4, proof_status),
             escrow_status = COALESCE($5, escrow_status),
             payload = COALESCE(payload, '{}'::jsonb) || COALESCE($6::jsonb, '{}'::jsonb),
             updated_at = now()
         WHERE id = $1
         RETURNING *`,
        [
          id,
          status || null,
          acceptedBy || null,
          proofStatus || null,
          escrowStatus || null,
          payload ? JSON.stringify(payload) : null,
        ],
      );
      return result.rows[0] ? mapTask(result.rows[0]) : null;
    }
    const task = (demoStore.tasks || []).find((item) => String(item.id) === String(id));
    if (!task) return null;
    Object.assign(task, {
      status: status || task.status,
      acceptedBy: acceptedBy || task.acceptedBy,
      proofStatus: proofStatus || task.proofStatus,
      escrowStatus: escrowStatus || task.escrowStatus,
      ...(payload || {}),
      updatedAt: new Date().toISOString(),
    });
    return mapTask(task);
  }

  async function loadIntake(id) {
    if (db.dbAvailable) {
      const result = await db.query("SELECT * FROM bookings WHERE id = $1 LIMIT 1", [id]);
      if (!result.rows[0]) return null;
      const mapped = mapBooking(result.rows[0]);
      const payload = result.rows[0].payload && typeof result.rows[0].payload === "object" ? result.rows[0].payload : {};
      return {
        ...mapped,
        raw: result.rows[0],
        intakeStatus: payload.intakeStatus || result.rows[0].stage_status || mapped.stageStatus || mapped.paymentStatus,
        mode: "db",
      };
    }
    const booking = (demoStore.bookings || []).find((item) => String(item.id) === String(id));
    return booking ? { ...booking, intakeStatus: booking.intakeStatus || booking.paymentStatus, mode: "demo", raw: booking } : null;
  }

  async function patchIntakeStatus(id, intakeStatus, extraPayload = {}, stageStatus = null) {
    if (db.dbAvailable) {
      const result = await db.query(
        `UPDATE bookings
         SET stage_status = COALESCE($3, stage_status),
             payload = COALESCE(payload, '{}'::jsonb) || $2::jsonb
         WHERE id = $1
         RETURNING *`,
        [id, JSON.stringify({ intakeStatus, stageStatus: stageStatus || intakeStatus, ...extraPayload }), stageStatus || intakeStatus],
      );
      return result.rows[0] ? mapBooking(result.rows[0]) : null;
    }
    const booking = (demoStore.bookings || []).find((item) => String(item.id) === String(id));
    if (!booking) return null;
    Object.assign(booking, { intakeStatus, stageStatus: stageStatus || intakeStatus, ...extraPayload });
    return booking;
  }

  async function handleWorkflowRoutes(req, res, url) {
    // ——— Intern quest workflow ———
    const questAction = url.pathname.match(/^\/api\/intern-quests\/([^/]+)\/(accept|submit|award-xp)$/);
    if (questAction && req.method === "POST") {
      const authUser = getAuthUser(req);
      if (!authUser) {
        sendJson(res, 401, { ok: false, error: "Login is required." });
        return true;
      }
      const questId = decodeURIComponent(questAction[1]);
      const action = questAction[2];
      const body = await readBody(req);
      const quest = await loadQuest(questId);
      if (!quest) {
        sendJson(res, 404, { ok: false, error: "Quest not found." });
        return true;
      }

      if (action === "accept") {
        if (!["intern", "admin", "rna"].includes(authUser.role)) {
          sendJson(res, 403, { ok: false, error: "Intern access required." });
          return true;
        }
        if (!["Open", "Assigned", "open", "assigned"].includes(String(quest.status))) {
          sendJson(res, 409, { ok: false, error: `Quest cannot be accepted from status "${quest.status}".` });
          return true;
        }
        const studentId = String(body.studentId || body.collegeId || "").trim();
        const completionEta = String(body.completionEta || body.completionTime || "").trim();
        if (studentId.length < 3) {
          sendJson(res, 400, { ok: false, error: "Student ID is required." });
          return true;
        }
        if (!COMPLETION_TIME_OPTIONS.includes(completionEta) && completionEta.length < 3) {
          sendJson(res, 400, { ok: false, error: "Select a completion time from the dropdown." });
          return true;
        }
        const updated = await saveQuest(questId, {
          status: "In Progress",
          assignedTo: String(authUser.id),
          studentId,
          completionEta,
          payload: { acceptedAt: new Date().toISOString(), acceptedBy: authUser.id },
        });
        await writeAuditLog(authUser, "quest_accepted", "intern_quest", questId, `Quest accepted by ${studentId}`, { completionEta });
        await notify({
          eventType: "quest_accepted",
          title: "Quest accepted",
          message: `${updated.title} is now In Progress (ETA: ${completionEta}).`,
          recipients: [...(await resolveRecipients([authUser.id])), ...(await resolveAdminRecipients())],
          payload: { questId, status: "In Progress" },
          sendEmail: true,
          ctaLabel: "Open quests",
          ctaUrl: portalUrl("/intern/quests"),
        });
        sendJson(res, 200, { ok: true, quest: updated, completionTimeOptions: COMPLETION_TIME_OPTIONS });
        return true;
      }

      if (action === "submit") {
        if (!["intern", "admin", "rna"].includes(authUser.role)) {
          sendJson(res, 403, { ok: false, error: "Intern access required." });
          return true;
        }
        if (!["In Progress", "in_progress"].includes(String(quest.status))) {
          sendJson(res, 409, { ok: false, error: "Only In Progress quests can be submitted for review." });
          return true;
        }
        if (quest.assignedTo && String(quest.assignedTo) !== String(authUser.id) && !canSeeAll(authUser)) {
          sendJson(res, 403, { ok: false, error: "Only the assigned intern can submit this quest." });
          return true;
        }
        const submissionUrl = String(body.submissionUrl || body.fileUrl || body.pdfUrl || "").trim();
        const submissionNotes = String(body.submissionNotes || body.notes || body.message || "").trim();
        if (!submissionUrl && submissionNotes.length < 8) {
          sendJson(res, 400, { ok: false, error: "Upload a draft PDF URL or provide research notes (min 8 chars)." });
          return true;
        }
        const updated = await saveQuest(questId, {
          status: "Submitted for Review",
          submissionUrl: submissionUrl || null,
          submissionNotes: submissionNotes || null,
          payload: { submittedAt: new Date().toISOString(), submittedBy: authUser.id },
        });
        await writeAuditLog(authUser, "quest_submitted", "intern_quest", questId, "Quest submitted for admin review", {});
        await notify({
          eventType: "quest_submitted_for_review",
          title: "Quest submitted for review",
          message: `${updated.title} is awaiting Admin XP award.`,
          recipients: await resolveAdminRecipients(),
          payload: { questId, status: "Submitted for Review" },
          sendEmail: true,
          ctaLabel: "Review quest",
          ctaUrl: portalUrl("/admin/control"),
          priority: "high",
        });
        sendJson(res, 200, { ok: true, quest: updated });
        return true;
      }

      if (action === "award-xp") {
        if (!canSeeAll(authUser)) {
          sendJson(res, 403, { ok: false, error: "Admin access required." });
          return true;
        }
        if (!["Submitted for Review", "submitted_for_review"].includes(String(quest.status))) {
          sendJson(res, 409, { ok: false, error: "Quest must be Submitted for Review before XP can be awarded." });
          return true;
        }
        const awardedXp = Number(body.awardedXp ?? body.xpPoints ?? quest.xpPoints ?? 0);
        if (!Number.isFinite(awardedXp) || awardedXp < 1) {
          sendJson(res, 400, { ok: false, error: "Awarded XP must be at least 1." });
          return true;
        }
        const updated = await saveQuest(questId, {
          status: "Completed",
          awardedXp,
          reviewedBy: String(authUser.id),
          markReviewed: true,
          payload: { xpAwardedAt: new Date().toISOString(), adminNote: body.note || null },
        });
        await writeAuditLog(authUser, "quest_xp_awarded", "intern_quest", questId, `Awarded ${awardedXp} XP`, { awardedXp });
        await notify({
          eventType: "quest_xp_awarded",
          title: "Quest completed — XP awarded",
          message: `${updated.title}: +${awardedXp} XP credited to your intern profile.`,
          recipients: await resolveRecipients([updated.assignedTo].filter(Boolean)),
          payload: { questId, awardedXp, status: "Completed" },
          sendEmail: true,
          sendSms: true,
          ctaLabel: "View XP",
          ctaUrl: portalUrl("/intern/xp"),
          priority: "high",
        });
        sendJson(res, 200, { ok: true, quest: updated, awardedXp });
        return true;
      }
    }

    if (url.pathname === "/api/intern-quests/meta" && req.method === "GET") {
      sendJson(res, 200, {
        ok: true,
        statuses: ["Open", "Assigned", "In Progress", "Submitted for Review", "Completed"],
        completionTimeOptions: COMPLETION_TIME_OPTIONS,
      });
      return true;
    }

    // ——— ProxyHub admin review / query / counsel accept ———
    const proxyAdminAction = url.pathname.match(/^\/api\/tasks\/([^/]+)\/(admin-approve|raise-query|respond-query)$/);
    if (proxyAdminAction && req.method === "POST") {
      const authUser = getAuthUser(req);
      if (!authUser) {
        sendJson(res, 401, { ok: false, error: "Login is required." });
        return true;
      }
      const taskId = proxyAdminAction[1];
      const action = proxyAdminAction[2];
      const body = await readBody(req);
      const task = await loadTask(taskId);
      if (!task) {
        sendJson(res, 404, { ok: false, error: "Task not found." });
        return true;
      }

      if (action === "admin-approve") {
        if (!canSeeAll(authUser)) {
          sendJson(res, 403, { ok: false, error: "Admin access required." });
          return true;
        }
        if (!["pending_admin_review", "query_raised", "Awaiting Admin Assignment"].includes(String(task.status))) {
          sendJson(res, 409, { ok: false, error: `Cannot approve marketplace listing from "${task.status}".` });
          return true;
        }
        const updated = await patchTask(taskId, {
          status: "Open",
          payload: {
            workflowStatus: "Open",
            adminApprovedAt: new Date().toISOString(),
            adminApprovedBy: authUser.id,
            marketplaceLive: true,
          },
        });
        await writeAuditLog(authUser, "proxy_admin_approved", "task", taskId, "Proxy task approved for live marketplace", {});
        await notify({
          eventType: "proxy_marketplace_open",
          title: "Proxy mission live on marketplace",
          message: `${updated.title || "Proxy mission"} is Open for counsel acceptance.`,
          recipients: [...(await resolveRecipients([updated.postedBy].filter(Boolean))), ...(await resolveAdminRecipients())],
          payload: { taskId, status: "Open" },
          sendEmail: true,
          ctaLabel: "Open ProxyHub",
          ctaUrl: portalUrl("/advocate/proxy"),
        });
        sendJson(res, 200, { ok: true, task: updated });
        return true;
      }

      if (action === "raise-query") {
        if (!canSeeAll(authUser)) {
          sendJson(res, 403, { ok: false, error: "Admin access required." });
          return true;
        }
        const query = String(body.query || body.message || body.note || "").trim();
        if (query.length < 8) {
          sendJson(res, 400, { ok: false, error: "Admin query must be at least 8 characters." });
          return true;
        }
        const updated = await patchTask(taskId, {
          status: "query_raised",
          payload: {
            workflowStatus: "query_raised",
            adminQuery: query,
            queryRaisedAt: new Date().toISOString(),
            queryRaisedBy: authUser.id,
          },
        });
        await writeAuditLog(authUser, "proxy_query_raised", "task", taskId, query, {});
        await notify({
          eventType: "proxy_query_raised",
          title: "Admin query on proxy mission",
          message: query,
          recipients: await resolveRecipients([updated.postedBy].filter(Boolean)),
          payload: { taskId, status: "query_raised", query },
          sendEmail: true,
          sendSms: true,
          ctaLabel: "Update posting",
          ctaUrl: portalUrl("/advocate/proxy"),
          priority: "high",
        });
        sendJson(res, 200, { ok: true, task: updated });
        return true;
      }

      if (action === "respond-query") {
        const isPoster = String(task.postedBy || "") === String(authUser.id);
        if (!isPoster && !canSeeAll(authUser)) {
          sendJson(res, 403, { ok: false, error: "Only the posting advocate can respond to the admin query." });
          return true;
        }
        if (String(task.status) !== "query_raised") {
          sendJson(res, 409, { ok: false, error: "No open admin query on this task." });
          return true;
        }
        const responseNote = String(body.response || body.message || body.note || "").trim();
        if (responseNote.length < 4) {
          sendJson(res, 400, { ok: false, error: "Provide an update for Admin before reopening." });
          return true;
        }
        const updated = await patchTask(taskId, {
          status: "Open",
          payload: {
            workflowStatus: "Open",
            posterQueryResponse: responseNote,
            queryResolvedAt: new Date().toISOString(),
            marketplaceLive: true,
          },
        });
        await writeAuditLog(authUser, "proxy_query_responded", "task", taskId, responseNote, {});
        await notify({
          eventType: "proxy_query_resolved",
          title: "Proxy mission returned to marketplace",
          message: `Poster updated the mission. Now Open for counsel acceptance.`,
          recipients: await resolveAdminRecipients(),
          payload: { taskId, status: "Open", responseNote },
          sendEmail: true,
          ctaLabel: "Open ProxyHub",
          ctaUrl: portalUrl("/advocate/proxy"),
        });
        sendJson(res, 200, { ok: true, task: updated });
        return true;
      }
    }

    const counselAccept = url.pathname.match(/^\/api\/tasks\/([^/]+)\/counsel-accept$/);
    if (counselAccept && req.method === "POST") {
      const authUser = getAuthUser(req);
      if (!authUser || !["advocate", "admin", "rna"].includes(authUser.role)) {
        sendJson(res, 403, { ok: false, error: "Advocate access required." });
        return true;
      }
      const taskId = counselAccept[1];
      const body = await readBody(req);
      const task = await loadTask(taskId);
      if (!task) {
        sendJson(res, 404, { ok: false, error: "Task not found." });
        return true;
      }
      if (!["Open", "open"].includes(String(task.status))) {
        sendJson(res, 409, { ok: false, error: "Only Open marketplace missions can be accepted by counsel." });
        return true;
      }
      if (task.acceptedBy && String(task.acceptedBy) !== String(authUser.id)) {
        sendJson(res, 409, { ok: false, error: "This mission is already accepted." });
        return true;
      }
      const enrollmentNo = String(body.enrollmentNo || body.barEnrollment || "").trim();
      const completionEta = String(body.completionEta || body.completionTime || "").trim();
      if (enrollmentNo.length < 3) {
        sendJson(res, 400, { ok: false, error: "Bar enrollment number is required." });
        return true;
      }
      if (!COMPLETION_TIME_OPTIONS.includes(completionEta) && completionEta.length < 3) {
        sendJson(res, 400, { ok: false, error: "Select an estimated completion time." });
        return true;
      }
      const updated = await patchTask(taskId, {
        status: "Accepted",
        acceptedBy: String(authUser.id),
        payload: {
          workflowStatus: "Accepted",
          assignedProxyName: authUser.name || "Proxy counsel",
          barEnrollment: enrollmentNo,
          completionEta,
          counselAcceptedAt: new Date().toISOString(),
        },
      });
      await writeAuditLog(authUser, "proxy_counsel_accepted", "task", taskId, `Counsel accepted with ${enrollmentNo}`, { completionEta });
      await notify({
        eventType: "proxy_mission_accepted",
        title: "Proxy counsel accepted mission",
        message: `${authUser.name || "Counsel"} accepted ${updated.title || "the mission"} (ETA: ${completionEta}).`,
        recipients: [...(await resolveRecipients([updated.postedBy, authUser.id].filter(Boolean))), ...(await resolveAdminRecipients())],
        payload: { taskId, status: "Accepted", enrollmentNo, completionEta },
        sendEmail: true,
        sendSms: true,
        ctaLabel: "Open ProxyHub",
        ctaUrl: portalUrl("/advocate/proxy"),
        priority: "high",
      });
      sendJson(res, 200, { ok: true, task: updated, completionTimeOptions: COMPLETION_TIME_OPTIONS });
      return true;
    }

    // ——— Client intake progression ———
    const intakeProgress = url.pathname.match(/^\/api\/admin\/intakes\/([^/]+)\/(start-review|conclude)$/);
    if (intakeProgress && req.method === "POST") {
      const authUser = getAuthUser(req);
      if (!authUser || !canSeeAll(authUser)) {
        sendJson(res, 403, { ok: false, error: "Admin access required." });
        return true;
      }
      const intakeId = intakeProgress[1];
      const action = intakeProgress[2];
      const body = await readBody(req);
      const intake = await loadIntake(intakeId);
      if (!intake) {
        sendJson(res, 404, { ok: false, error: "Intake not found." });
        return true;
      }
      if (action === "start-review") {
        const updated = await patchIntakeStatus(intakeId, "lc_under_review", {
          reviewStartedAt: new Date().toISOString(),
          reviewStartedBy: authUser.id,
        });
        await writeAuditLog(authUser, "intake_lc_under_review", "booking", intakeId, "LC review started", {});
        await notify({
          eventType: "intake_lc_under_review",
          title: "Legal Connect is reviewing your intake",
          message: "Your matter is under LC Admin review. We will assign Bar-verified counsel shortly.",
          recipients: await resolveRecipients([intake.userId || intake.user_id].filter(Boolean)),
          payload: { intakeId, intakeStatus: "lc_under_review" },
          sendEmail: true,
          ctaLabel: "Track case",
          ctaUrl: portalUrl("/client"),
        });
        sendJson(res, 200, { ok: true, action, intake: updated });
        return true;
      }
      if (action === "conclude") {
        const note = String(body.note || body.message || "Matter concluded by Legal Connect.").trim();
        const updated = await patchIntakeStatus(intakeId, "concluded", {
          concludedAt: new Date().toISOString(),
          concludedBy: authUser.id,
          conclusionNote: note,
          work_hold_status: "released",
          ratingUnlocked: true,
        }, "concluded");
        if (db.dbAvailable) {
          await db.query(
            `UPDATE bookings SET work_hold_status = 'released' WHERE id = $1`,
            [intakeId],
          ).catch(() => undefined);
          const linked = await db.query(
            `SELECT id FROM cases WHERE payload->>'bookingId' = $1 ORDER BY created_at DESC LIMIT 1`,
            [String(intakeId)],
          ).catch(() => ({ rows: [] }));
          if (linked.rows[0]) {
            await db.query(
              `UPDATE cases SET status = 'Closed', payload = COALESCE(payload, '{}'::jsonb) || $2::jsonb, updated_at = now() WHERE id = $1`,
              [linked.rows[0].id, JSON.stringify({ stage: "concluded", ratingUnlocked: true, conclusionNote: note })],
            ).catch(() => undefined);
          }
        }
        await writeAuditLog(authUser, "intake_concluded", "booking", intakeId, note, {});
        await notify({
          eventType: "intake_concluded",
          title: "Matter concluded",
          message: `${note} Escrow released and rating unlocked.`,
          recipients: await resolveRecipients([
            intake.userId || intake.user_id,
            intake.assignedAdvocateId,
          ].filter(Boolean)),
          payload: { intakeId, intakeStatus: "concluded" },
          sendEmail: true,
          sendSms: true,
          ctaLabel: "Rate counsel",
          ctaUrl: portalUrl("/client"),
          priority: "high",
        });
        sendJson(res, 200, { ok: true, action, intake: updated });
        return true;
      }
    }

    const advocateAcceptIntake = url.pathname.match(/^\/api\/intakes\/([^/]+)\/advocate-accept$/);
    if (advocateAcceptIntake && req.method === "POST") {
      const authUser = getAuthUser(req);
      if (!authUser || !["advocate", "admin", "rna"].includes(authUser.role)) {
        sendJson(res, 403, { ok: false, error: "Advocate access required." });
        return true;
      }
      const intakeId = advocateAcceptIntake[1];
      const body = await readBody(req);
      const intake = await loadIntake(intakeId);
      if (!intake) {
        sendJson(res, 404, { ok: false, error: "Intake not found." });
        return true;
      }
      const status = String(intake.intakeStatus || "").toLowerCase();
      if (!["advocate_assigned", "assigned", "acknowledged_and_assigned"].includes(status)) {
        sendJson(res, 409, { ok: false, error: "Intake is not awaiting advocate acceptance." });
        return true;
      }
      const assignedId = intake.assignedAdvocateId || intake.raw?.assigned_advocate_id;
      if (assignedId && String(assignedId) !== String(authUser.id) && !canSeeAll(authUser)) {
        sendJson(res, 403, { ok: false, error: "Only the assigned advocate can accept this matter." });
        return true;
      }
      const note = String(body.note || body.message || "").trim();
      const updated = await patchIntakeStatus(intakeId, "advocate_accepted", {
        advocateAcceptedAt: new Date().toISOString(),
        advocateAcceptedBy: authUser.id,
        workPhase: "work_in_progress",
        acceptanceNote: note || null,
      }, "work_in_progress");
      if (db.dbAvailable) {
        const linked = await db.query(
          `SELECT id FROM cases WHERE payload->>'bookingId' = $1 ORDER BY created_at DESC LIMIT 1`,
          [String(intakeId)],
        ).catch(() => ({ rows: [] }));
        if (linked.rows[0]) {
          await db.query(
            `UPDATE cases SET status = 'Active', payload = COALESCE(payload, '{}'::jsonb) || $2::jsonb, updated_at = now() WHERE id = $1`,
            [linked.rows[0].id, JSON.stringify({ stage: "work_in_progress", intakeStatus: "advocate_accepted" })],
          ).catch(() => undefined);
        }
      }
      await writeAuditLog(authUser, "intake_advocate_accepted", "booking", intakeId, "Advocate accepted assigned matter", {});
      await notify({
        eventType: "intake_advocate_accepted",
        title: "Counsel accepted your matter",
        message: `${authUser.name || "Your advocate"} has accepted the engagement and work is in progress.`,
        recipients: [...(await resolveRecipients([intake.userId || intake.user_id].filter(Boolean))), ...(await resolveAdminRecipients())],
        payload: { intakeId, intakeStatus: "advocate_accepted", workPhase: "work_in_progress" },
        sendEmail: true,
        sendSms: true,
        ctaLabel: "Open case tracker",
        ctaUrl: portalUrl("/client"),
        priority: "high",
      });
      sendJson(res, 200, { ok: true, intake: updated, workPhase: "work_in_progress" });
      return true;
    }

    if (url.pathname === "/api/workflows/meta" && req.method === "GET") {
      sendJson(res, 200, {
        ok: true,
        internQuest: {
          statuses: ["Open", "Assigned", "In Progress", "Submitted for Review", "Completed"],
          completionTimeOptions: COMPLETION_TIME_OPTIONS,
        },
        proxyHub: {
          statuses: ["pending_admin_review", "query_raised", "Open", "Accepted", "Proof Uploaded", "Completed"],
          completionTimeOptions: COMPLETION_TIME_OPTIONS,
        },
        clientIntake: {
          statuses: ["draft", "intake_submitted", "lc_under_review", "advocate_assigned", "advocate_accepted", "work_in_progress", "concluded", "closed"],
        },
      });
      return true;
    }

    return false;
  }

  return {
    handleWorkflowRoutes,
    COMPLETION_TIME_OPTIONS,
    PROXY_MARKETPLACE_STATUSES,
  };
}

module.exports = { createWorkflowProgressions, COMPLETION_TIME_OPTIONS };
