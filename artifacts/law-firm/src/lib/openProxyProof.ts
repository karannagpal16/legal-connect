export type ProofTaskMeta = {
  hasProof?: boolean;
  proofStored?: boolean;
  proofStatus?: string | null;
  proofViewUrl?: string | null;
  proofUrl?: string | null;
};

export function proofHasFile(task: ProofTaskMeta) {
  const status = String(task.proofStatus || "").toLowerCase();
  if (["submitted", "lc_verified", "poster_approved", "approved", "rejected"].includes(status)) return true;
  return Boolean(task.hasProof || task.proofStored || task.proofViewUrl || task.proofUrl);
}

export async function parseProofError(response: Response, fallback: string) {
  const payload = await response.json().catch(() => ({} as { error?: string; message?: string }));
  if (payload.error) return String(payload.error);
  if (payload.message) return String(payload.message);
  if (response.status === 413) return "That scan is too large. Use a photo or PDF under 8 MB.";
  if (response.status === 415) return "Upload a PDF or image of the order sheet.";
  if (response.status >= 500) return "Legal Connect could not save that scan. Try a smaller photo.";
  return fallback;
}

export async function fetchProxyProofBlob(taskId: string, token?: string | null) {
  const response = await fetch(`/api/tasks/${encodeURIComponent(String(taskId))}/proof`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) {
    throw new Error(await parseProofError(response, "Could not open the order sheet."));
  }
  const blob = await response.blob();
  const mimeType = response.headers.get("content-type") || blob.type || "application/octet-stream";
  return { blob, mimeType };
}

export async function openProxyProof(taskId: string, token?: string | null, fileName?: string | null) {
  const { blob } = await fetchProxyProofBlob(taskId, token);
  const href = URL.createObjectURL(blob);
  const opened = window.open(href, "_blank", "noopener,noreferrer");
  if (!opened) {
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
    if (fileName) anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  }
  window.setTimeout(() => URL.revokeObjectURL(href), 60_000);
}
