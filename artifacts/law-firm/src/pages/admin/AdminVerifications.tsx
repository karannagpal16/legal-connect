import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Check, RefreshCw, ShieldCheck, X } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { workspaceRequest } from "@/lib/workspace";

interface Verification {
  id: string;
  role: string;
  name: string;
  emailMasked: string;
  phoneMasked: string;
  credentialKind: string;
  credentialMasked: string;
  status: string;
  metadata: Record<string, string | number | boolean>;
  createdAt: string;
}

export function AdminVerifications({ embedded = false }: { embedded?: boolean } = {}) {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["admin-verifications"],
    queryFn: () => workspaceRequest<{ ok: boolean; verifications: Verification[] }>("/api/admin/verifications", session?.token),
    enabled: Boolean(session?.token),
  });
  const mutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "approved" | "rejected" }) => workspaceRequest(`/api/admin/verifications/${id}`, session?.token, { method: "PATCH", body: JSON.stringify({ status }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-verifications"] }),
  });

  if (query.isLoading) return <div className="lc-workspace-loading"><span className="lc-spinner" /><p>Loading verification queue...</p></div>;
  if (query.isError) return <section className="lc-workspace-error"><AlertTriangle /><div><h2>Verification queue unavailable</h2><p>{query.error.message}</p></div><button className="lc-button lc-button-primary" onClick={() => query.refetch()}><RefreshCw /> Retry</button></section>;

  const items = query.data?.verifications || [];
  const pending = items.filter((item) => item.status === "pending");
  const body = (
    <section className="lc-operational-panel">
      <header>
        <div>
          <span>Review queue</span>
          <h2>Clients, advocates and interns</h2>
        </div>
        <span className="lc-verification-badge pending"><ShieldCheck /> {pending.length} pending</span>
      </header>
      <div className="lc-verification-table">
        {items.map((item) => (
          <div key={item.id}>
            <span><strong>{item.name}</strong><small>{item.role} · {item.emailMasked} · {item.phoneMasked || "No phone"}</small></span>
            <span><strong>{item.credentialMasked}</strong><small>{item.credentialKind.replace("_", " ")}</small></span>
            <span><strong>{item.status}</strong><small>{new Date(item.createdAt).toLocaleDateString("en-IN")}</small></span>
            <span className="lc-verification-actions">
              <button title="Approve verification" disabled={mutation.isPending || item.status === "approved"} onClick={() => mutation.mutate({ id: item.id, status: "approved" })}><Check /></button>
              <button title="Reject verification" disabled={mutation.isPending || item.status === "rejected"} onClick={() => mutation.mutate({ id: item.id, status: "rejected" })}><X /></button>
            </span>
          </div>
        ))}
        {!items.length && <p className="lc-inline-empty">No identity records are waiting for review.</p>}
      </div>
    </section>
  );

  if (embedded) return body;
  return (
    <div className="lc-workspace-page">
      <section className="lc-vault-heading">
        <div>
          <span className="lc-kicker">ADMIN-ONLY IDENTITY REVIEW</span>
          <h2>Credential verifications</h2>
          <p>Review masked identity references. Raw Aadhaar values are never returned by this API.</p>
        </div>
        <span className="lc-verification-badge pending"><ShieldCheck /> {pending.length} pending</span>
      </section>
      {body}
    </div>
  );
}
