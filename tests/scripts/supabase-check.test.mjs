import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { access, mkdtemp, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import test from "node:test";

const moduleUrl = new URL("../../scripts/check-supabase.mjs", import.meta.url);
const env = {
  NEXT_PUBLIC_SUPABASE_URL: "https://fixture.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_fixture-only",
};

async function loadChecker() {
  assert.equal(await access(moduleUrl).then(() => true, () => false), true, "Supabase checker must exist");
  return (await import(moduleUrl)).checkSupabase;
}

function provider({ profiles = 200, contacts = 200, email = true, signup = true, rows = [] } = {}) {
  const requests = [];
  const fetchImpl = async (input, init) => {
    const url = new URL(input);
    requests.push({ url, method: init?.method || "GET" });
    if (url.pathname === "/auth/v1/settings") {
      return Response.json({ external: { email }, disable_signup: !signup, mailer_autoconfirm: false });
    }
    const status = url.pathname === "/rest/v1/profiles" ? profiles : contacts;
    return Response.json(status === 200 ? rows : {
      code: status === 404 ? "PGRST205" : "42703",
      message: `Do not leak ${env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY} or private@example.invalid`,
      details: "Confidential provider details",
      hint: "Confidential provider hint",
    }, { status });
  };
  return { requests, fetchImpl };
}

test("missing configuration fails before any network request", async () => {
  const checkSupabase = await loadChecker();
  const { requests, fetchImpl } = provider();
  const result = await checkSupabase({ env: {}, fetchImpl });
  assert.equal(result.ok, false);
  assert.equal(requests.length, 0);
});

test("secret keys and credential-bearing URLs never reach the provider or output", async () => {
  const checkSupabase = await loadChecker();
  for (const overrides of [
    { NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_secret_do-not-print" },
    { NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "your-project-publishable-key" },
    { NEXT_PUBLIC_SUPABASE_URL: "not a URL with do-not-print" },
    { NEXT_PUBLIC_SUPABASE_URL: "https://user:do-not-print@fixture.supabase.co" },
    { NEXT_PUBLIC_SUPABASE_URL: "https://fixture.supabase.co?token=do-not-print" },
    { NEXT_PUBLIC_SUPABASE_URL: "http://fixture.supabase.co" },
  ]) {
    const { requests, fetchImpl } = provider();
    const result = await checkSupabase({ env: { ...env, ...overrides }, fetchImpl });
    assert.equal(result.ok, false);
    assert.equal(requests.length, 0);
    assert.doesNotMatch(JSON.stringify(result), /do-not-print|sb_secret_|user:/);
  }
});

test("healthy checks read Auth and both schemas with only zero-row GET requests", async () => {
  const checkSupabase = await loadChecker();
  const { requests, fetchImpl } = provider();
  const result = await checkSupabase({ env, fetchImpl });
  assert.equal(result.ok, true);
  assert.equal(result.checks.length, 4);
  assert.deepEqual(requests.map(({ url }) => url.pathname).sort(), [
    "/auth/v1/settings", "/rest/v1/contact_messages", "/rest/v1/profiles",
  ]);
  assert.equal(requests.every(({ method }) => method === "GET"), true);
  const probes = requests.filter(({ url }) => url.pathname.startsWith("/rest/"));
  assert.equal(probes.every(({ url }) => url.searchParams.get("limit") === "0"), true);
  assert.equal(probes.find(({ url }) => url.pathname.endsWith("/profiles")).url.searchParams.get("select"),
    "id,full_name,college,phone,house,created_at,updated_at");
  assert.equal(probes.find(({ url }) => url.pathname.endsWith("/contact_messages")).url.searchParams.get("select"),
    "id,name,email,topic,message,source,created_at");
  assert.doesNotMatch(JSON.stringify(result), /sb_publishable_|fixture\.supabase/);
});

test("schema drift fails overall and reports only safe HTTP/error codes", async () => {
  const checkSupabase = await loadChecker();
  const { fetchImpl } = provider({ profiles: 400, contacts: 404 });
  const result = await checkSupabase({ env, fetchImpl });
  assert.equal(result.ok, false);
  assert.equal(result.checks.filter(({ ok }) => !ok).length, 2);
  assert.match(JSON.stringify(result), /42703/);
  assert.match(JSON.stringify(result), /PGRST205/);
  assert.doesNotMatch(JSON.stringify(result), /sb_publishable_|private@|Confidential/);
});

test("network failures never include the raw exception or credentials", async () => {
  const checkSupabase = await loadChecker();
  const result = await checkSupabase({ env, fetchImpl: async () => {
    throw new Error(`Network failure for ${env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY}`);
  } });
  assert.equal(result.ok, false);
  assert.equal(result.checks.filter(({ ok }) => !ok).length, 3);
  assert.doesNotMatch(JSON.stringify(result), /sb_publishable_/);
});

test("disabled Email Auth or disabled signups fails the account setup check", async () => {
  const checkSupabase = await loadChecker();
  for (const options of [{ email: false }, { signup: false }]) {
    const result = await checkSupabase({ env, ...provider(options) });
    assert.equal(result.ok, false);
    assert.equal(result.checks.find(({ name }) => name === "Email Auth").ok, false);
  }
});

test("zero-row probes cannot certify unexpected objects or returned personal records", async () => {
  const checkSupabase = await loadChecker();
  for (const rows of [{ error: "private provider payload" }, [{ phone: "private-phone" }]]) {
    const result = await checkSupabase({ env, ...provider({ rows }) });
    assert.equal(result.ok, false);
    assert.equal(result.checks.filter(({ ok }) => !ok).length, 2);
    assert.doesNotMatch(JSON.stringify(result), /private provider payload|private-phone/);
  }
});

test("CLI loads ignored local env and exits nonzero for schema gaps without leaking values", async (t) => {
  await loadChecker();
  const folder = await mkdtemp(join(tmpdir(), "technika-supabase-cli-"));
  t.after(() => rm(folder, { recursive: true, force: true }));
  let missingContact = false;
  const server = createServer(async (request, response) => {
    const fixture = provider({ contacts: missingContact ? 404 : 200 });
    const result = await fixture.fetchImpl(`http://localhost${request.url}`, { method: request.method });
    response.writeHead(result.status, { "Content-Type": "application/json" });
    response.end(await result.text());
  });
  await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
  t.after(() => new Promise((resolve) => server.close(resolve)));
  await writeFile(join(folder, ".env.local"),
    `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:${server.address().port}\nNEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY}\n`);
  const childEnv = Object.fromEntries(Object.entries(process.env).filter(([name]) => !/SUPABASE|__NEXT_PROCESSED_ENV/.test(name)));
  childEnv.NODE_ENV = "development";
  const run = () => promisify(execFile)(process.execPath, [fileURLToPath(moduleUrl)], {
    cwd: folder, env: childEnv, timeout: 10000,
  });
  const good = await run();
  assert.match(good.stdout, /Read-only checks passed/);
  assert.doesNotMatch(good.stdout + good.stderr, /sb_publishable_|127\.0\.0\.1/);
  missingContact = true;
  await assert.rejects(run(), (error) => {
    assert.equal(error.code, 1);
    assert.match(error.stdout, /FAIL contact_messages/);
    assert.match(error.stdout, /PGRST205/);
    assert.doesNotMatch(error.stdout + error.stderr, /sb_publishable_|private@|127\.0\.0\.1/);
    return true;
  });
});
