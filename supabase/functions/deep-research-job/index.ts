// Deep Research background-job worker.
// Creates a row in research_jobs, returns the jobId immediately, and runs
// the planning -> multi-query search -> synthesis pipeline in the background
// using EdgeRuntime.waitUntil so it survives past the HTTP response.
// Progress is written incrementally to research_jobs so the client can
// subscribe via Supabase realtime instead of polling.

import { createClient } from "npm:@supabase/supabase-js@2";
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};

// @ts-ignore Deno global in edge runtime
declare const EdgeRuntime: { waitUntil: (p: Promise<unknown>) => void };

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const SERPER_API_KEY = Deno.env.get("SERPER_API_KEY");
const HB_API_KEY = Deno.env.get("HYPERBROWSER_API_KEY");
const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

type JobPatch = {
  status?: string;
  progress?: number;
  stage?: string;
  plan?: unknown;
  steps?: unknown;
  sources?: unknown;
  images?: unknown;
  report?: string;
  error?: string;
  started_at?: string;
  finished_at?: string;
  duration_ms?: number;
};

async function patchJob(jobId: string, patch: JobPatch) {
  await admin.from("research_jobs").update(patch).eq("id", jobId);
}

async function appendStep(jobId: string, step: Record<string, unknown>) {
  const { data } = await admin
    .from("research_jobs")
    .select("steps")
    .eq("id", jobId)
    .maybeSingle();
  const steps = Array.isArray((data as any)?.steps) ? (data as any).steps : [];
  steps.push({ at: new Date().toISOString(), ...step });
  await admin.from("research_jobs").update({ steps }).eq("id", jobId);
}

// ---- LLM planning ----
async function planQueries(query: string, language: string | null): Promise<string[]> {
  if (!LOVABLE_API_KEY) return [query];
  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "You are a research planner. Given a topic, output 4-6 diverse, specific web search queries (one per line, no numbering, no quotes) that together cover the topic comprehensively. Match the user's language.",
          },
          { role: "user", content: `Topic (${language || "auto"}): ${query}` },
        ],
        temperature: 0.4,
      }),
    });
    const json = await res.json();
    const text: string = json?.choices?.[0]?.message?.content || "";
    const lines = text
      .split("\n")
      .map((l) => l.replace(/^[\-\*\d\.\)\s]+/, "").trim())
      .filter((l) => l.length > 4)
      .slice(0, 6);
    return lines.length ? lines : [query];
  } catch {
    return [query];
  }
}

// ---- Serper search ----
type Source = { title: string; url: string; snippet?: string; query?: string };

async function serperSearch(q: string): Promise<{ organic: Source[]; images: string[] }> {
  if (!SERPER_API_KEY) return { organic: [], images: [] };
  try {
    const [web, img] = await Promise.all([
      fetch("https://google.serper.dev/search", {
        method: "POST",
        headers: { "X-API-KEY": SERPER_API_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ q, num: 10 }),
      }).then((r) => r.json()),
      fetch("https://google.serper.dev/images", {
        method: "POST",
        headers: { "X-API-KEY": SERPER_API_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ q, num: 6 }),
      })
        .then((r) => r.json())
        .catch(() => ({})),
    ]);
    const organic: Source[] = (web?.organic || []).slice(0, 8).map((o: any) => ({
      title: o.title,
      url: o.link,
      snippet: o.snippet,
      query: q,
    }));
    const images: string[] = (img?.images || [])
      .slice(0, 6)
      .map((i: any) => i.imageUrl)
      .filter(Boolean);
    return { organic, images };
  } catch {
    return { organic: [], images: [] };
  }
}

