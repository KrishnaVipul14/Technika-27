// Test-only HTTP boundary. Never imported by the application or connected to real Supabase.
import { createServer } from "node:http";
import { createHmac } from "node:crypto";
import { mkdtemp, symlink, copyFile, cp, rm } from "node:fs/promises";
import { watch } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawn, execFileSync } from "node:child_process";

const root = resolve(".");
const temporaryRoot = await mkdtemp(join(tmpdir(), "technika-common-room-"));
for (const dir of ["public", "node_modules"]) await symlink(join(root, dir), join(temporaryRoot, dir), process.platform === "win32" ? "junction" : "dir");
await cp(join(root, "src"), join(temporaryRoot, "src"), { recursive: true });
let copyTimer;
const watcher = watch(join(root, "src"), { recursive: true }, () => {
  clearTimeout(copyTimer);
  copyTimer = setTimeout(() => void cp(join(root, "src"), join(temporaryRoot, "src"), { recursive: true, force: true }), 250);
});
for (const file of ["package.json", "tsconfig.json", "next.config.ts", "postcss.config.mjs"]) await copyFile(join(root, file), join(temporaryRoot, file));
const userId = "10000000-0000-4000-8000-000000000001";
const defaults = { house: "slytherin", name: "Rowan Vale", missing: false, profileError: false, revoked: false, directoryError: false, empty: false };
let state = { ...defaults };
let requests = [];
const secret = "local-common-room-test-signing-key-not-a-live-credential";
const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
const user = () => ({ id: state.id || userId, aud: "authenticated", role: "authenticated", email: state.email || "rowan@example.invalid", email_confirmed_at: state.signup === "confirmation-required" ? undefined : "2026-01-01T00:00:00Z", created_at: "2026-01-01T00:00:00Z", app_metadata: { provider: "email", providers: ["email"] }, user_metadata: state.metadata || { display_name: "Metadata Name", house: "gryffindor" }, identities: [] });
function session() {
  const now = Math.floor(Date.now() / 1000);
  const body = `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ sub: user().id, aud: "authenticated", role: "authenticated", iat: now, exp: now + 3600, iss: "http://127.0.0.1:3411/auth/v1", session_id: "20000000-0000-4000-8000-000000000001", email: user().email })}`;
  return { access_token: `${body}.${createHmac("sha256", secret).update(body).digest("base64url")}`, refresh_token: "local-test-refresh", token_type: "bearer", expires_in: 3600, expires_at: now + 3600, user: user() };
}
function validToken(token) {
  const pieces = token?.split(".");
  return pieces?.length === 3 && createHmac("sha256", secret).update(`${pieces[0]}.${pieces[1]}`).digest("base64url") === pieces[2] && !state.revoked;
}
const fixture = createServer(async (request, response) => {
  const url = new URL(request.url, "http://127.0.0.1:3411");
  const send = (value, status = 200) => {
    response.writeHead(status, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*", "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS", "Access-Control-Expose-Headers": "content-range" });
    response.end(JSON.stringify(value));
  };
  if (request.method === "OPTIONS") return send({});
  if (url.pathname === "/__scenario" && request.method === "POST") {
    let body = ""; for await (const chunk of request) body += chunk;
    const patch = JSON.parse(body);
    if (patch.reset) { state = { ...defaults }; requests = []; }
    state = { ...state, ...patch };
    return send(state);
  }
  if (url.pathname === "/__session") return send(session());
  if (url.pathname === "/__requests") return send(requests);
  if (url.pathname === "/health") return send({ ok: true });
  requests.push({ method: request.method, path: url.pathname, query: Object.fromEntries(url.searchParams) });
  requests = requests.slice(-1000);
  if (url.pathname === "/auth/v1/signup" && request.method === "POST" && state.signup) {
    let body = ""; for await (const chunk of request) body += chunk;
    const payload = JSON.parse(body);
    if (!payload.email || !payload.password || !payload.data) return send({ code: "validation_failed", msg: "Invalid signup payload" }, 422);
    if (state.signup === "error") return send({ code: "user_already_exists", msg: "User already registered" }, 422);
    state.email = payload.email; state.metadata = { ...payload.data, house: "gryffindor" };
    return send(state.signup === "confirmed" ? session() : user());
  }
  if (url.pathname === "/auth/v1/recover" && request.method === "POST" && state.signup) return send({});
  if (url.pathname === "/auth/v1/user") {
    if (!validToken(request.headers.authorization?.replace(/^Bearer /, ""))) return send({ code: "bad_jwt", msg: "Session is not valid" }, 401);
    if (request.method === "PUT" && state.signup) {
      let body = ""; for await (const chunk of request) body += chunk;
      const payload = JSON.parse(body);
      if (payload.data) state.metadata = { ...user().user_metadata, ...payload.data };
    }
    return send(user());
  }
  if (url.pathname === "/auth/v1/logout") return send({});
  if (url.pathname === "/auth/v1/token") return state.revoked ? send({ code: "refresh_token_not_found", msg: "Revoked" }, 401) : send(session());
  if (url.pathname === "/rest/v1/profiles" && request.method === "GET") {
    const own = Boolean(url.searchParams.get("id"));
    if (state.profileError || (!own && state.directoryError)) return send({ code: "XX000", message: "Fixture profile read failed" }, 500);
    let rows = own ? (state.missing ? [] : [{ id: user().id, full_name: state.name, college: "BIT Patna", house: state.house, phone: "PRIVATE_PHONE_FIXTURE" }]) : state.empty ? [] : [
      ...Array.from({ length: 28 }, (_, i) => ({ id: `member-${i}`, full_name: `House member ${String(i + 1).padStart(2, "0")}`, house: state.house, phone: "PRIVATE_PHONE_FIXTURE", email: "private-member@example.invalid" })),
      { id: "other-house", full_name: "Other house member", house: "hufflepuff", phone: "PRIVATE_PHONE_FIXTURE" },
    ];
    const houseFilter = url.searchParams.get("house");
    if (houseFilter) {
      const pattern = houseFilter.replace(/^(ilike|eq)\./, "").replace(/[%*]/g, "").toLowerCase();
      rows = rows.filter((row) => String(row.house).toLowerCase().includes(pattern));
    }
    const offset = Number(url.searchParams.get("offset") || 0);
    const limit = Number(url.searchParams.get("limit") || rows.length);
    const columns = url.searchParams.get("select")?.split(",") || ["*"];
    rows = rows.slice(offset, offset + limit).map((row) => columns.includes("*") ? row : Object.fromEntries(columns.map((key) => [key, row[key] ?? null])));
    return send(request.headers.accept?.includes("vnd.pgrst.object") ? rows[0] || null : rows);
  }
  return send({ message: `Unexpected fixture request: ${request.method} ${url.pathname}` }, 404);
});
await new Promise((done) => fixture.listen(3411, "127.0.0.1", done));
const next = spawn(process.execPath, [join(root, "node_modules/next/dist/bin/next"), "dev", temporaryRoot, "--webpack", "--hostname", "127.0.0.1", "--port", "3410"], {
  cwd: temporaryRoot,
  stdio: "inherit",
  env: { ...process.env, NODE_ENV: "development", NEXT_TELEMETRY_DISABLED: "1", NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:3411", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "local-test-publishable-key", NEXT_PUBLIC_SITE_URL: "http://127.0.0.1:3410", NEXT_PUBLIC_GA_MEASUREMENT_ID: "" },
});
console.log(`Common Room test project: ${temporaryRoot}`);
let stopping = false;
async function stop() {
  if (stopping) return; stopping = true;
  fixture.close(); watcher.close(); clearTimeout(copyTimer);
  if (next.pid) {
    if (process.platform === "win32") { try { execFileSync("taskkill", ["/PID", String(next.pid), "/T", "/F"], { stdio: "ignore" }); } catch {} }
    else next.kill("SIGTERM");
  }
  await rm(temporaryRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 500 }).catch(() => {});
  process.exit(0);
}
process.on("SIGINT", stop); process.on("SIGTERM", stop);
next.on("exit", () => void stop());
