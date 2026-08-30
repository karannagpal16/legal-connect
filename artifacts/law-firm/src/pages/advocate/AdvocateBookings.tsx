import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarCheck,
  CheckCircle2,
  Loader2,
  MessageSquare,
  RefreshCw,
  Scale,
  ShieldAlert,
  Video,
  Phone,
} from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/lib/auth";
import { workspaceRequest } from "@/lib/workspace";

type AdvisoryBooking = {
  id: string;
  clientName?: string;
  legalIssueType?: string;
  serviceType?: string;
  paymentStatus?: string;
  stageStatus?: string;
  intakeStatus?: string;
  amount?: number;
  consultationChannel?: string;
  productType?: string;
  retentionStatus?: string;
  retention?: { status?: string; requestedAt?: string } | null;
  advisoryCompletedAt?: string;
  createdAt?: string;
};

type BookingsResponse = {
  ok?: boolean;
  bookings?: AdvisoryBooking[];
};

function channelLabel(value?: string) {
  const channel = String(value || "").toLowerCase();
  if (channel === "video") return "Video";
  if (channel === "call" || channel === "audio") return "Call";
  return "Chat";
}

function ChannelIcon({ value }: { value?: string }) {
  const channel = String(value || "").toLowerCase();
  if (channel === "video") return <Video className="h-4 w-4" />;
  if (channel === "call" || channel === "audio") return <Phone className="h-4 w-4" />;
  return <MessageSquare className="h-4 w-4" />;
}

