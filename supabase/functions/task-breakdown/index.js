import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: CORS_HEADERS,
  });
}

function normalizeBreakdown(input) {
  const raw = input ?? {};
  const risk = String(raw.riskLevel ?? "medium").toLowerCase();
  const riskLevel = risk === "low" || risk === "high" ? risk : "medium";
  const confidence = Math.min(1, Math.max(0, Number(raw.confidence ?? 0.7)));
  const stepsRaw = Array.isArray(raw.steps) ? raw.steps : [];

  const steps = stepsRaw
    .map((step, idx) => ({
      order: Number(step?.order ?? idx + 1),
      title: String(step?.title ?? `Step ${idx + 1}`),
      details: String(step?.details ?? ""),
      estimatedMinutes: Math.max(5, Number(step?.estimatedMinutes ?? 30)),
      acceptanceCriteria: String(step?.acceptanceCriteria ?? "Step outcome is verified."),
    }))
    .sort((a, b) => a.order - b.order);

  return {
    objective: String(raw.objective ?? "Complete the task safely and on time."),
    assumptions: Array.isArray(raw.assumptions) ? raw.assumptions.map(String) : [],
    estimatedTotalHours: Math.max(1, Number(raw.estimatedTotalHours ?? 2)),
    riskLevel,
    confidence,
    followUpQuestions: Array.isArray(raw.followUpQuestions) ? raw.followUpQuestions.map(String) : [],
    steps,
  };
}

function getUserIdFromJwt(authHeader) {
  if (!authHeader?.startsWith("Bearer ")) return null;
  try {
    const token = authHeader.slice(7);
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const payloadRaw = atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"));
    const payload = JSON.parse(payloadRaw);
    return payload?.sub ?? null;
  } catch {
    return null;
  }
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
      error:
        "Missing env vars: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY",
    });
  }

  const authHeader = request.headers.get("authorization");
  const authUserHeader = request.headers.get("x-supabase-auth-user");

  const anonClient = createClient(supabaseUrl, anonKey, authHeader
    ? { global: { headers: { Authorization: authHeader } } }
    : undefined);
  const adminClient = createClient(supabaseUrl, serviceKey);

  let userId = null;
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const { data: userData, error: userError } = await anonClient.auth.getUser(token);
    if (!userError && userData.user?.id) userId = userData.user.id;
  }

  if (!userId && authUserHeader) {
    try {
      const parsed = JSON.parse(authUserHeader);
      userId = parsed?.id ?? parsed?.sub ?? null;
    } catch {
      userId = authUserHeader;
    }
  }

  if (!userId) {
    userId = getUserIdFromJwt(authHeader);
  }

  const body = await request.json().catch(() => ({}));
  const taskId = String(body.taskId ?? "");
  if (!taskId) return json(400, { error: "taskId is required" });

  const description = String(body.description ?? "").trim();
  const complexity = body.complexity ?? "medium";
  const availableHoursPerWeek = Math.max(1, Number(body.availableHoursPerWeek ?? 10));
  const granularity = body.granularity ?? "normal";
  const deadlineStrictness = body.deadlineStrictness ?? "balanced";
  const medium = String(body.medium ?? "MEDIUM");
  const deadline = body.deadline ? String(body.deadline) : null;
  const contextFileText = String(body.contextFileText ?? "").slice(0, 12000);

  const { data: task, error: taskError } = await adminClient
    .from("tasks")
    .select("id, user_id, title, priority, status, due_date")
    .eq("id", taskId)
    .maybeSingle();
  if (taskError || !task) return json(404, { error: "Task not found" });
  if (userId && task.user_id !== userId) return json(403, { error: "Forbidden task access" });
  const ownerId = task.user_id;

  const systemPrompt =
    "You are a task planning assistant. Return strict JSON only with keys: objective, assumptions[], estimatedTotalHours, riskLevel(low|medium|high), confidence(0..1), followUpQuestions[], steps[]. Each step must contain: order, title, details, estimatedMinutes, acceptanceCriteria.";
  const userPrompt = [
    `Task title: ${task.title}`,
    `Task medium: ${medium}`,
    `Task priority: ${task.priority}`,
    `Task status: ${task.status}`,
    `Task deadline: ${deadline ?? task.due_date ?? "not set"}`,
    `Description: ${description || "No description provided."}`,
    `Context file text: ${contextFileText || "No file context."}`,
    `Planner params: complexity=${complexity}, availableHoursPerWeek=${availableHoursPerWeek}, granularity=${granularity}, deadlineStrictness=${deadlineStrictness}`,
    "Generate practical subtasks with clear done criteria.",
  ].join("\n");

  const openAiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${openAiKey}` },
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
  const parsed = normalizeBreakdown(JSON.parse(content));

  const { data: breakdownRow, error: insertBreakdownError } = await adminClient
    .from("task_breakdowns")
    .insert({
      task_id: taskId,
      user_id: ownerId,
      source_model: openAiModel,
      input_context: {
        description,
        complexity,
        availableHoursPerWeek,
        granularity,
        deadlineStrictness,
        medium,
        deadline,
      },
      objective: parsed.objective,
      assumptions: parsed.assumptions,
      estimated_total_hours: parsed.estimatedTotalHours,
      risk_level: parsed.riskLevel,
      confidence: parsed.confidence,
      follow_up_questions: parsed.followUpQuestions,
    })
    .select("id")
    .single();
  if (insertBreakdownError) return json(500, { error: insertBreakdownError.message });

  const breakdownId = breakdownRow.id;
  const { error: insertStepsError } = await adminClient.from("task_breakdown_steps").insert(
    parsed.steps.map((step) => ({
      task_breakdown_id: breakdownId,
      order_index: step.order,
      title: step.title,
      details: step.details,
      estimated_minutes: step.estimatedMinutes,
      acceptance_criteria: step.acceptanceCriteria,
      status: "pending",
      progress: 0,
    })),
  );
  if (insertStepsError) return json(500, { error: insertStepsError.message });

  return json(200, {
    breakdown: {
      id: breakdownId,
      ...parsed,
      steps: parsed.steps.map((step) => ({ ...step, status: "pending" })),
    },
  });
});
