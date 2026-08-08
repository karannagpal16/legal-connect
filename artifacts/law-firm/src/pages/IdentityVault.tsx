import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Eye,
  Fingerprint,
  LockKeyhole,
  RefreshCw,
  Scale,
  ShieldCheck,
  Sparkles,
  Stamp,
} from "lucide-react";
import { useAuth, type AppRole } from "@/lib/auth";
import { workspaceRequest } from "@/lib/workspace";

type VaultEntry = {
  id: string;
  kind: string;
  label: string;
  masked: string;
  last4?: string;
  status: string;
  depositedAt?: string;
  rotatedAt?: string;
  name?: string;
  role?: string;
  verificationStatus?: string;
};

type VaultResponse = {
  ok: boolean;
  vault: {
    title: string;
    seal: string;
    entries: VaultEntry[];
    verifications: Array<{ kind: string; status: string; masked: string; createdAt: string }>;
  };
};

type AdminVaultResponse = {
  ok: boolean;
  entries: VaultEntry[];
};

function kindForRole(role?: AppRole | string) {
  const value = String(role || "").toLowerCase();
  if (value === "advocate") return "bar_enrollment";
  if (value === "intern") return "college_id";
  return "aadhaar";
}

function kindCopy(kind: string) {
  if (kind === "aadhaar") return { title: "Aadhaar", hint: "12-digit UIDAI number", placeholder: "XXXX XXXX XXXX" };
  if (kind === "bar_enrollment") return { title: "Bar enrollment / Bar ID", hint: "State Bar Council enrollment", placeholder: "D/1234/2020" };
  return { title: "College ID", hint: "Law school identity number", placeholder: "COLLEGE-ID" };
}

function statusTone(status?: string) {
  const value = String(status || "").toLowerCase();
  if (value === "approved" || value === "verified") return "approved";
  if (value === "rejected") return "rejected";
  if (value === "pending") return "pending";
  return "sealed";
}

