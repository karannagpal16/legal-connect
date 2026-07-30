import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, BriefcaseBusiness, CheckCircle2, Clock3, Plus, RefreshCw, UserPlus, UsersRound } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { workspaceRequest } from "@/lib/workspace";

interface ChamberMember {
  id: string;
  display_name: string;
  email: string;
  member_role: string;
  status: string;
}

interface ChamberTask {
  id: string;
  title: string;
  details?: string;
  assignee_name: string;
  status: string;
  priority: string;
  due_at?: string;
  updated_at: string;
}

interface ChamberResponse {
  ok: boolean;
  chamber: { id: string; name: string; members: ChamberMember[]; tasks: ChamberTask[] };
}

export function ChamberVault() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [member, setMember] = useState({ displayName: "", email: "", memberRole: "associate" });
  const [task, setTask] = useState({ title: "", details: "", assigneeName: "", priority: "normal", dueAt: "" });
  const query = useQuery({
    queryKey: ["chamber-vault", session?.user.id],
    queryFn: () => workspaceRequest<ChamberResponse>("/api/chamber", session?.token),
    enabled: Boolean(session?.token),
    staleTime: 5_000,
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["chamber-vault", session?.user.id] });
  const memberMutation = useMutation({
    mutationFn: () => workspaceRequest("/api/chamber/members", session?.token, { method: "POST", body: JSON.stringify(member) }),
    onSuccess: () => { setMember({ displayName: "", email: "", memberRole: "associate" }); refresh(); },
  });
  const taskMutation = useMutation({
    mutationFn: () => workspaceRequest("/api/chamber/tasks", session?.token, { method: "POST", body: JSON.stringify(task) }),
    onSuccess: () => { setTask({ title: "", details: "", assigneeName: "", priority: "normal", dueAt: "" }); refresh(); },
  });
  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => workspaceRequest(`/api/chamber/tasks/${id}/status`, session?.token, { method: "PATCH", body: JSON.stringify({ status }) }),
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: ["chamber-vault", session?.user.id] });
      const previous = queryClient.getQueryData<ChamberResponse>(["chamber-vault", session?.user.id]);
      queryClient.setQueryData<ChamberResponse>(["chamber-vault", session?.user.id], (current) => current ? {
        ...current,
        chamber: { ...current.chamber, tasks: current.chamber.tasks.map((item) => item.id === id ? { ...item, status } : item) },
      } : current);
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(["chamber-vault", session?.user.id], context.previous);
    },
    onSettled: refresh,
  });

  const submitMember = (event: FormEvent) => { event.preventDefault(); memberMutation.mutate(); };
  const submitTask = (event: FormEvent) => { event.preventDefault(); taskMutation.mutate(); };

  if (query.isLoading) return <div className="lc-workspace-loading"><span className="lc-spinner" /><p>Unlocking Chamber Vault...</p></div>;
  if (query.isError) return <section className="lc-workspace-error"><AlertTriangle /><div><h2>Chamber Vault unavailable</h2><p>{query.error.message}</p></div><button className="lc-button lc-button-primary" onClick={() => query.refetch()}><RefreshCw /> Retry</button></section>;
  if (!query.data) return <div className="lc-workspace-loading"><span className="lc-spinner" /><p>Preparing the chamber ledger...</p></div>;

  const chamber = query.data.chamber;
  const openTasks = chamber.tasks.filter((item) => item.status !== "completed");

  return (
    <div className="lc-workspace-page">
      <section className="lc-vault-heading">
        <div><span className="lc-kicker">PRIVATE PRACTICE OPERATIONS</span><h2>{chamber.name}</h2><p>Delegate work, record acceptance, and see who owns each next action.</p></div>
        <span className="lc-live-badge"><i /> Live ledger</span>
      </section>

      <section className="lc-workspace-metrics">
        <div><UsersRound /><span><strong>{chamber.members.length}</strong><small>Members</small></span></div>
        <div><BriefcaseBusiness /><span><strong>{openTasks.length}</strong><small>Open tasks</small></span></div>
        <div><Clock3 /><span><strong>{openTasks.filter((item) => item.status === "in_progress").length}</strong><small>In progress</small></span></div>
        <div><CheckCircle2 /><span><strong>{chamber.tasks.filter((item) => item.status === "completed").length}</strong><small>Completed</small></span></div>
      </section>

      <section className="lc-vault-grid">
        <div className="lc-operational-panel">
          <header><div><span>Delegation ledger</span><h2>Who is handling what</h2></div></header>
          <div className="lc-vault-task-table">
            {chamber.tasks.length ? chamber.tasks.map((item) => (
              <div key={item.id}>
                <span><strong>{item.title}</strong><small>{item.details || "No additional instructions"}</small></span>
                <span><strong>{item.assignee_name || "Unassigned"}</strong><small>{item.priority} priority</small></span>
                <select value={item.status} onChange={(event) => statusMutation.mutate({ id: item.id, status: event.target.value })} aria-label={`Update ${item.title} status`}>
                  <option value="assigned">Assigned</option>
                  <option value="accepted">Accepted</option>
                  <option value="in_progress">In progress</option>
                  <option value="blocked">Blocked</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            )) : <p className="lc-inline-empty">Delegate the first task to start the chamber ledger.</p>}
          </div>
        </div>

        <aside className="lc-vault-tools">
          <form className="lc-operational-panel lc-vault-form" onSubmit={submitTask}>
            <header><div><span>New assignment</span><h2>Delegate work</h2></div><Plus /></header>
            <label><span>Task</span><input value={task.title} onChange={(event) => setTask({ ...task, title: event.target.value })} placeholder="Draft reply to legal notice" required /></label>
            <label><span>Instructions</span><textarea value={task.details} onChange={(event) => setTask({ ...task, details: event.target.value })} placeholder="Scope, source files and expected output" rows={3} /></label>
            <div className="lc-form-grid">
              <label><span>Assign to</span><input value={task.assigneeName} onChange={(event) => setTask({ ...task, assigneeName: event.target.value })} placeholder="Member name" /></label>
              <label><span>Due date</span><input value={task.dueAt} onChange={(event) => setTask({ ...task, dueAt: event.target.value })} type="datetime-local" /></label>
            </div>
            <label><span>Priority</span><select value={task.priority} onChange={(event) => setTask({ ...task, priority: event.target.value })}><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option></select></label>
            {taskMutation.isError && <p className="lc-sync-error"><AlertTriangle /> {taskMutation.error.message}</p>}
            <button className="lc-button lc-button-primary" disabled={taskMutation.isPending}>{taskMutation.isPending ? <RefreshCw className="lc-spin" /> : <Plus />} Assign task</button>
          </form>

          <form className="lc-operational-panel lc-vault-form" onSubmit={submitMember}>
            <header><div><span>Team access</span><h2>Invite member</h2></div><UserPlus /></header>
            <label><span>Full name</span><input value={member.displayName} onChange={(event) => setMember({ ...member, displayName: event.target.value })} placeholder="Associate or intern name" required /></label>
            <label><span>Email</span><input value={member.email} onChange={(event) => setMember({ ...member, email: event.target.value })} placeholder="member@example.com" type="email" required /></label>
            <label><span>Role</span><select value={member.memberRole} onChange={(event) => setMember({ ...member, memberRole: event.target.value })}><option value="associate">Associate</option><option value="junior">Junior advocate</option><option value="intern">Intern</option><option value="clerk">Clerk</option></select></label>
            {memberMutation.isError && <p className="lc-sync-error"><AlertTriangle /> {memberMutation.error.message}</p>}
            <button className="lc-button lc-button-secondary" disabled={memberMutation.isPending}><UserPlus /> Send invite</button>
          </form>
        </aside>
      </section>
    </div>
  );
}
