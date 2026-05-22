// Limited, safe sandbox tools. Real shell execution is not available on
// Cloudflare Workers / Supabase Edge runtimes — these expose lightweight
// alternatives that the agent can reason about.

import type { ToolResult } from "../types";

// Tiny safe math evaluator. Accepts numbers, + - * / % ( ) and decimal points.
export function sandboxEvalMath(args: { expr: string }): ToolResult<{ value: number }> {
  const expr = (args.expr || "").trim();
  if (!/^[\d+\-*/%().\s]+$/.test(expr)) return { ok: false, error: "expression_not_allowed" };
  try {
    // eslint-disable-next-line @typescript-eslint/no-implied-eval, no-new-func
    const fn = new Function(`"use strict";return (${expr});`);
    const value = Number(fn());
    if (!Number.isFinite(value)) return { ok: false, error: "non_finite_result" };
    return { ok: true, data: { value } };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

// Run a tiny JS snippet in a fresh Function-scope. No network, no fs, no
// process. Caller must keep code under 4KB and total runtime under ~50ms by
// nature of being inline JS. NOT a real sandbox — only safe for pure
// computation on inputs.
export async function sandboxRunJs(args: {
  code: string;
  input?: unknown;
}): Promise<ToolResult<{ result: unknown }>> {
  const code = args.code || "";
  if (code.length > 4096) return { ok: false, error: "code_too_long" };
  if (/\b(fetch|XMLHttpRequest|require|import|process|globalThis|Deno|window|document)\b/.test(code)) {
    return { ok: false, error: "disallowed_identifier" };
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-implied-eval, no-new-func
    const fn = new Function("input", `"use strict";${code}`);
    const result = await Promise.resolve(fn(args.input));
    return { ok: true, data: { result } };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