// ---- Page extraction via Firecrawl (preferred) or Hyperbrowser ----
async function extractPage(url: string): Promise<string> {
  if (FIRECRAWL_API_KEY) {
    try {
      const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
        method: "POST",
        headers: { Authorization: `Bearer ${FIRECRAWL_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ url, formats: ["markdown"], onlyMainContent: true }),
      });
      const json = await res.json();
      const md: string = json?.data?.markdown || "";
      return md.slice(0, 8000);
    } catch {
      /* fall through */
    }
  }
  if (HB_API_KEY) {
    try {
      const res = await fetch("https://app.hyperbrowser.ai/api/scrape", {
        method: "POST",
        headers: { "x-api-key": HB_API_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ url, outputFormat: ["markdown"], onlyMainContent: true }),
      });
      const json = await res.json();
      const md: string = json?.data?.markdown || json?.markdown || "";
      return md.slice(0, 8000);
    } catch {
      /* ignore */
    }
  }
  return "";
}

// ---- Synthesis ----
async function synthesize(
  query: string,
  language: string | null,
  sources: Source[],
  excerpts: { url: string; text: string }[],
): Promise<string> {
  if (!LOVABLE_API_KEY) {
    return `# ${query}\n\n${sources.map((s, i) => `${i + 1}. [${s.title}](${s.url})`).join("\n")}`;
  }
  const context = excerpts
    .filter((e) => e.text)
    .map((e, i) => `### Source ${i + 1}: ${e.url}\n${e.text}`)
    .join("\n\n---\n\n")
    .slice(0, 60_000);

  const sourceList = sources
    .map((s, i) => `[${i + 1}] ${s.title} — ${s.url}`)
    .join("\n");

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-pro",
      messages: [
        {
          role: "system",
          content: `You are a meticulous research analyst. Write a comprehensive, well-structured research report in Markdown. Use clear H2/H3 headings, bullet points where useful, and inline numeric citations like [1], [2] mapping to the source list. End with a "## Sources" section listing each source. Always reply in the user's language (${language || "auto-detect"}). Be thorough, balanced, and specific — avoid generic filler.`,
        },
        {
          role: "user",
          content: `Research topic: ${query}\n\nSource list:\n${sourceList}\n\nExtracted context:\n${context}`,
        },
      ],
      temperature: 0.3,
    }),
  });
  const json = await res.json();
  return json?.choices?.[0]?.message?.content || "Report generation failed.";
}

// ---- Background pipeline ----
// Phase 1: planning only. Stops at `awaiting_approval`.
async function runPlanningPhase(jobId: string, query: string, language: string | null) {
  const startedAt = Date.now();
  try {
    await patchJob(jobId, {
      status: "planning",
      progress: 5,
      stage: "Planning queries",
      started_at: new Date(startedAt).toISOString(),
    });

    const plan = await planQueries(query, language);
    await appendStep(jobId, { type: "plan", queries: plan });
    await patchJob(jobId, {
      plan,
      progress: 12,
      stage: "Awaiting approval",
      status: "awaiting_approval",
    });
  } catch (e) {
    const finishedAt = Date.now();
    await patchJob(jobId, {
      status: "failed",
      stage: "Failed",
      error: (e as Error)?.message || String(e),
      finished_at: new Date(finishedAt).toISOString(),
      duration_ms: finishedAt - startedAt,
    });
  }
}

// Phase 2: searching + extraction + synthesis. Runs after user approves the plan.
async function runExecutionPhase(jobId: string, query: string, language: string | null, plan: string[]) {
  const startedAt = Date.now();
  try {
    await patchJob(jobId, {
      status: "searching",
      progress: 18,
      stage: "Searching the web",
      plan,
    });
    await appendStep(jobId, { type: "approved", queries: plan });

    const allSources: Source[] = [];
    const allImages: string[] = [];
    const seen = new Set<string>();

    for (let i = 0; i < plan.length; i++) {
      const q = plan[i];
      await appendStep(jobId, { type: "searching", query: q, index: i + 1, total: plan.length });
      const { organic, images } = await serperSearch(q);
      for (const s of organic) {
        if (s.url && !seen.has(s.url)) {
          seen.add(s.url);
          allSources.push(s);
        }
      }
      for (const im of images) if (!allImages.includes(im)) allImages.push(im);

      await patchJob(jobId, {
        sources: allSources,
        images: allImages,
        progress: 18 + Math.round(((i + 1) / plan.length) * 32),
        stage: `Searched ${i + 1}/${plan.length}`,
      });
      await appendStep(jobId, { type: "search", query: q, results: organic.length });
    }

    // Extract top N pages in parallel batches with per-URL step tracking.
    const TOP = Math.min(8, allSources.length);
    await patchJob(jobId, { stage: `Extracting ${TOP} pages` });
    const excerpts: { url: string; text: string }[] = [];
    const top = allSources.slice(0, TOP);
    const batchSize = 3;
    for (let i = 0; i < top.length; i += batchSize) {
      const batch = top.slice(i, i + batchSize);
      // Announce reads
      for (const s of batch) {
        const host = (() => { try { return new URL(s.url).hostname.replace(/^www\./, ""); } catch { return s.url; } })();
        await appendStep(jobId, { type: "reading", url: s.url, host, title: s.title });
      }
      const results = await Promise.all(
        batch.map(async (s) => {
          const t0 = Date.now();
          const text = await extractPage(s.url);
          const host = (() => { try { return new URL(s.url).hostname.replace(/^www\./, ""); } catch { return s.url; } })();
          await appendStep(jobId, { type: "read", url: s.url, host, ms: Date.now() - t0, chars: text.length });
          return { url: s.url, text };
        }),
      );
      excerpts.push(...results);
      await patchJob(jobId, {
        progress: 50 + Math.round(((i + batch.length) / top.length) * 30),
        stage: `Extracted ${Math.min(i + batch.length, top.length)}/${top.length} pages`,
      });
    }
    await appendStep(jobId, {
      type: "extract",
      pages: excerpts.length,
      withContent: excerpts.filter((e) => e.text).length,
    });

    await patchJob(jobId, { status: "synthesizing", progress: 85, stage: "Synthesizing report" });
    await appendStep(jobId, { type: "synthesizing" });

    const report = await synthesize(query, language, allSources, excerpts);

    const finishedAt = Date.now();
    await patchJob(jobId, {
      status: "succeeded",
      progress: 100,
      stage: "Done",
      report,
      finished_at: new Date(finishedAt).toISOString(),
      duration_ms: finishedAt - startedAt,
    });
    await appendStep(jobId, { type: "done", length: report.length });
  } catch (e) {
    const finishedAt = Date.now();
    await patchJob(jobId, {
      status: "failed",
      stage: "Failed",
      error: (e as Error)?.message || String(e),
      finished_at: new Date(finishedAt).toISOString(),
      duration_ms: finishedAt - startedAt,
    });
  }
}


