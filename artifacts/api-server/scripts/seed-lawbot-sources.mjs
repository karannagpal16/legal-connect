#!/usr/bin/env node
/**
 * Seed approved LawBot sources + chunks via admin API.
 * Usage:
 *   BASE=https://legal-connect-7ewz.onrender.com \
 *   ADMIN_EMAIL=... ADMIN_PASSWORD=... \
 *   node artifacts/api-server/scripts/seed-lawbot-sources.mjs
 */
const BASE = (process.env.BASE || process.env.PUBLIC_APP_URL || "http://127.0.0.1:8080").replace(/\/$/, "");
const EMAIL = process.env.ADMIN_EMAIL || "karannagpal16@gmail.com";
const PASSWORD = process.env.ADMIN_PASSWORD || process.env.MASTER_TEST_PASSWORD || "Karan1605!";

const sources = [
  {
    sourceType: "bare-act",
    sourceName: "Legal Connect Source Library",
    title: "Bharatiya Nyaya Sanhita, 2023 - Section 103 murder reference",
    actName: "Bharatiya Nyaya Sanhita, 2023",
    sectionNo: "103",
    court: "Parliament of India",
    citation: "Bharatiya Nyaya Sanhita, 2023, Section 103",
    sourceUrl: "https://www.indiacode.nic.in/",
    publishedDate: "2023-12-25",
    textContent:
      "BNS Section 103 is the murder provision in the Bharatiya Nyaya Sanhita, 2023, replacing the earlier IPC murder framework. A practical answer should identify the offence, mental element, punishment range, and immediately recommend verified legal representation in serious criminal matters. Keywords: murder, culpable homicide, BNS, Bharatiya Nyaya Sanhita, section 103, criminal law, IPC replacement.",
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
      "The BNSS is the primary procedural criminal law framework replacing the Code of Criminal Procedure. A bail query should be answered as procedure-focused information: identify the offence, custody status, court forum, documents, surety, and urgency. The user should consult a verified advocate for strategy. Keywords: BNSS, bail, arrest, custody, surety, criminal procedure, CrPC replacement.",
  },
  {
    sourceType: "bare-act",
    sourceName: "Legal Connect Source Library",
    title: "Bharatiya Sakshya Adhiniyam, 2023 - evidence reliability overview",
    actName: "Bharatiya Sakshya Adhiniyam, 2023",
    court: "Parliament of India",
    citation: "BSA, 2023 evidence overview",
    sourceUrl: "https://www.indiacode.nic.in/",
    publishedDate: "2023-12-25",
    textContent:
      "The Bharatiya Sakshya Adhiniyam governs relevancy, admissibility, proof, witnesses, documents, and electronic evidence. A safe explanation should separate what a document says from whether it is admissible and proved in court. Keywords: BSA, evidence, electronic evidence, proof, witness, Evidence Act replacement.",
  },
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
      "Section 138 concerns dishonour of cheque for insufficiency of funds or similar reasons. A compliant path usually involves cheque return memo, statutory demand notice within the prescribed period, failure to pay after notice, and filing a complaint within limitation. Keywords: cheque bounce, section 138, negotiable instruments, demand notice, dishonour, limitation, insufficiency of funds.",
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
      "A consumer complaint can arise from defective goods, deficiency in services, unfair trade practice, or misleading advertisement. Practical preparation includes invoice, warranty, complaint emails, photographs, service record, loss estimate, and relief sought such as refund or replacement. Keywords: consumer, defective goods, service deficiency, refund, warranty, complaint, unfair trade practice.",
  },
  {
    sourceType: "template",
    sourceName: "Legal Connect Template Library",
    title: "Rent agreement / tenancy checklist",
    court: "Legal Connect Template Library",
    citation: "Legal Connect tenancy template",
    publishedDate: "2026-06-28",
    textContent:
      "A rent agreement should usually record landlord and tenant details, property description, rent amount, security deposit, lock-in period, maintenance responsibility, notice period, permitted use, police verification if applicable, and dispute resolution clause. Keywords: rent agreement, tenancy, landlord, tenant, security deposit, lease, lock-in, notice period.",
  },
  {
    sourceType: "case-law",
    sourceName: "Legal Connect Source Library",
    title: "Justice K.S. Puttaswamy v. Union of India - privacy as constitutional value",
    court: "Supreme Court of India",
    citation: "Justice K.S. Puttaswamy v. Union of India (2017)",
    publishedDate: "2017-08-24",
    textContent:
      "The Supreme Court treated privacy as connected to dignity, autonomy, and Article 21. Privacy is a constitutional value and any restriction must satisfy legality, legitimate aim, proportionality, and safeguards. Keywords: supreme court, privacy, Article 21, constitutional law, Puttaswamy, fundamental rights, dignity, proportionality.",
  },
  {
    sourceType: "bill-amendment",
    sourceName: "Legal Connect Source Library",
    title: "Criminal law transition - IPC/CrPC/Evidence to BNS/BNSS/BSA",
    court: "Parliament of India",
    citation: "Criminal law transition note",
    publishedDate: "2024-07-01",
    textContent:
      "India transitioned core criminal statutes from IPC, CrPC and the Evidence Act to the Bharatiya Nyaya Sanhita (BNS), Bharatiya Nagarik Suraksha Sanhita (BNSS), and Bharatiya Sakshya Adhiniyam (BSA). Practical research should cite the new codes for post-transition conduct while noting legacy references for older cases. Keywords: criminal law transition, IPC, BNS, CrPC, BNSS, Evidence Act, BSA, July 2024.",
  },
  {
    sourceType: "explainer",
    sourceName: "Legal Connect Client Explainers",
    title: "Client explainer - first steps after a legal dispute starts",
    court: "Legal Connect",
    citation: "LC client explainer",
    publishedDate: "2026-07-01",
    textContent:
      "When a legal dispute starts, preserve documents, note dates, avoid signing blank papers, do not threaten or delete evidence, and consult a verified advocate through Legal Connect. For police matters, note station details and obtain receipts for complaints. Keywords: first steps, dispute, documents, police complaint, advocate, Legal Connect intake.",
  },
  {
    sourceType: "explainer",
    sourceName: "Legal Connect Client Explainers",
    title: "Client explainer - court hearing basics",
    court: "Legal Connect",
    citation: "LC hearing explainer",
    publishedDate: "2026-07-01",
    textContent:
      "A hearing is a scheduled court appearance where the judge may take evidence, hear arguments, pass interim orders, or adjourn. Arrive early with originals and copies, follow advocate instructions, and note the next date from the order sheet. Keywords: hearing, adjournment, order sheet, next date, court, advocate.",
  },
];

