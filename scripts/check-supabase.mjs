import nextEnv from "@next/env";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

/** Read-only diagnostics: no accounts, messages, profile writes or raw provider output. */
export async function checkSupabase({ env, fetchImpl = fetch }) {
  const checks = [];
  const add = (name, ok, detail) => checks.push({ name, ok, detail });
  const key = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";
  let origin;
  try {
    const url = new URL(env.NEXT_PUBLIC_SUPABASE_URL || "");
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    if ((url.protocol !== "https:" && !(local && url.protocol === "http:")) ||
      url.username || url.password || url.search || url.hash || url.pathname !== "/") throw new Error();
    origin = url.origin;
  } catch {
    add("Configuration", false, "Set a valid Supabase origin without credentials, query parameters or paths.");
  }
  if (!/^sb_publishable_[A-Za-z0-9_-]+$/.test(key)) {
    add("Configuration", false, "Set NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY to a publishable key, never a secret/service-role key.");
  }
  if (checks.length) return { ok: false, checks };
  add("Configuration", true, "Valid origin and browser-safe publishable key; values withheld.");

  async function probe(name, path, validate) {
    try {
      const response = await fetchImpl(`${origin}${path}`, {
        method: "GET", headers: { apikey: key }, redirect: "error", signal: AbortSignal.timeout(15000),
      });
      const payload = await response.json();
      if (!response.ok) {
        const code = typeof payload?.code === "string" && /^(?:[0-9A-Z]{5}|PGRST\d{3})$/.test(payload.code)
          ? `; ${payload.code}` : "";
        add(name, false, `Not verified (HTTP ${response.status}${code}).`);
        return;
      }
      const detail = validate(payload);
      add(name, Boolean(detail), detail || "Provider response does not confirm the required setup.");
    } catch {
      add(name, false, "Request failed, timed out or returned an invalid response; sensitive details withheld.");
    }
  }

  await probe("Email Auth", "/auth/v1/settings", (settings) => {
    if (settings?.external?.email !== true || settings?.disable_signup !== false) return null;
    return `Email sign-in and signups enabled; email confirmation ${settings.mailer_autoconfirm === true ? "disabled" : "required"}.`;
  });
  for (const [table, columns] of [
    ["profiles", "id,full_name,college,phone,house,created_at,updated_at"],
    ["contact_messages", "id,name,email,topic,message,source,created_at"],
  ]) {
    const query = new URLSearchParams({ select: columns, limit: "0" });
    await probe(table, `/rest/v1/${table}?${query}`, (rows) => Array.isArray(rows) && rows.length === 0
      ? "Expected columns accessible (zero-row read; writes and RLS not certified)." : null);
  }
  return { ok: checks.every(({ ok }) => ok), checks };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    nextEnv.loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production", { info() {}, error() {} });
    const result = await checkSupabase({ env: process.env });
    for (const check of result.checks) console.log(`${check.ok ? "PASS" : "FAIL"} ${check.name}: ${check.detail}`);
    console.log(result.ok
      ? "Read-only checks passed. Live account persistence, RLS, triggers, SMTP and redirect settings still require administrative verification."
      : "Setup is not fully verified. Review failed checks; schema changes require an authorized administrative connection.");
    process.exitCode = result.ok ? 0 : 1;
  } catch {
    console.error("Supabase verification could not finish; sensitive details withheld.");
    process.exitCode = 1;
  }
}