// ---- HTTP entry ----
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) {
      return new Response(JSON.stringify({ error: "auth_required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: userData } = await userClient.auth.getUser();
    const user = userData?.user;
    if (!user) {
      return new Response(JSON.stringify({ error: "invalid_token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const action = body?.action || "start";

    if (action === "cancel" && body?.jobId) {
      await admin
        .from("research_jobs")
        .update({ status: "cancelled", stage: "Cancelled", finished_at: new Date().toISOString() })
        .eq("id", body.jobId)
        .eq("user_id", user.id);
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "approve" && body?.jobId) {
      // Load the job, validate ownership + status, then resume execution phase.
      const { data: job } = await admin
        .from("research_jobs")
        .select("id, user_id, query, language, plan, status")
        .eq("id", body.jobId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (!job) {
        return new Response(JSON.stringify({ error: "job_not_found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if ((job as any).status !== "awaiting_approval" && (job as any).status !== "planning") {
        return new Response(JSON.stringify({ error: "invalid_status", status: (job as any).status }), {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Allow user-edited plan: array of 1-12 non-empty strings.
      let plan: string[] = Array.isArray((job as any).plan) ? (job as any).plan : [];
      if (Array.isArray(body?.plan)) {
        const cleaned = body.plan
          .map((s: unknown) => (typeof s === "string" ? s.trim() : ""))
          .filter((s: string) => s.length > 2)
          .slice(0, 12);
        if (cleaned.length) plan = cleaned;
      }
      await admin
        .from("research_jobs")
        .update({ approved_at: new Date().toISOString(), plan })
        .eq("id", body.jobId);

      try {
        EdgeRuntime.waitUntil(runExecutionPhase(body.jobId, (job as any).query, (job as any).language, plan));
      } catch {
        runExecutionPhase(body.jobId, (job as any).query, (job as any).language, plan);
      }
      return new Response(JSON.stringify({ success: true, jobId: body.jobId }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // start
    const query: string = (body?.query || "").toString().trim();
    if (!query) {
      return new Response(JSON.stringify({ error: "query_required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const language: string | null = body?.language || null;
    const conversationId: string | null = body?.conversationId || null;
    // Optional: skip the plan-approval gate (auto-run end-to-end).
    const autoApprove: boolean = body?.autoApprove === true;

    const { data: inserted, error: insErr } = await admin
      .from("research_jobs")
      .insert({
        user_id: user.id,
        conversation_id: conversationId,
        query,
        language,
        status: "queued",
        progress: 0,
        stage: "Queued",
      })
      .select("id")
      .single();

    if (insErr || !inserted) {
      return new Response(JSON.stringify({ error: insErr?.message || "insert_failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fire-and-forget background pipeline (planning phase only — stops at awaiting_approval).
    const startPlanThenMaybeRun = async () => {
      await runPlanningPhase(inserted.id, query, language);
      if (autoApprove) {
        // Fetch the plan we just produced and run execution.
        const { data: row } = await admin
          .from("research_jobs")
          .select("plan")
          .eq("id", inserted.id)
          .maybeSingle();
        const plan = Array.isArray((row as any)?.plan) ? (row as any).plan : [query];
        await admin
          .from("research_jobs")
          .update({ approved_at: new Date().toISOString() })
          .eq("id", inserted.id);
        await runExecutionPhase(inserted.id, query, language, plan);
      }
    };
    try {
      EdgeRuntime.waitUntil(startPlanThenMaybeRun());
    } catch {
      startPlanThenMaybeRun();
    }


    return new Response(JSON.stringify({ jobId: inserted.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
