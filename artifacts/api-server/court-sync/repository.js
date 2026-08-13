/**
 * Persistence for Verified Court Updates.
 */

const { encryptText, decryptText } = require("../security");

function createCourtSyncRepository({ db }) {
  let schemaReady = false;
  const memory = {
    tracked: [],
    snapshots: [],
    events: [],
    documents: [],
    syncRuns: [],
    syncAttempts: [],
    changeEvents: [],
  };

  async function ensureSchema() {
    if (!db?.dbAvailable) return false;
    if (schemaReady) return true;

    await db.query(`
      CREATE TABLE IF NOT EXISTS tracked_court_cases (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        workspace_id text,
        created_by uuid REFERENCES users(id) ON DELETE SET NULL,
        linked_matter_id uuid,
        court_level text NOT NULL DEFAULT 'district',
        cnr_normalized text,
        case_number text,
        case_type text,
        case_year integer,
        diary_number text,
        diary_year integer,
        state_code text,
        district_code text,
        court_code text,
        bench_code text,
        provider text NOT NULL,
        provider_case_id text NOT NULL,
        tracking_status text NOT NULL DEFAULT 'active',
        last_sync_status text,
        last_attempt_at timestamptz,
        last_success_at timestamptz,
        next_sync_at timestamptz,
        consecutive_failures integer NOT NULL DEFAULT 0,
        source_url text,
        viewer_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
        title text,
        court_name text,
        latest_snapshot jsonb,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      )
    `);
    await db.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS tracked_court_cases_cnr_owner_uidx
      ON tracked_court_cases (created_by, cnr_normalized)
      WHERE cnr_normalized IS NOT NULL AND created_by IS NOT NULL
    `);
    await db.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS tracked_court_cases_provider_owner_uidx
      ON tracked_court_cases (created_by, provider, provider_case_id)
      WHERE created_by IS NOT NULL
    `);
    await db.query(`CREATE INDEX IF NOT EXISTS tracked_court_cases_next_sync_idx ON tracked_court_cases (tracking_status, next_sync_at NULLS FIRST)`);

    await db.query(`
      CREATE TABLE IF NOT EXISTS court_case_snapshots (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        case_id uuid NOT NULL REFERENCES tracked_court_cases(id) ON DELETE CASCADE,
        source_fetched_at timestamptz NOT NULL DEFAULT now(),
        source_updated_at timestamptz,
        payload_hash text NOT NULL,
        normalized jsonb NOT NULL DEFAULT '{}'::jsonb,
        raw_ciphertext text,
        provider_version text,
        created_at timestamptz DEFAULT now()
      )
    `);
    await db.query(`CREATE INDEX IF NOT EXISTS court_case_snapshots_case_idx ON court_case_snapshots (case_id, created_at DESC)`);
    await db.query(`CREATE UNIQUE INDEX IF NOT EXISTS court_case_snapshots_hash_uidx ON court_case_snapshots (case_id, payload_hash)`);

    await db.query(`
      CREATE TABLE IF NOT EXISTS court_events (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        case_id uuid NOT NULL REFERENCES tracked_court_cases(id) ON DELETE CASCADE,
        event_type text NOT NULL,
        event_date date,
        purpose text,
        stage text,
        court_number text,
        judge_or_bench text,
        cause_list_item_number text,
        source_reference text,
        first_seen_at timestamptz DEFAULT now(),
        last_seen_at timestamptz DEFAULT now(),
        payload jsonb NOT NULL DEFAULT '{}'::jsonb
      )
    `);
    await db.query(`CREATE INDEX IF NOT EXISTS court_events_case_idx ON court_events (case_id, event_date DESC NULLS LAST, first_seen_at DESC)`);

    await db.query(`
      CREATE TABLE IF NOT EXISTS court_documents (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        case_id uuid NOT NULL REFERENCES tracked_court_cases(id) ON DELETE CASCADE,
        provider_document_id text,
        title text,
        document_date date,
        document_type text,
        official boolean NOT NULL DEFAULT true,
        source_url text,
        checksum text,
        mime_type text,
        size_bytes bigint,
        storage_key text,
        retrieval_status text NOT NULL DEFAULT 'link_only',
        malware_scan_status text NOT NULL DEFAULT 'not_applicable',
        first_verified_at timestamptz DEFAULT now(),
        last_verified_at timestamptz DEFAULT now(),
        created_at timestamptz DEFAULT now()
      )
    `);
    await db.query(`CREATE INDEX IF NOT EXISTS court_documents_case_idx ON court_documents (case_id, document_date DESC NULLS LAST)`);

    await db.query(`
      CREATE TABLE IF NOT EXISTS court_sync_runs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        trigger text NOT NULL DEFAULT 'schedule',
        status text NOT NULL DEFAULT 'running',
        started_at timestamptz DEFAULT now(),
        finished_at timestamptz,
        cases_claimed integer DEFAULT 0,
        cases_succeeded integer DEFAULT 0,
        cases_failed integer DEFAULT 0,
        detail jsonb NOT NULL DEFAULT '{}'::jsonb
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS court_sync_attempts (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        run_id uuid REFERENCES court_sync_runs(id) ON DELETE SET NULL,
        case_id uuid REFERENCES tracked_court_cases(id) ON DELETE CASCADE,
        provider text,
        status text NOT NULL,
        latency_ms integer,
        error_category text,
        detail jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz DEFAULT now()
      )
    `);
    await db.query(`CREATE INDEX IF NOT EXISTS court_sync_attempts_case_idx ON court_sync_attempts (case_id, created_at DESC)`);

    await db.query(`
      CREATE TABLE IF NOT EXISTS court_change_events (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        case_id uuid NOT NULL REFERENCES tracked_court_cases(id) ON DELETE CASCADE,
        event_type text NOT NULL,
        severity text NOT NULL DEFAULT 'medium',
        summary text,
        old_value text,
        new_value text,
        evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
        notified boolean NOT NULL DEFAULT false,
        created_at timestamptz DEFAULT now()
      )
    `);
    await db.query(`CREATE INDEX IF NOT EXISTS court_change_events_case_idx ON court_change_events (case_id, created_at DESC)`);

    schemaReady = true;
    return true;
  }

  function mapTracked(row) {
    if (!row) return null;
    return {
      id: row.id,
      workspaceId: row.workspace_id || null,
      createdBy: row.created_by,
      linkedMatterId: row.linked_matter_id,
      courtLevel: row.court_level,
      cnr: row.cnr_normalized,
      caseNumber: row.case_number,
      caseType: row.case_type,
      caseYear: row.case_year,
      diaryNumber: row.diary_number,
      diaryYear: row.diary_year,
      stateCode: row.state_code,
      districtCode: row.district_code,
      courtCode: row.court_code,
      benchCode: row.bench_code,
      provider: row.provider,
      providerCaseId: row.provider_case_id,
      trackingStatus: row.tracking_status,
      lastSyncStatus: row.last_sync_status,
      lastAttemptAt: row.last_attempt_at,
      lastSuccessAt: row.last_success_at,
      nextSyncAt: row.next_sync_at,
      consecutiveFailures: row.consecutive_failures,
      sourceUrl: row.source_url,
      viewerIds: row.viewer_ids || [],
      title: row.title,
      courtName: row.court_name,
      latestSnapshot: row.latest_snapshot,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async function findTrackedById(id) {
    await ensureSchema();
    if (db?.dbAvailable) {
      const result = await db.query("SELECT * FROM tracked_court_cases WHERE id = $1 LIMIT 1", [id]);
      return mapTracked(result.rows[0]);
    }
    return memory.tracked.find((item) => String(item.id) === String(id)) || null;
  }

  async function findTrackedByOwnerCnr(userId, cnr) {
    await ensureSchema();
    if (db?.dbAvailable) {
      const result = await db.query(
        "SELECT * FROM tracked_court_cases WHERE created_by = $1 AND cnr_normalized = $2 LIMIT 1",
        [userId, cnr],
      );
      return mapTracked(result.rows[0]);
    }
    return memory.tracked.find((item) => String(item.createdBy) === String(userId) && item.cnr === cnr) || null;
  }

  async function listTrackedForUser(user, { canSeeAllUsers = false } = {}) {
    await ensureSchema();
    if (db?.dbAvailable) {
      const result = canSeeAllUsers
        ? await db.query("SELECT * FROM tracked_court_cases ORDER BY updated_at DESC LIMIT 200")
        : await db.query(
          `SELECT * FROM tracked_court_cases
           WHERE created_by = $1 OR viewer_ids ? $1::text
           ORDER BY updated_at DESC LIMIT 200`,
          [user.id],
        );
      return result.rows.map(mapTracked);
    }
    return memory.tracked
      .filter((item) => canSeeAllUsers || String(item.createdBy) === String(user.id) || (item.viewerIds || []).includes(String(user.id)))
      .slice(0, 200);
  }

  async function upsertTracked({ user, snapshot, linkedMatterId = null, confirmLink = false }) {
    await ensureSchema();
    const existing = await findTrackedByOwnerCnr(user.id, snapshot.cnr);
    if (existing) {
      return { tracked: existing, created: false };
    }

    const nextSyncAt = new Date(Date.now() + 12 * 3600 * 1000).toISOString();
    if (db?.dbAvailable) {
      const result = await db.query(
        `INSERT INTO tracked_court_cases (
           workspace_id, created_by, linked_matter_id, court_level, cnr_normalized, case_number, case_type, case_year,
           state_code, district_code, provider, provider_case_id, tracking_status, last_sync_status,
           last_attempt_at, last_success_at, next_sync_at, source_url, title, court_name, latest_snapshot, viewer_ids
         ) VALUES (
           $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'active','success', now(), now(), $13, $14, $15, $16, $17::jsonb, '[]'::jsonb
         ) RETURNING *`,
        [
          user.chamberId || user.id,
          user.id,
          confirmLink ? linkedMatterId : null,
          snapshot.courtLevel || "district",
          snapshot.cnr,
          snapshot.caseNumber || null,
          snapshot.caseType || null,
          snapshot.caseYear || null,
          snapshot.stateCode || null,
          snapshot.districtCode || null,
          snapshot.provider,
          snapshot.providerCaseId,
          nextSyncAt,
          snapshot.sourceUrl || null,
          snapshot.caseNumber || snapshot.cnr,
          snapshot.courtName || null,
          JSON.stringify(snapshot),
        ],
      );
      return { tracked: mapTracked(result.rows[0]), created: true };
    }

    const tracked = {
      id: `tracked-${Date.now()}`,
      workspaceId: user.chamberId || user.id,
      createdBy: user.id,
      linkedMatterId: confirmLink ? linkedMatterId : null,
      courtLevel: snapshot.courtLevel || "district",
      cnr: snapshot.cnr,
      caseNumber: snapshot.caseNumber || null,
      caseType: snapshot.caseType || null,
      caseYear: snapshot.caseYear || null,
      stateCode: snapshot.stateCode || null,
      districtCode: snapshot.districtCode || null,
      provider: snapshot.provider,
      providerCaseId: snapshot.providerCaseId,
      trackingStatus: "active",
      lastSyncStatus: "success",
      lastAttemptAt: new Date().toISOString(),
      lastSuccessAt: new Date().toISOString(),
      nextSyncAt,
      consecutiveFailures: 0,
      sourceUrl: snapshot.sourceUrl || null,
      title: snapshot.caseNumber || snapshot.cnr,
      courtName: snapshot.courtName || null,
      latestSnapshot: snapshot,
      viewerIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    memory.tracked.unshift(tracked);
    return { tracked, created: true };
  }

  async function saveSnapshot(caseId, snapshot, { encryptRaw = true } = {}) {
    await ensureSchema();
    const hash = snapshot.payloadHash;
    let rawCipher = null;
    if (encryptRaw) {
      try {
        const encrypted = encryptText(JSON.stringify(snapshot));
        rawCipher = typeof encrypted === "string" ? encrypted : encrypted?.ciphertext || null;
      } catch {
        rawCipher = null;
      }
    }

    if (db?.dbAvailable) {
      const existing = await db.query(
        "SELECT id FROM court_case_snapshots WHERE case_id = $1 AND payload_hash = $2 LIMIT 1",
        [caseId, hash],
      );
      if (existing.rows[0]) {
        const nextSyncAt = computeNextSyncAt(snapshot);
        await db.query(
          `UPDATE tracked_court_cases
           SET last_sync_status = 'success', last_attempt_at = now(), last_success_at = now(),
               consecutive_failures = 0, next_sync_at = $2, latest_snapshot = $3::jsonb,
               source_url = COALESCE($4, source_url), court_name = COALESCE($5, court_name),
               updated_at = now()
           WHERE id = $1`,
          [caseId, nextSyncAt, JSON.stringify(snapshot), snapshot.sourceUrl || null, snapshot.courtName || null],
        );
        return { snapshotId: existing.rows[0].id, created: false };
      }
      const inserted = await db.query(
        `INSERT INTO court_case_snapshots (case_id, source_fetched_at, payload_hash, normalized, raw_ciphertext, provider_version)
         VALUES ($1, $2, $3, $4::jsonb, $5, $6) RETURNING id`,
        [caseId, snapshot.sourceFetchedAt || new Date().toISOString(), hash, JSON.stringify(snapshot), rawCipher, snapshot.provider || "unknown"],
      );
      await db.query(
        `UPDATE tracked_court_cases
         SET last_sync_status = 'success', last_attempt_at = now(), last_success_at = now(),
             consecutive_failures = 0, next_sync_at = $2, latest_snapshot = $3::jsonb,
             source_url = COALESCE($4, source_url), court_name = COALESCE($5, court_name),
             case_number = COALESCE($6, case_number), updated_at = now()
         WHERE id = $1`,
        [
          caseId,
          computeNextSyncAt(snapshot),
          JSON.stringify(snapshot),
          snapshot.sourceUrl || null,
          snapshot.courtName || null,
          snapshot.caseNumber || null,
        ],
      );
      return { snapshotId: inserted.rows[0].id, created: true };
    }

    const prior = memory.snapshots.find((item) => item.caseId === caseId && item.payloadHash === hash);
    if (prior) return { snapshotId: prior.id, created: false };
    const row = {
      id: `snap-${Date.now()}`,
      caseId,
      payloadHash: hash,
      normalized: snapshot,
      createdAt: new Date().toISOString(),
    };
    memory.snapshots.unshift(row);
    const tracked = memory.tracked.find((item) => item.id === caseId);
    if (tracked) {
      tracked.latestSnapshot = snapshot;
      tracked.lastSyncStatus = "success";
      tracked.lastSuccessAt = new Date().toISOString();
      tracked.lastAttemptAt = tracked.lastSuccessAt;
      tracked.consecutiveFailures = 0;
      tracked.nextSyncAt = computeNextSyncAt(snapshot);
      tracked.updatedAt = tracked.lastSuccessAt;
    }
    return { snapshotId: row.id, created: true };
  }

  async function insertChangeEvents(caseId, changes, evidence = {}) {
    await ensureSchema();
    if (!changes.length) return [];
    if (db?.dbAvailable) {
      const saved = [];
      for (const change of changes) {
        const result = await db.query(
          `INSERT INTO court_change_events (case_id, event_type, severity, summary, old_value, new_value, evidence)
           VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb) RETURNING *`,
          [
            caseId,
            change.eventType,
            change.severity || "medium",
            change.summary || null,
            change.oldValue == null ? null : String(change.oldValue),
            change.newValue == null ? null : String(change.newValue),
            JSON.stringify({ ...evidence, order: change.order || null }),
          ],
        );
        saved.push(result.rows[0]);
      }
      return saved;
    }
    const rows = changes.map((change, index) => ({
      id: `chg-${Date.now()}-${index}`,
      caseId,
      eventType: change.eventType,
      severity: change.severity || "medium",
      summary: change.summary,
      oldValue: change.oldValue,
      newValue: change.newValue,
      createdAt: new Date().toISOString(),
    }));
    memory.changeEvents.unshift(...rows);
    return rows;
  }

  async function upsertDocuments(caseId, orders = []) {
    await ensureSchema();
    if (!orders.length) return [];
    if (db?.dbAvailable) {
      const saved = [];
      for (const order of orders) {
        const result = await db.query(
          `INSERT INTO court_documents (
             case_id, provider_document_id, title, document_date, document_type, official, source_url, retrieval_status
           ) VALUES ($1,$2,$3,$4,$5,$6,$7,'link_only')
           ON CONFLICT DO NOTHING
           RETURNING *`,
          [
            caseId,
            order.id || null,
            order.title || "Court order",
            order.documentDate || null,
            order.documentType || "daily_order",
            order.official !== false,
            order.sourceUrl || null,
          ],
        ).catch(async () => {
          // No unique constraint on provider_document_id alone — dedupe manually.
          const existing = await db.query(
            `SELECT * FROM court_documents WHERE case_id = $1 AND COALESCE(provider_document_id, source_url, title) = $2 LIMIT 1`,
            [caseId, order.id || order.sourceUrl || order.title],
          );
          if (existing.rows[0]) return existing;
          return db.query(
            `INSERT INTO court_documents (
               case_id, provider_document_id, title, document_date, document_type, official, source_url, retrieval_status
             ) VALUES ($1,$2,$3,$4,$5,$6,$7,'link_only') RETURNING *`,
            [
              caseId,
              order.id || null,
              order.title || "Court order",
              order.documentDate || null,
              order.documentType || "daily_order",
              order.official !== false,
              order.sourceUrl || null,
            ],
          );
        });
        if (result.rows?.[0]) saved.push(result.rows[0]);
      }
      return saved;
    }
    const rows = orders.map((order, index) => ({
      id: `doc-${Date.now()}-${index}`,
      caseId,
      ...order,
      retrievalStatus: "link_only",
    }));
    memory.documents.unshift(...rows);
    return rows;
  }

  async function listEvents(caseId) {
    await ensureSchema();
    if (db?.dbAvailable) {
      const result = await db.query(
        "SELECT * FROM court_change_events WHERE case_id = $1 ORDER BY created_at DESC LIMIT 100",
        [caseId],
      );
      return result.rows;
    }
    return memory.changeEvents.filter((item) => item.caseId === caseId).slice(0, 100);
  }

  async function listOrders(caseId) {
    await ensureSchema();
    if (db?.dbAvailable) {
      const result = await db.query(
        "SELECT * FROM court_documents WHERE case_id = $1 ORDER BY document_date DESC NULLS LAST, created_at DESC LIMIT 100",
        [caseId],
      );
      return result.rows;
    }
    return memory.documents.filter((item) => item.caseId === caseId).slice(0, 100);
  }

  async function markSyncFailure(caseId, category) {
    await ensureSchema();
    if (db?.dbAvailable) {
      await db.query(
        `UPDATE tracked_court_cases
         SET last_sync_status = 'failed', last_attempt_at = now(),
             consecutive_failures = consecutive_failures + 1,
             next_sync_at = now() + interval '6 hours',
             updated_at = now()
         WHERE id = $1`,
        [caseId],
      );
      return;
    }
    const tracked = memory.tracked.find((item) => item.id === caseId);
    if (tracked) {
      tracked.lastSyncStatus = "failed";
      tracked.lastAttemptAt = new Date().toISOString();
      tracked.consecutiveFailures = (tracked.consecutiveFailures || 0) + 1;
      tracked.nextSyncAt = new Date(Date.now() + 6 * 3600 * 1000).toISOString();
      tracked.lastErrorCategory = category;
    }
  }

  async function claimDueCases(limit = 25) {
    await ensureSchema();
    if (db?.dbAvailable) {
      const result = await db.query(
        `SELECT * FROM tracked_court_cases
         WHERE tracking_status = 'active'
           AND (next_sync_at IS NULL OR next_sync_at <= now())
         ORDER BY next_sync_at NULLS FIRST
         LIMIT $1
         FOR UPDATE SKIP LOCKED`,
        [limit],
      ).catch(async () => db.query(
        `SELECT * FROM tracked_court_cases
         WHERE tracking_status = 'active'
           AND (next_sync_at IS NULL OR next_sync_at <= now())
         ORDER BY next_sync_at NULLS FIRST
         LIMIT $1`,
        [limit],
      ));
      return result.rows.map(mapTracked);
    }
    const now = Date.now();
    return memory.tracked
      .filter((item) => item.trackingStatus === "active" && (!item.nextSyncAt || new Date(item.nextSyncAt).getTime() <= now))
      .slice(0, limit);
  }

  async function stopTracking(caseId) {
    await ensureSchema();
    if (db?.dbAvailable) {
      await db.query(
        `UPDATE tracked_court_cases SET tracking_status = 'paused', next_sync_at = NULL, updated_at = now() WHERE id = $1`,
        [caseId],
      );
      return findTrackedById(caseId);
    }
    const tracked = memory.tracked.find((item) => item.id === caseId);
    if (tracked) {
      tracked.trackingStatus = "paused";
      tracked.nextSyncAt = null;
    }
    return tracked || null;
  }

  function computeNextSyncAt(snapshot = {}) {
    const now = Date.now();
    if (/dispos|closed|dismiss/i.test(String(snapshot.status || ""))) {
      return new Date(now + 7 * 24 * 3600 * 1000).toISOString();
    }
    const hearing = snapshot.nextHearingDate ? Date.parse(String(snapshot.nextHearingDate).slice(0, 10)) : NaN;
    if (Number.isFinite(hearing)) {
      const days = (hearing - now) / (24 * 3600 * 1000);
      if (days <= 1) return new Date(now + 45 * 60 * 1000).toISOString();
      if (days <= 7) return new Date(now + 4 * 3600 * 1000).toISOString();
    }
    return new Date(now + 12 * 3600 * 1000).toISOString();
  }

  async function updateTracked(caseId, patch = {}) {
    await ensureSchema();
    if (db?.dbAvailable) {
      const fields = [];
      const values = [caseId];
      const map = {
        trackingStatus: "tracking_status",
        lastSyncStatus: "last_sync_status",
        lastAttemptAt: "last_attempt_at",
        lastSuccessAt: "last_success_at",
        nextSyncAt: "next_sync_at",
        consecutiveFailures: "consecutive_failures",
        sourceUrl: "source_url",
        linkedMatterId: "linked_matter_id",
        workspaceId: "workspace_id",
      };
      for (const [key, column] of Object.entries(map)) {
        if (patch[key] !== undefined) {
          values.push(patch[key]);
          fields.push(`${column} = $${values.length}`);
        }
      }
      if (!fields.length) return findTrackedById(caseId);
      fields.push("updated_at = now()");
      const result = await db.query(
        `UPDATE tracked_court_cases SET ${fields.join(", ")} WHERE id = $1 RETURNING *`,
        values,
      );
      return mapTracked(result.rows[0]);
    }
    const tracked = memory.tracked.find((item) => item.id === caseId);
    if (!tracked) return null;
    Object.assign(tracked, patch, { updatedAt: new Date().toISOString() });
    return tracked;
  }

  async function upsertHearingEvents(caseId, events = []) {
    await ensureSchema();
    if (!events.length) return [];
    if (db?.dbAvailable) {
      const saved = [];
      for (const event of events) {
        const existing = await db.query(
          `SELECT * FROM court_events
           WHERE case_id = $1 AND event_type = $2
             AND COALESCE(event_date::text, '') = COALESCE($3::text, '')
             AND COALESCE(purpose, '') = COALESCE($4, '')
           LIMIT 1`,
          [caseId, event.eventType || "hearing", event.eventDate || null, event.purpose || null],
        );
        if (existing.rows[0]) {
          const updated = await db.query(
            `UPDATE court_events SET last_seen_at = now(), stage = COALESCE($2, stage),
             court_number = COALESCE($3, court_number), judge_or_bench = COALESCE($4, judge_or_bench),
             cause_list_item_number = COALESCE($5, cause_list_item_number)
             WHERE id = $1 RETURNING *`,
            [existing.rows[0].id, event.stage || null, event.courtNumber || null, event.judgeOrBench || null, event.causeListItemNumber || null],
          );
          saved.push(updated.rows[0]);
          continue;
        }
        const inserted = await db.query(
          `INSERT INTO court_events (
             case_id, event_type, event_date, purpose, stage, court_number, judge_or_bench,
             cause_list_item_number, source_reference, payload
           ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb) RETURNING *`,
          [
            caseId,
            event.eventType || "hearing",
            event.eventDate || null,
            event.purpose || null,
            event.stage || null,
            event.courtNumber || null,
            event.judgeOrBench || null,
            event.causeListItemNumber || null,
            event.sourceReference || null,
            JSON.stringify(event),
          ],
        );
        saved.push(inserted.rows[0]);
      }
      return saved;
    }
    const rows = events.map((event, index) => ({
      id: `hev-${Date.now()}-${index}`,
      caseId,
      ...event,
      firstSeenAt: new Date().toISOString(),
      lastSeenAt: new Date().toISOString(),
    }));
    memory.events.unshift(...rows);
    return rows;
  }

  async function listHearingEvents(caseId) {
    await ensureSchema();
    if (db?.dbAvailable) {
      const result = await db.query(
        "SELECT * FROM court_events WHERE case_id = $1 ORDER BY event_date DESC NULLS LAST, first_seen_at DESC LIMIT 100",
        [caseId],
      );
      return result.rows;
    }
    return memory.events.filter((item) => item.caseId === caseId).slice(0, 100);
  }

  async function findOrderById(orderId) {
    await ensureSchema();
    if (db?.dbAvailable) {
      const result = await db.query(
        `SELECT d.*, c.created_by, c.workspace_id, c.linked_matter_id, c.viewer_ids
         FROM court_documents d
         JOIN tracked_court_cases c ON c.id = d.case_id
         WHERE d.id = $1 LIMIT 1`,
        [orderId],
      );
      return result.rows[0] || null;
    }
    const doc = memory.documents.find((item) => String(item.id) === String(orderId));
    if (!doc) return null;
    const tracked = memory.tracked.find((item) => item.id === doc.caseId);
    return tracked ? { ...doc, created_by: tracked.createdBy, workspace_id: tracked.workspaceId, linked_matter_id: tracked.linkedMatterId, viewer_ids: tracked.viewerIds } : doc;
  }

  async function recordSyncAttempt(runId, caseId, attempt = {}) {
    await ensureSchema();
    if (db?.dbAvailable) {
      await db.query(
        `INSERT INTO court_sync_attempts (run_id, case_id, provider, status, latency_ms, error_category, detail)
         VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb)`,
        [
          runId || null,
          caseId,
          attempt.provider || null,
          attempt.status || (attempt.success ? "success" : "failed"),
          attempt.latencyMs || null,
          attempt.errorCategory || null,
          JSON.stringify({
            sanitizedError: attempt.sanitizedError || null,
            retryCount: attempt.retryCount || 0,
            providerResponseCode: attempt.providerResponseCode || null,
          }),
        ],
      );
      return;
    }
    memory.syncAttempts.unshift({ id: `att-${Date.now()}`, runId, caseId, ...attempt });
  }

  async function createSyncRun(trigger = "schedule") {
    await ensureSchema();
    if (db?.dbAvailable) {
      const result = await db.query(
        `INSERT INTO court_sync_runs (trigger, status) VALUES ($1, 'running') RETURNING *`,
        [trigger],
      );
      return result.rows[0];
    }
    const run = { id: `run-${Date.now()}`, trigger, status: "running", started_at: new Date().toISOString() };
    memory.syncRuns.unshift(run);
    return run;
  }

  async function finishSyncRun(runId, stats = {}) {
    await ensureSchema();
    if (db?.dbAvailable) {
      await db.query(
        `UPDATE court_sync_runs
         SET status = 'completed', finished_at = now(),
             cases_claimed = $2, cases_succeeded = $3, cases_failed = $4, detail = $5::jsonb
         WHERE id = $1`,
        [runId, stats.claimed || 0, stats.succeeded || 0, stats.failed || 0, JSON.stringify(stats)],
      );
      return;
    }
    const run = memory.syncRuns.find((item) => item.id === runId);
    if (run) Object.assign(run, { status: "completed", finished_at: new Date().toISOString(), ...stats });
  }

  function tryDecryptRaw(ciphertext) {
    if (!ciphertext) return null;
    try {
      return JSON.parse(decryptText(ciphertext));
    } catch {
      return null;
    }
  }

  return {
    ensureSchema,
    findTrackedById,
    findTrackedByOwnerCnr,
    listTrackedForUser,
    upsertTracked,
    saveSnapshot,
    insertChangeEvents,
    upsertDocuments,
    listEvents,
    listOrders,
    markSyncFailure,
    claimDueCases,
    stopTracking,
    createSyncRun,
    finishSyncRun,
    tryDecryptRaw,
    computeNextSyncAt,
    updateTracked,
    upsertHearingEvents,
    listHearingEvents,
    findOrderById,
    recordSyncAttempt,
    memory,
  };
}

module.exports = { createCourtSyncRepository };
