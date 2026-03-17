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

function normalizeEstimates(input, taskIds) {
  const raw = input ?? {};
  const estimates = Array.isArray(raw.estimates) ? raw.estimates : [];
  const validIds = new Set(taskIds);

  return {
    estimates: estimates
      .map((item) => ({
        id: String(item?.id ?? ""),
        suggested_date: String(item?.suggested_date ?? ""),
        reasoning: String(item?.reasoning ?? ""),
      }))
      .filter((item) => validIds.has(item.id) && /^\d{4}-\d{2}-\d{2}$/.test(item.suggested_date)),
  };
}

async function verifyAuth(request, supabaseUrl, anonKey) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const anonClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data, error } = await anonClient.auth.getUser(authHeader.slice(7));
  if (error || !data.user?.id) return null;
  return data.user.id;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  if (request.method !== "POST") return json(405, { error: "Method not allowed" });

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? Deno.env.get("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const openAiKey = Deno.env.get("OPENAI_API_KEY");
  const openAiModel = Deno.env.get("OPENAI_MODEL") ?? "gpt-4.1-mini";

  if (!supabaseUrl || !anonKey || !openAiKey) {
    return json(500, { error: "Missing env vars: SUPABASE_URL, SUPABASE_ANON_KEY, OPENAI_API_KEY" });
  }

  const userId = await verifyAuth(request, supabaseUrl, anonKey);
  if (!userId) return json(401, { error: "Invalid JWT" });

  const body = await request.json().catch(() => ({}));
  const tasks = Array.isArray(body.tasks) ? body.tasks : [];
  const today = String(body.today ?? new Date().toISOString().slice(0, 10));

  if (tasks.length === 0) return json(200, { estimates: [] });

  const cleanedTasks = tasks
    .map((task) => ({
      id: String(task?.id ?? ""),
      title: String(task?.title ?? "").trim(),
      priority: String(task?.priority ?? "MEDIUM").toUpperCase(),
      status: String(task?.status ?? "NOT_STARTED").toUpperCase(),
    }))
    .filter((task) => task.id && task.title);

  if (cleanedTasks.length === 0) return json(400, { error: "tasks must include id and title" });

  const systemPrompt =
    "You are a project scheduling assistant. Return strict JSON only in this shape: { estimates: [{ id, suggested_date:'YYYY-MM-DD', reasoning }] }. Provide realistic dates after today.";
  const userPrompt = [
    `Today: ${today}`,
    `Tasks needing due dates: ${JSON.stringify(cleanedTasks)}`,
    "Use priority and status to suggest practical deadlines.",
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
      temperature: 0.1,
    }),
  });

  if (!openAiResponse.ok) return json(502, { error: `OpenAI error: ${await openAiResponse.text()}` });

  const completion = await openAiResponse.json();
  const content = completion?.choices?.[0]?.message?.content ?? "{}";
  const payload = normalizeEstimates(JSON.parse(content), cleanedTasks.map((task) => task.id));

  return json(200, payload);
});
