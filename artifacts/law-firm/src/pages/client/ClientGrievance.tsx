import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Send } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { workspaceRequest } from "@/lib/workspace";

interface Grievance {
  id: string;
  category?: string;
  description?: string;
  status?: string;
  sla_due_at?: string;
  slaDueAt?: string;
  created_at?: string;
  createdAt?: string;
  resolution?: string | null;
}

export function ClientGrievance() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [category, setCategory] = useState("service");
  const [description, setDescription] = useState("");

  const list = useQuery({
    queryKey: ["grievances", session?.token],
    queryFn: () => workspaceRequest<{ grievances: Grievance[] }>("/api/grievances", session?.token),
    enabled: Boolean(session?.token),
  });

  const create = useMutation({
    mutationFn: () => workspaceRequest("/api/grievances", session?.token, {
      method: "POST",
      body: JSON.stringify({ category, description }),
    }),
    onSuccess: async () => {
      setDescription("");
      await queryClient.invalidateQueries({ queryKey: ["grievances", session?.token] });
    },
  });

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    create.mutate();
  };

  return (
    <div className="lc-dashboard-stack">
      <section className="lc-dashboard-intro">
        <div>
          <span className="lc-kicker">GRIEVANCE REDRESSAL</span>
          <h2>Raise a formal grievance</h2>
          <p>Legal Connect acknowledges grievances with a 72-hour first-response SLA. This channel is for platform, payment, ProxyHub, or counsel-conduct concerns.</p>
        </div>
      </section>

      <form className="lc-grievance-form" onSubmit={onSubmit}>
        <label>
          Category
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="service">Service quality</option>
            <option value="payment">Payment / escrow</option>
            <option value="proxyhub">ProxyHub appearance</option>
            <option value="privacy">Privacy / data</option>
            <option value="conduct">Professional conduct</option>
            <option value="general">General</option>
          </select>
        </label>
        <label>
          Description
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={5}
            placeholder="Describe what happened, when, and the outcome you expect. Do not include passwords or OTP codes."
            required
          />
        </label>
        {create.isError ? <p className="lc-form-error" role="alert"><AlertTriangle /> {(create.error as Error).message}</p> : null}
        {create.isSuccess ? <p className="lc-form-success">Grievance filed. You will be notified as it moves.</p> : null}
        <button className="lc-button lc-button-primary" type="submit" disabled={create.isPending || description.trim().length < 12}>
          <Send /> {create.isPending ? "Filing…" : "Submit grievance"}
        </button>
      </form>

      <section className="lc-grievance-list">
        <h3>Your grievances</h3>
        {list.isLoading ? <p>Loading…</p> : null}
        {!list.isLoading && !(list.data?.grievances || []).length ? <p>No grievances filed yet.</p> : null}
        <ul>
          {(list.data?.grievances || []).map((item) => (
            <li key={item.id}>
              <strong>{item.category || "general"}</strong>
              <span>{item.status || "open"}</span>
              <p>{item.description}</p>
              <small>SLA due {String(item.slaDueAt || item.sla_due_at || "").slice(0, 10) || "—"}</small>
              {item.resolution ? <em>{item.resolution}</em> : null}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
