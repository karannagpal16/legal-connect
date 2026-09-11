import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { ArrowRight, MessageSquareText, ShieldCheck } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { workspaceRequest } from "@/lib/workspace";

type Audience = "client" | "advocate";

type RoomsResponse = {
  ok: boolean;
  rooms: Array<{ bookingId: string; status: string; sessionLabel?: string }>;
};

const COPY: Record<Audience, {
  title: string;
  body: string;
  primaryHref: string;
  primaryLabel: string;
  secondaryHref: string;
  secondaryLabel: string;
}> = {
  client: {
    title: "Direct advocate chat is closed",
    body: "Live talk happens only in the LC Consultation Room after Legal Connect assigns counsel and they accept. Case updates stay on the LC-reviewed board. Message Legal Connect for ops, not for a side channel.",
    primaryHref: "/client/updates",
    primaryLabel: "Open supervised case updates",
    secondaryHref: "/client/book",
    secondaryLabel: "Submit a new intake",
  },
  advocate: {
    title: "Direct client chat is closed",
    body: "Do not message clients off-platform. After you accept an LC assignment, meet the client in the Legal Connect room. Case updates still go through LC review.",
    primaryHref: "/advocate/updates",
    primaryLabel: "Post LC-reviewed update",
    secondaryHref: "/advocate/bookings",
    secondaryLabel: "Open advisory bookings",
  },
};

export function SupervisedMessagingGate({ audience }: { audience: Audience }) {
  const copy = COPY[audience];
  const { session } = useAuth();
  const [, setLocation] = useLocation();
  const roomsQuery = useQuery({
    queryKey: ["consultation-rooms", session?.user.id],
    queryFn: () => workspaceRequest<RoomsResponse>("/api/consultation-rooms", session?.token),
    enabled: Boolean(session?.token),
    staleTime: 8_000,
  });
  const liveRoom = (roomsQuery.data?.rooms || []).find((item) => item.status === "open")
    || (roomsQuery.data?.rooms || []).find((item) => ["awaiting_accept", "frozen", "expired"].includes(item.status));

  useEffect(() => {
    if (!liveRoom?.bookingId) return;
    const href = audience === "advocate"
      ? `/advocate/room/${liveRoom.bookingId}`
      : `/client/room/${liveRoom.bookingId}`;
    setLocation(href);
  }, [audience, liveRoom?.bookingId, setLocation]);

  return (
    <section className="lc-workspace-error" style={{ maxWidth: 720, margin: "40px auto" }}>
      <ShieldCheck />
      <div>
        <p className="lc-kicker" style={{ marginBottom: 8 }}>Supervised by Legal Connect</p>
        <h2>{copy.title}</h2>
        <p>{copy.body}</p>
        {liveRoom ? <p className="lc-ops-meta">Opening your LC Consultation Room…</p> : null}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 18 }}>
          <Link href={copy.primaryHref} className="lc-button lc-button-primary">
            <MessageSquareText /> {copy.primaryLabel} <ArrowRight />
          </Link>
          <Link href={copy.secondaryHref} className="lc-button">
            {copy.secondaryLabel}
          </Link>
        </div>
      </div>
    </section>
  );
}

export function ClientConnectChat() {
  return <SupervisedMessagingGate audience="client" />;
}

export function AdvocateChat() {
  return <SupervisedMessagingGate audience="advocate" />;
}
