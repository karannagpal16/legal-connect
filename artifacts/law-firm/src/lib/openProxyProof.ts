export function proofHasFile(task: {
  hasProof?: boolean;
  proofStored?: boolean;
  proofStatus?: string | null;
  proofViewUrl?: string | null;
  proofUrl?: string | null;
}) {
  const status = String(task.proofStatus || "").toLowerCase();
  if (["submitted", "lc_verified", "poster_approved", "approved", "rejected"].includes(status)) return true;
  return Boolean(task.hasProof || task.proofStored || task.proofViewUrl || task.proofUrl);
}

export async function openProxyProof(taskId: string, token?: string | null, fileName?: string | null) {
  const response = await fetch(`/api/tasks/${encodeURIComponent(String(taskId))}/proof`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || "Could not open the order sheet.");
  }
  const blob = await response.blob();
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