export function IdentityVault() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const role = session?.user?.role as AppRole | undefined;
  const isAdmin = role === "admin";
  const defaultKind = kindForRole(role);
  const [kind] = useState(defaultKind);
  const [value, setValue] = useState("");
  const [note, setNote] = useState("");
  const [revealMap, setRevealMap] = useState<Record<string, string>>({});
  const [error, setError] = useState("");

  const mineQuery = useQuery({
    queryKey: ["identity-vault", session?.user?.id],
    queryFn: () => workspaceRequest<VaultResponse>("/api/identity-vault", session?.token),
    enabled: Boolean(session?.token) && !isAdmin,
  });

  const adminQuery = useQuery({
    queryKey: ["admin-identity-vault"],
    queryFn: () => workspaceRequest<AdminVaultResponse>("/api/admin/identity-vault", session?.token),
    enabled: Boolean(session?.token) && isAdmin,
  });

  const depositMutation = useMutation({
    mutationFn: () => workspaceRequest("/api/identity-vault", session?.token, {
      method: "POST",
      body: JSON.stringify({ kind, value, note }),
    }),
    onSuccess: () => {
      setValue("");
      setNote("");
      setError("");
      queryClient.invalidateQueries({ queryKey: ["identity-vault"] });
      queryClient.invalidateQueries({ queryKey: ["admin-identity-vault"] });
      queryClient.invalidateQueries({ queryKey: ["admin-verifications"] });
    },
    onError: (err: Error) => setError(err.message || "Could not seal credential."),
  });

  const revealMutation = useMutation({
    mutationFn: (id: string) => workspaceRequest<{ ok: boolean; reveal: { id: string; value: string } }>(
      `/api/admin/identity-vault/${id}/reveal`,
      session?.token,
      { method: "POST", body: "{}" },
    ),
    onSuccess: (data) => {
      if (data.reveal?.id) {
        setRevealMap((current) => ({ ...current, [data.reveal.id]: data.reveal.value }));
      }
    },
  });

  const copy = useMemo(() => kindCopy(kind), [kind]);
  const entries = isAdmin ? (adminQuery.data?.entries || []) : (mineQuery.data?.vault.entries || []);
  const verifications = mineQuery.data?.vault.verifications || [];
  const loading = isAdmin ? adminQuery.isLoading : mineQuery.isLoading;
  const queryError = isAdmin ? adminQuery.error : mineQuery.error;

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    setError("");
    depositMutation.mutate();
  };

  if (loading) {
    return (
      <div className="lc-workspace-loading">
        <span className="lc-spinner" />
        <p>Opening the Identity Vault…</p>
      </div>
    );
  }

  if (queryError) {
    return (
      <section className="lc-workspace-error">
        <AlertTriangle />
        <div>
          <h2>Vault unavailable</h2>
          <p>{(queryError as Error).message}</p>
        </div>
        <button className="lc-button lc-button-primary" onClick={() => (isAdmin ? adminQuery.refetch() : mineQuery.refetch())}>
          <RefreshCw /> Retry
        </button>
      </section>
    );
  }

  return (
    <div className="lc-id-vault">
      <section className="lc-id-vault-hero">
        <div className="lc-id-vault-seal" aria-hidden="true">
          <span />
          <LockKeyhole />
        </div>
        <div className="lc-id-vault-hero-copy">
          <p className="lc-kicker">Credential seal · Legal Connect India</p>
          <h1>Identity Vault</h1>
          <p>
            Aadhaar, Bar enrollment, and college IDs are sealed with AES-256-GCM.
            Workspaces only ever see masked last-four digits. Admins may break the seal with a recorded audit trail.
          </p>
        </div>
        <aside className="lc-id-vault-promise">
          <ShieldCheck />
          <strong>Sealed at rest</strong>
          <span>Ciphertext in Postgres · hash for matching · last4 for display</span>
        </aside>
      </section>

      {!isAdmin && (
        <section className="lc-id-vault-deposit">
          <header>
            <Fingerprint />
            <div>
              <h2>Deposit a credential</h2>
              <p>Resealing sends the number for Legal Connect review and replaces the previous vault entry.</p>
            </div>
          </header>
          <form onSubmit={onSubmit}>
            <label>
              {copy.title}
              <input
                value={value}
                onChange={(event) => setValue(event.target.value)}
                placeholder={copy.placeholder}
                inputMode={kind === "aadhaar" ? "numeric" : "text"}
                autoComplete="off"
                required
              />
              <small>{copy.hint}. Full value never appears in your workspace after sealing.</small>
            </label>
            <label>
              Note for Legal Connect <span>(optional)</span>
              <input value={note} onChange={(event) => setNote(event.target.value)} placeholder="e.g. Updated after Bar Council renewal" maxLength={200} />
            </label>
            {error ? <p className="lc-id-vault-error">{error}</p> : null}
            <button className="lc-button lc-button-primary" type="submit" disabled={depositMutation.isPending}>
              {depositMutation.isPending ? <RefreshCw className="lc-spin" /> : <LockKeyhole />}
              Seal into vault
            </button>
          </form>
        </section>
      )}

      <section className="lc-id-vault-slots">
        <header>
          <div>
            <span className="lc-kicker">{isAdmin ? "Platform vault" : "Your sealed slots"}</span>
            <h2>{isAdmin ? "Every sealed credential" : "What Legal Connect holds for you"}</h2>
          </div>
          <span className="lc-id-vault-count"><Scale /> {entries.length}</span>
        </header>

        <div className="lc-id-vault-grid">
          {entries.map((entry, index) => {
            const tone = statusTone(entry.verificationStatus || entry.status);
            const revealed = revealMap[entry.id];
            return (
              <article key={entry.id} className={`lc-id-vault-slot tone-${tone}`} style={{ animationDelay: `${index * 70}ms` }}>
                <div className="lc-id-vault-ribbon">{tone}</div>
                <div className="lc-id-vault-slot-top">
                  <Sparkles />
                  <div>
                    <h3>{entry.label || kindCopy(entry.kind).title}</h3>
                    <p>{isAdmin ? `${entry.name || "User"} · ${entry.role || ""}` : "Encrypted vault entry"}</p>
                  </div>
                </div>
                <p className="lc-id-vault-mask">{revealed || entry.masked}</p>
                <dl>
                  <div>
                    <dt>Kind</dt>
                    <dd>{entry.kind.replace(/_/g, " ")}</dd>
                  </div>
                  <div>
                    <dt>Status</dt>
                    <dd>{entry.verificationStatus || entry.status}</dd>
                  </div>
                  <div>
                    <dt>Sealed</dt>
                    <dd>{entry.depositedAt ? new Date(entry.depositedAt).toLocaleDateString("en-IN") : "—"}</dd>
                  </div>
                </dl>
                {isAdmin ? (
                  <button
                    type="button"
                    className="lc-button lc-button-quiet"
                    disabled={revealMutation.isPending}
                    onClick={() => revealMutation.mutate(entry.id)}
                  >
                    <Eye /> {revealed ? "Revealed (audited)" : "Break seal"}
                  </button>
                ) : null}
              </article>
            );
          })}
          {!entries.length ? (
            <div className="lc-id-vault-empty">
              <Stamp />
              <h3>No credentials sealed yet</h3>
              <p>{isAdmin ? "When users register or reseal IDs, they appear here as masked vault slots." : "Deposit your Aadhaar, Bar ID, or college ID above to open your seal."}</p>
            </div>
          ) : null}
        </div>
      </section>

      {!isAdmin && verifications.length > 0 ? (
        <section className="lc-id-vault-review">
          <h2>Review trail</h2>
          <ul>
            {verifications.map((item) => (
              <li key={`${item.kind}-${item.createdAt}`}>
                <strong>{item.masked}</strong>
                <span>{item.kind.replace(/_/g, " ")}</span>
                <em className={`tone-${statusTone(item.status)}`}>{item.status}</em>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
