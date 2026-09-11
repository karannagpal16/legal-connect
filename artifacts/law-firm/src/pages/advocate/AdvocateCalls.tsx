import { useQuery } from "@tanstack/react-query";
import { MessageSquareText, PhoneOff, RefreshCw, ShieldCheck } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/lib/auth";
import { workspaceRequest } from "@/lib/workspace";
import { ConsultationRoomLink } from "@/pages/ConsultationRoom";

type RoomsResponse = {
  ok: boolean;
  rooms: Array<{
    bookingId: string;
    status: string;
    sessionLabel?: string;
    counterpart?: { displayName: string };
    canCall?: boolean;
  }>;
};

export function AdvocateCalls() {
  const { session } = useAuth();
  const query = useQuery({
    queryKey: ["consultation-rooms", session?.user.id],
    queryFn: () => workspaceRequest<RoomsResponse>("/api/consultation-rooms", session?.token),
    enabled: Boolean(session?.token),
    refetchInterval: 8_000,
  });
  const rooms = query.data?.rooms || [];

  return (
    <div className="lc-workspace-page">
      <header className="lc-case-chat-head">
        <div>
          <span className="lc-kicker">LC CONSULTATION ROOM</span>
          <h2>Calls live inside Legal Connect</h2>
          <p>There is no dialer, WhatsApp, or Zoom. Audio will join this same room later. Chat is live after you accept an LC assignment.</p>
        </div>
        <span><ShieldCheck /> Numbers stay vaulted</span>
      </header>
      <section className="lc-ops-card" style={{ marginBottom: "1rem" }}>
        <p className="lc-ops-meta"><PhoneOff /> A Call button only appears inside an open LC room. Direct client numbers are never shown.</p>
      </section>
      {query.isLoading ? <p className="lc-ops-meta">Loading rooms…</p> : null}
      {query.isError ? (
        <button className="lc-button" onClick={() => query.refetch()}><RefreshCw /> Retry</button>
      ) : null}
      {!rooms.length && !query.isLoading ? (
        <section className="lc-workspace-empty">
          <MessageSquareText />
          <h2>No LC room yet</h2>
          <p>Accept a paid, LC-assigned advisory from Bookings. The consultation room opens only after that accept.</p>
          <Link className="lc-button lc-button-primary" href="/advocate/bookings">Open bookings</Link>
        </section>
      ) : (
        <section className="space-y-3">
          {rooms.map((room) => (
            <article key={room.bookingId} className="lc-ops-card">
              <strong>{room.counterpart?.displayName || "Legal Connect client"}</strong>
              <p className="lc-ops-meta">{room.sessionLabel || "Advisory session"} · {room.status}</p>
              <div className="lc-ops-inline" style={{ marginTop: "0.75rem" }}>
                <ConsultationRoomLink bookingId={room.bookingId} status={room.status} />
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
