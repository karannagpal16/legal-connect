import { CounselIntake } from "@/components/client/CounselIntake";

function queryParam(name: string) {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get(name) || "";
}

export function ClientBookAdvocate() {
  const requestedMode = queryParam("mode");
  const initialChannel = requestedMode === "chat" || requestedMode === "video" ? requestedMode : "call";
  const source = queryParam("source") === "sos" ? "sos" : queryParam("caseId") ? "matter" : "booking";

  return (
    <CounselIntake
      initialChannel={initialChannel}
      allowedChannels={source === "sos" ? ["call", "video"] : ["chat", "call", "video"]}
      initialCaseId={queryParam("caseId")}
      initialCaseTitle={queryParam("caseTitle")}
      initialParticulars={queryParam("particulars")}
      source={source}
      embedded
    />
  );
}
