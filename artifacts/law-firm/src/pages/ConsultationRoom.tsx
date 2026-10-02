import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  Clock3,
  LockKeyhole,
  MessageSquareText,
  PhoneOff,
  RefreshCw,
  Send,
  ShieldCheck,
  Snowflake,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { workspaceRequest } from "@/lib/workspace";

type RoomMessage = {
  id: string;
  senderRole: string;
  displayName: string;
  body: string;
  bodyOriginal?: string;
  leakHits?: Array<{ type: string }>;
  createdAt: string;
};

type RoomPayload = {
  ok: boolean;
  room: {
    id: string;
    bookingId: string;
    status: string;
    channel: string;
    sessionLabel: string;
    remainingMs: number | null;
    windowEndsAt?: string | null;
    warning: boolean;
    leakStrikes: number;
    freezeReason: string | null;
    selfRole: string;
    selfDisplayName: string;
    counterpart: { role: string; displayName: string };
    canPost: boolean;
    canCall: boolean;
    mediaNote: string;
    contactPolicy: string;
  };
  messages: RoomMessage[];
  error?: string;
  code?: string;
};

function bookingIdFromPath(path: string, fallback?: string) {
  if (fallback) return fallback;
  const match = String(path || "").match(/\/room\/([^/?#]+)/);
  return match ? decodeURIComponent(match[1]) : "";
}

function formatClock(ms: number | null) {
  if (ms == null) return "Window pending";
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")} left`;
}

function stamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}

function statusCopy(status: string) {
  if (status === "awaiting_hold") return "Pay and lock the session before the room opens.";
  if (status === "awaiting_assign") return "Legal Connect is completing the conflict check and will assign counsel.";
  if (status === "awaiting_accept") return "Counsel is assigned. The room opens after they accept.";
  if (status === "frozen") return "This room is frozen because contact details were shared.";
  if (status === "expired") return "The paid window has ended. Ask Admin to grant time, or book another session.";
  if (status === "completed") return "This advisory session is closed.";
  return "Supervised live session. Numbers stay in the vault.";
}

export function ConsultationRoom({ bookingId: bookingIdProp }: { bookingId?: string }) {
  const { session } = useAuth();
  const [location] = useLocation();
  const bookingId = bookingIdFromPath(location, bookingIdProp);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [now, setNow] = useState(Date.now());
  const historyRef = useRef<HTMLDivElement>(null);
  const isAdmin = ["admin", "rna"].includes(String(session?.user?.role || ""));

  const query = useQuery({
    queryKey: ["consultation-room", bookingId],
    queryFn: () => workspaceRequest<RoomPayload>(`/api/consultation-rooms/${bookingId}`, session?.token),
    enabled: Boolean(session?.token && bookingId),
    refetchInterval: 2500,
    staleTime: 1000,
  });

  const room = query.data?.room;
  const messages = query.data?.messages || [];

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const node = historyRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages.length]);

  const remaining = useMemo(() => {
    if (!room?.windowEndsAt && room?.remainingMs == null) return room?.remainingMs ?? null;
    if (room?.remainingMs == null) return null;
    const elapsed = now - (query.dataUpdatedAt || now);
    return Math.max(0, room.remainingMs - elapsed);
  }, [room, now, query.dataUpdatedAt]);

  const send = async () => {
    const body = draft.trim();
    if (!body || !bookingId || sending || !room?.canPost) return;
    setSending(true);
    setError("");
    try {
      await workspaceRequest(`/api/consultation-rooms/${bookingId}/messages`, session?.token, {
        method: "POST",
        body: JSON.stringify({ body }),
      });
      setDraft("");
      await query.refetch();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Message could not be sent.");
    } finally {
      setSending(false);
    }
  };

  if (!bookingId) {
    return (
      <section className="lc-workspace-empty">
        <MessageSquareText />
        <h2>No consultation room selected</h2>
        <p>The room opens on a paid booking after Legal Connect assigns counsel and they accept.</p>
      </section>
    );
  }
  if (query.isLoading) {
    return <div className="lc-workspace-loading"><span className="lc-spinner" /><p>Opening Legal Connect room...</p></div>;
  }
  if (query.isError) {
    return (
      <section className="lc-workspace-error">
        <AlertTriangle />
        <div>
          <h2>Room could not be opened</h2>
          <p>{query.error instanceof Error ? query.error.message : "Try again after LC assign and counsel accept."}</p>
        </div>
        <button className="lc-button lc-button-primary" onClick={() => query.refetch()}><RefreshCw /> Retry</button>
      </section>
    );
  }

  return (
    <div className="lc-consult-room">
      <header className="lc-case-chat-head">
        <div>
          <span className="lc-kicker">LC CONSULTATION ROOM</span>
          <h2>{room?.counterpart.displayName || "Legal Connect session"}</h2>
          <p>{room?.sessionLabel} · {statusCopy(room?.status || "")}</p>
        </div>
        <span>
          <ShieldCheck /> {room?.status === "open" ? "Live · LC supervised" : room?.status || "Closed"}
        </span>
      </header>

      <section className="lc-consult-meta">
        <p><Clock3 /> {room?.warning ? "Last minute — " : ""}{formatClock(remaining)}</p>
        <p><LockKeyhole /> {room?.contactPolicy}</p>
        <p><PhoneOff /> {room?.mediaNote}</p>
        {room?.status === "frozen" ? <p className="warn"><Snowflake /> {room.freezeReason}</p> : null}
      </section>

      <div className="lc-message-room lc-consult-thread">
        <div className="lc-message-privacy">
          <LockKeyhole />
          <span>
            <strong>You see display names only</strong>
            <small>Raw mobile, email and WhatsApp never appear. Case updates stay on the LC-reviewed board.</small>
          </span>
        </div>
        <div className="lc-message-history" ref={historyRef}>
          {messages.length ? messages.map((item) => (
            <article key={item.id} className={item.senderRole === room?.selfRole ? "mine" : ""}>
              <span>
                <strong>{item.senderRole === room?.selfRole ? "You" : item.displayName}</strong>
                <small>{stamp(item.createdAt)}</small>
              </span>
              <p>{item.body}</p>
              {isAdmin && item.bodyOriginal && item.bodyOriginal !== item.body ? (
                <small className="lc-consult-original">Original (Admin): {item.bodyOriginal}</small>
              ) : null}
            </article>
          )) : (
            <p className="lc-inline-empty">No messages yet. Stay in this room — do not move the talk to a phone.</p>
          )}
        </div>
        <div className="lc-message-compose">
          {error ? <div className="lc-form-error"><AlertTriangle /> {error}</div> : null}
          <textarea
            rows={3}
            value={draft}
            disabled={!room?.canPost || sending}
            placeholder={room?.canPost ? "Write in the LC room. Phone numbers and WhatsApp are stripped." : statusCopy(room?.status || "")}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void send();
              }
            }}
          />
          <button className="lc-button lc-button-primary" disabled={!room?.canPost || sending || !draft.trim()} onClick={() => void send()}>
            <Send /> {sending ? "Sending..." : "Send in Legal Connect"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ConsultationRoomPage() {
  return <ConsultationRoom />;
}

export function ConsultationRoomLink({ bookingId, status }: { bookingId: string; status?: string }) {
  const { session } = useAuth();
  const role = String(session?.user?.role || "client");
  const href = role === "advocate"
    ? `/advocate/room/${bookingId}`
    : role === "admin" || role === "rna"
      ? `/admin/room/${bookingId}`
      : `/client/room/${bookingId}`;
  const ready = ["open", "frozen", "expired", "awaiting_accept", "awaiting_assign"].includes(String(status || "open"));
  return (
    <Link className="lc-button lc-button-primary" href={href}>
      <MessageSquareText /> {ready && status === "open" ? "Open LC room" : "Consultation room"}
    </Link>
  );
}
