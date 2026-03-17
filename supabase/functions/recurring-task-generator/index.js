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

function toDateOnly(value) {
  return new Date(`${value}T00:00:00`);
}

function addDays(date, days) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function shouldGenerateOnDate(rule, baseDateStr, targetDateStr) {
  const freq = String(rule?.frequency ?? "").toLowerCase();
  const base = toDateOnly(baseDateStr);
  const target = toDateOnly(targetDateStr);
  if (target < base) return false;

  const skipDates = Array.isArray(rule?.skip_dates) ? rule.skip_dates.map(String) : [];
  if (skipDates.includes(targetDateStr)) return false;

  if (freq === "daily") return true;
  if (freq === "weekly") {
    return target.getDay() === base.getDay();
  }
  if (freq === "weekdays") {
    const weekdays = Array.isArray(rule?.weekdays) ? rule.weekdays.map(Number) : [];
    return weekdays.includes(target.getDay());
  }
  if (freq === "monthly") {
    return target.getDate() === base.getDate();
  }
  return false;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  if (request.method !== "POST") return json(405, { error: "Method not allowed" });

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? Deno.env.get("NEXT_PUBLIC_SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SECRET_KEY");
  if (!supabaseUrl || !serviceKey) return json(500, { error: "Missing env vars" });

  const admin = createClient(supabaseUrl, serviceKey);
  const body = await request.json().catch(() => ({}));
  const horizonDays = Math.max(1, Math.min(30, Number(body.horizonDays ?? 14)));

  const { data: roots, error } = await admin
    .from("tasks")
    .select("id, user_id, course_id, title, priority, status, due_date, reminder_profile, reminder_offsets, reminder_muted, recurrence_rule, recurrence_series_id, recurrence_end_date, recurrence_active")
    .eq("recurrence_active", true)
    .is("recurrence_parent_id", null)
    .not("recurrence_rule", "is", null);

  if (error) return json(500, { error: error.message });

  let created = 0;
  const today = new Date();
  const start = new Date(today.toISOString().slice(0, 10));

  for (const task of roots ?? []) {
    if (!task.due_date || !task.recurrence_rule) continue;
    const endDate = task.recurrence_end_date ? toDateOnly(task.recurrence_end_date) : null;

    for (let i = 1; i <= horizonDays; i += 1) {
      const target = addDays(start, i);
      if (endDate && target > endDate) break;
      const targetDate = target.toISOString().slice(0, 10);
      if (!shouldGenerateOnDate(task.recurrence_rule, task.due_date, targetDate)) continue;

      const { data: existing } = await admin
        .from("tasks")
        .select("id")
        .eq("recurrence_parent_id", task.id)
        .eq("due_date", targetDate)
        .limit(1)
        .maybeSingle();
      if (existing?.id) continue;

      const { error: insertError } = await admin.from("tasks").insert({
        user_id: task.user_id,
        course_id: task.course_id,
        title: task.title,
        priority: task.priority,
        status: "not_started",
        due_date: targetDate,
        reminder_profile: task.reminder_profile ?? "standard",
        reminder_offsets: Array.isArray(task.reminder_offsets) ? task.reminder_offsets : [24, 6, 1],
        reminder_muted: Boolean(task.reminder_muted),
        recurrence_rule: task.recurrence_rule,
        recurrence_series_id: task.recurrence_series_id,
        recurrence_parent_id: task.id,
        recurrence_active: true,
        recurrence_end_date: task.recurrence_end_date ?? null,
      });

      if (!insertError) created += 1;
    }
  }

  return json(200, { created });
});
