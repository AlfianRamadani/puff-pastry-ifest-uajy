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

function normalizeReport(input) {
  const raw = input ?? {};
  const risk = String(raw.riskLevel ?? "MODERATE").toUpperCase();
  const riskLevel = ["LOW", "MODERATE", "HIGH", "CRITICAL"].includes(risk) ? risk : "MODERATE";
  const recommendations = Array.isArray(raw.recommendations)
    ? raw.recommendations.map(String).map((item) => item.trim()).filter(Boolean).slice(0, 8)
    : [];

  return {
    summary: String(raw.summary ?? "Burnout risk summary unavailable."),
    riskLevel,
    recommendations,
  };
}

async function resolveUserIdFromAuth(request, supabaseUrl, anonKey) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const anonClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const token = authHeader.slice(7);
  const { data, error } = await anonClient.auth.getUser(token);
  if (error || !data.user?.id) return null;
  return data.user.id;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  if (request.method !== "POST") return json(405, { error: "Method not allowed" });

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? Deno.env.get("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SECRET_KEY");
  const openAiKey = Deno.env.get("OPENAI_API_KEY");
  const openAiModel = Deno.env.get("OPENAI_MODEL") ?? "gpt-4.1-mini";

  if (!supabaseUrl || !anonKey || !serviceKey || !openAiKey) {
    return json(500, {
      error: "Missing env vars: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY",
    });
  }

  const requesterUserId = await resolveUserIdFromAuth(request, supabaseUrl, anonKey);
  if (!requesterUserId) return json(401, { error: "Invalid JWT" });

  const body = await request.json().catch(() => ({}));
  const requestedUserId = String(body.userId ?? requesterUserId);
  if (requestedUserId !== requesterUserId) return json(403, { error: "Forbidden user access" });

  const adminClient = createClient(supabaseUrl, serviceKey);
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysAgoIso = sevenDaysAgo.toISOString().slice(0, 10);

  const [tasksResult, snapshotsResult, coursesResult, profileResult] = await Promise.all([
    adminClient
      .from("tasks")
      .select("id, title, status, priority, due_date")
      .eq("user_id", requestedUserId)
      .neq("status", "done")
      .order("due_date", { ascending: true }),
    adminClient
      .from("burnout_snapshots")
      .select("snapshot_date, probability, workload_intensity, active_tasks_count")
      .eq("user_id", requestedUserId)
      .gte("snapshot_date", sevenDaysAgoIso)
      .order("snapshot_date", { ascending: true }),
    adminClient.from("courses").select("name, credits, type").eq("user_id", requestedUserId),
    adminClient.from("profiles").select("daily_study_goal_hours").eq("id", requestedUserId).maybeSingle(),
  ]);

  const firstError = tasksResult.error ?? snapshotsResult.error ?? coursesResult.error ?? profileResult.error;
  if (firstError) return json(500, { error: firstError.message });

  const tasks = tasksResult.data ?? [];
  const snapshots = snapshotsResult.data ?? [];
  const courses = coursesResult.data ?? [];
  const dailyGoal = profileResult.data?.daily_study_goal_hours ?? 4;

  const systemPrompt =
    "You are a study burnout analyst. Return strict JSON only with keys: summary, riskLevel(LOW|MODERATE|HIGH|CRITICAL), recommendations(string[]). Keep recommendations concrete and short.";
  const userPrompt = [
    `Daily study goal hours: ${dailyGoal}`,
    `Active tasks (${tasks.length}): ${JSON.stringify(tasks)}`,
    `Burnout trend 7 days: ${JSON.stringify(snapshots)}`,
    `Courses (${courses.length}): ${JSON.stringify(courses)}`,
    "Analyze overall risk and return concise action plan.",
  ].join("\n");

  const openAiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${openAiKey}`,
    },
    body: JSON.stringify({
      model: openAiModel,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.2,
    }),
  });

  if (!openAiResponse.ok) return json(502, { error: `OpenAI error: ${await openAiResponse.text()}` });

  const completion = await openAiResponse.json();
  const content = completion?.choices?.[0]?.message?.content ?? "{}";
  const report = normalizeReport(JSON.parse(content));

  return json(200, report);
});
