import { FormEvent, useState } from "react";
import { Loader2, Search } from "lucide-react";

export function CourtCaseSearch({
  onSearch,
  searching,
  hint,
}: {
  onSearch: (cnr: string) => void;
  searching?: boolean;
  hint?: string;
}) {
  const [cnr, setCnr] = useState("");

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSearch(cnr.trim());
  };

  return (
    <form onSubmit={submit} className="space-y-2">
      <label className="block text-xs font-semibold text-[#1A2332]/60">Search by CNR</label>
      <div className="flex flex-wrap gap-2">
        <input
          value={cnr}
          onChange={(event) => setCnr(event.target.value.toUpperCase())}
          placeholder="16-character CNR (e.g. DLSA010012342024)"
          className="min-w-[220px] flex-1 rounded-xl border border-[#1A2332]/15 bg-white/70 px-3 py-2.5 text-sm"
          maxLength={24}
          required
        />
        <button
          type="submit"
          disabled={searching}
          className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-white disabled:opacity-60"
        >
          {searching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
          Search
        </button>
      </div>
      {hint ? <p className="text-[11px] text-[#1A2332]/45">{hint}</p> : null}
    </form>
  );
}
