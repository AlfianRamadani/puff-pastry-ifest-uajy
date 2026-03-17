import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(status, body) {
  return new Response(JSON.stringify(body), { status, headers: CORS_HEADERS });
}

function dueTimestamp(dateStr) {
  return new Date(`${dateStr}T23:59:00`);
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  if (request.method !== "POST") return json(405, { error: "Method not allowed" });

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? Deno.env.get("NEXT_PUBLIC_SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SECRET_KEY");
  if (!supabaseUrl || !serviceKey) return json(500, { error: "Missing env vars" });

  const admin = createClient(supabaseUrl, serviceKey);
  const now = new Date();
  const today = now.toISOString().slice(0, 10);

  const { data: tasks, error } = await admin
    .from("tasks")
    .select("id, user_id, title, status, due_date, reminder_offsets, reminder_muted, reminder_snooze_until, reminder_last_overdue_notified_at")
    .neq("status", "done")
    .not("due_date", "is", null);
  if (error) return json(500, { error: error.message });

  let remindersSent = 0;
  let escalationsSent = 0;

  for (const task of tasks ?? []) {
    if (task.reminder_muted) continue;
    if (task.reminder_snooze_until && new Date(task.reminder_snooze_until) > now) continue;

    const offsets = Array.isArray(task.reminder_offsets) ? task.reminder_offsets.map((x) => Number(x)).filter(Number.isFinite) : [24, 6, 1];
    const due = dueTimestamp(task.due_date);

    for (const offset of offsets) {
      const scheduleAt = new Date(due.getTime() - offset * 3600 * 1000);
      if (now < scheduleAt) continue;
      const dispatchKey = `${task.id}:before:${offset}:${task.due_date}`;
      const { error: dispatchError } = await admin.from("task_reminder_dispatches").insert({
        task_id: task.id,
        user_id: task.user_id,
        dispatch_key: dispatchKey,
        reminder_type: "before_due",
        scheduled_for: scheduleAt.toISOString(),
      });
      if (dispatchError) continue;

      await admin.from("notifications").insert({
        user_id: task.user_id,
        type: "task",
        title: `Reminder ${offset}h before deadline`,
        body: `${task.title} is due on ${task.due_date}.`,
        reference_id: task.id,
        reference_type: "task",
      });
      remindersSent += 1;
    }

    if (task.due_date < today) {
      const lastOverdue = task.reminder_last_overdue_notified_at ? new Date(task.reminder_last_overdue_notified_at) : null;
      const overdueEligible = !lastOverdue || now.getTime() - lastOverdue.getTime() >= 24 * 3600 * 1000;
      if (overdueEligible) {
        const dispatchKey = `${task.id}:overdue:${today}`;
        const { error: dispatchError } = await admin.from("task_reminder_dispatches").insert({
          task_id: task.id,
          user_id: task.user_id,
          dispatch_key: dispatchKey,
          reminder_type: "overdue",
          scheduled_for: now.toISOString(),
        });
        if (!dispatchError) {
          await admin.from("notifications").insert({
            user_id: task.user_id,
            type: "task",
            title: "Task overdue escalation",
            body: `${task.title} is still overdue. Please reschedule or complete it.`,
            reference_id: task.id,
            reference_type: "task",
          });
          await admin.from("tasks").update({ reminder_last_overdue_notified_at: now.toISOString() }).eq("id", task.id);
          escalationsSent += 1;
        }
      }
    }
  }

  return json(200, { remindersSent, escalationsSent });
});