export function AdvocateBookings() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const bookingsQuery = useQuery({
    queryKey: ["advocate-advisory-bookings"],
    queryFn: () => workspaceRequest<BookingsResponse>("/api/bookings", session?.token),
    enabled: Boolean(session?.token),
    staleTime: 10_000,
  });

  const workspaceQuery = useQuery({
    queryKey: ["advocate-workspace", session?.user.id],
    queryFn: () => workspaceRequest<{ paidIntakes?: AdvisoryBooking[] }>("/api/workspaces/advocate", session?.token),
    enabled: Boolean(session?.token),
    staleTime: 10_000,
  });

  const advisories = useMemo(() => {
    const fromBookings = bookingsQuery.data?.bookings || [];
    const fromWorkspace = workspaceQuery.data?.paidIntakes || [];
    const map = new Map<string, AdvisoryBooking>();
    [...fromWorkspace, ...fromBookings].forEach((row) => {
      if (!row?.id) return;
      map.set(row.id, { ...map.get(row.id), ...row });
    });
    return Array.from(map.values()).sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
  }, [bookingsQuery.data?.bookings, workspaceQuery.data?.paidIntakes]);

  const completeAdvisory = useMutation({
    mutationFn: (bookingId: string) =>
      workspaceRequest(`/api/consultations/${bookingId}/complete-advisory`, session?.token, {
        method: "POST",
        body: JSON.stringify({}),
      }),
    onSuccess: () => {
      setNotice("Advisory marked completed. Client can request LC Gateway retention.");
      setError("");
      queryClient.invalidateQueries({ queryKey: ["advocate-advisory-bookings"] });
      queryClient.invalidateQueries({ queryKey: ["advocate-workspace"] });
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Could not complete advisory."),
  });

  const suggestRetention = useMutation({
    mutationFn: (bookingId: string) =>
      workspaceRequest("/api/intakes/request-retention", session?.token, {
        method: "POST",
        body: JSON.stringify({
          bookingId,
          advocateSuggestedRetention: true,
          suggestedByAdvocateId: session?.user.id,
          matterSummary: "Advocate suggested conversion from one-time advisory to LC Gateway full court representation.",
        }),
      }),
    onSuccess: () => {
      setNotice("LC Gateway retention triggered. Admin Gateway desk will review, quote, and assign a panel lawyer.");
      setError("");
      queryClient.invalidateQueries({ queryKey: ["advocate-advisory-bookings"] });
      queryClient.invalidateQueries({ queryKey: ["advocate-workspace"] });
      queryClient.invalidateQueries({ queryKey: ["admin-intakes"] });
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Retention trigger failed."),
  });

  if (bookingsQuery.isLoading && workspaceQuery.isLoading) {
    return (
      <div className="lc-workspace-loading">
        <span className="lc-spinner" />
        <p>Opening advisory session desk...</p>
      </div>
    );
  }

  return (
    <div className="lc-workspace-page space-y-6">
      <section className="lc-vault-heading">
        <div>
          <span className="lc-kicker">ADVISORY SESSION DESK</span>
          <h2>1-time advisory → LC Gateway retention</h2>
          <p>
            Complete Astrotalk-style advisory sessions, then trigger LC Gateway retention when the matter
            needs full court representation. Clients never hire you directly inside the app.
          </p>
        </div>
        <button
          className="lc-button"
          onClick={() => {
            bookingsQuery.refetch();
            workspaceQuery.refetch();
          }}
        >
          {(bookingsQuery.isFetching || workspaceQuery.isFetching) ? <Loader2 className="lc-spin" /> : <RefreshCw />} Refresh
        </button>
      </section>

      <section className="lc-workspace-metrics" aria-label="Advisory metrics">
        <div><CalendarCheck /><span><strong>{advisories.length}</strong><small>Visible sessions</small></span></div>
        <div><CheckCircle2 /><span><strong>{advisories.filter((item) => item.advisoryCompletedAt || String(item.stageStatus || "").includes("advisory_completed")).length}</strong><small>Completed advisories</small></span></div>
        <div><Scale /><span><strong>{advisories.filter((item) => item.retentionStatus || item.retention?.status).length}</strong><small>Retention requests</small></span></div>
      </section>

      <div className="lc-ops-card" style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
        <ShieldAlert className="h-5 w-5 mt-0.5" />
        <div>
          <strong>No direct hiring</strong>
          <p className="lc-ops-meta">
            Use ProxyHub for held court missions and Chamber Vault for intern quests. Full representation
            always routes through Legal Connect Gateway.
          </p>
          <div className="lc-hero-button-row" style={{ marginTop: "0.75rem" }}>
            <Link className="lc-button" href="/advocate/proxy">Open ProxyHub</Link>
            <Link className="lc-button" href="/advocate/chamber">Open Chamber Vault</Link>
          </div>
        </div>
      </div>

      {error ? <div className="lc-form-error" role="alert">{error}</div> : null}
      {notice ? (
        <div role="status" className="lc-ops-success">
          <CheckCircle2 className="h-4 w-4" /> {notice}
        </div>
      ) : null}

      <section className="space-y-3">
        <h3>Advisory queue</h3>
        {!advisories.length ? (
          <p className="text-muted-foreground">No advisory sessions yet. Paid client bookings will appear here after LC assignment.</p>
        ) : null}
        {advisories.map((booking) => {
          const retention = booking.retentionStatus || booking.retention?.status;
          const completed = Boolean(booking.advisoryCompletedAt || String(booking.stageStatus || "").includes("advisory_completed"));
          return (
            <article key={booking.id} className="lc-ops-card">
              <div className="lc-ops-card-head">
                <div>
                  <strong>{booking.clientName || "Client"}</strong>
                  <p>
                    {booking.legalIssueType || booking.serviceType || "Advisory"}
                    {" · "}
                    {channelLabel(booking.consultationChannel)}
                    {booking.amount != null ? ` · ₹${Number(booking.amount).toLocaleString("en-IN")}` : ""}
                    {" · "}
                    {booking.stageStatus || booking.intakeStatus || booking.paymentStatus || "Pending"}
                  </p>
                  {retention ? <p className="lc-ops-meta">Retention: {retention}</p> : null}
                </div>
                <ChannelIcon value={booking.consultationChannel} />
              </div>
              <div className="lc-ops-inline" style={{ marginTop: "0.75rem" }}>
                <button
                  className="lc-button"
                  disabled={completeAdvisory.isPending || completed}
                  onClick={() => completeAdvisory.mutate(booking.id)}
                >
                  {completed ? "Advisory completed" : "Mark advisory completed"}
                </button>
                <button
                  className="lc-button lc-button-primary"
                  disabled={suggestRetention.isPending || Boolean(retention)}
                  onClick={() => suggestRetention.mutate(booking.id)}
                >
                  {retention ? "Retention already requested" : "Trigger LC Gateway retention"}
                </button>
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