async function req(method, path, { token, body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text.slice(0, 240) };
  }
  return { status: res.status, json };
}

async function main() {
  const login = await req("POST", "/api/auth/strict/login", {
    body: { email: EMAIL, password: PASSWORD, role: "admin" },
  });
  if (!login.json?.token) {
    throw new Error(`Admin login failed: ${JSON.stringify(login.json)}`);
  }
  const token = login.json.token;
  const existing = await req("GET", "/api/admin/legal-sources", { token });
  const list = Array.isArray(existing.json)
    ? existing.json
    : existing.json?.sources || existing.json?.items || [];

  let created = 0;
  for (const source of sources) {
    const already = list.find(
      (row) => String(row.title || "").toLowerCase() === source.title.toLowerCase(),
    );
    let id = already?.id;
    if (!id) {
      const createdRes = await req("POST", "/api/admin/legal-sources", {
        token,
        body: { ...source, status: "approved" },
      });
      id = createdRes.json?.id || createdRes.json?.source?.id;
      if (!id) {
        console.error("CREATE FAIL", source.title, createdRes.status, createdRes.json);
        continue;
      }
      created += 1;
    }
    await req("POST", `/api/admin/legal-sources/${id}/approve`, { token });
    const chunked = await req("POST", `/api/admin/legal-sources/${id}/chunk`, { token });
    console.log(
      `${source.title.slice(0, 52)} → ${String(id).slice(0, 8)} chunks=${chunked.json?.chunks ?? chunked.status}`,
    );
  }

  const health = await req("GET", "/api/health");
  console.log(
    JSON.stringify(
      {
        created,
        approved_sources_count: health.json.approved_sources_count,
        legal_chunks_count: health.json.legal_chunks_count,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
