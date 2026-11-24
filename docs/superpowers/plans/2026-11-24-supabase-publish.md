# Supabase verification and GitHub publication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Verify the existing Supabase configuration safely and push the verified application work to the current GitHub branch.

**Architecture:** A dependency-free Node test suite exercises a read-only checker at its external HTTP boundary. Existing Next.js/Supabase dependencies load configuration and issue zero-row probes. Git publication uses an explicit file allowlist and a normal fast-forward push.

**Tech Stack:** Node 22, Next.js 16.4.6, Supabase JS/SSR, node:test, Playwright, Git/GitHub CLI.

**Spec:** `docs/superpowers/specs/2026-11-24-supabase-publish-design.md`

## Global Constraints

- Keep `.env.local` unchanged and uncommitted; never emit credentials or provider error bodies.
- No live writes, test accounts/emails, database resets, force-pushes, merges or new backend dependencies.
- Publish to `origin/experimento`; fetch all remote heads/tags without checking out other branches.
- Preserve excluded installer, screenshots and manual verification script locally.

## Review Focus

- Missing/malformed URL and secret/public-key confusion must fail before network access.
- Every data probe must request zero rows and never modify data.
- Provider/network errors must not echo secrets, URLs or personal data.
- Missing schema must make the CLI fail, not claim complete setup.
- Remote changes and excluded artifacts must not be overwritten or silently published.

### Task 1: Read-only Supabase checker

**Files:** Create `scripts/check-supabase.mjs`, `tests/scripts/supabase-check.test.mjs`; modify `package.json`, `README.md`.

**Interfaces:** `checkSupabase({ env, fetchImpl }) -> Promise<{ ok, checks }>`; each check has `name`, `ok`, `detail`. CLI exits 0 only when every check succeeds.

- [x] Write and observe failing tests for safe configuration validation, zero-row GET probes, schema drift, redacted network/provider errors and disabled Email Auth.
- [x] Implement the checker with 15-second request deadlines, browser-safe publishable keys and Next.js environment loading.
- [x] Run offline checker regressions and the live check; record the live administrative/schema blocker without treating it as a passing setup.
- [x] Document commands, limits and the unsafe legacy-migration caveat.

### Task 2: Verify and publish accumulated application work

**Files:** Update `.gitignore` to exclude installers/test captures; stage the application/source/runtime-asset/test/doc allowlist, not scratch artifacts.

- [x] Fetch all GitHub branches/tags; confirm write permission and `experimento` has no remote-only commits (2 ahead, 0 behind).
- [x] Run `npm test`, `npm run typecheck`, checker tests, browser smoke checks, and `git diff --check`; inspect staged paths and scan staged content against actual configured credentials.
- [x] Obtain an independent read-only review and resolve important findings; perform one final robustness improvement if needed.
- [x] Commit verified application/source/docs changes locally (`62f93fe`).
- [ ] Perform a normal push to `origin/experimento` and confirm SHA equality — blocked by GitHub authentication (HTTP 403).
- [x] Confirm remote SHA remains unchanged and enumerate all five fetched branches.

## Execution ledger

Ruling: keep the existing checkout rather than create a worktree — the user requested publication of accumulated changes; isolation would omit that work. Cost if wrong: publication includes existing application changes, which are verified together before staging.

Initial evidence: GitHub repository `KrishnaVipul14/Technika-27` grants WRITE to the authenticated account. Fetched branches: `coming-soon`, `experimento`, `latest-update`, `main`, `themed-coming-soon`. Live Auth settings returned HTTP 200 with Email Auth/signups enabled and confirmation disabled. Zero-row probes returned missing `profiles.updated_at` (42703) and absent `contact_messages` (PGRST205). CLI project listing requires an unavailable access token; no Supabase MCP resources are exposed. No remote database mutations were made.

Task 1 evidence: all six initial tests failed with `Supabase checker must exist`, then passed after implementation. Live `npm run supabase:check` exits 1 with Configuration/Auth passing and both schema probes failing at HTTP 400/42703 and 404/PGRST205. This is an accurate administrative blocker, not a regression failure. `npm test` subsequently passed checker regressions, ESLint and a 34/34-page production build.

Stretch pass: an unexpected successful HTTP payload must not certify a zero-row schema read. Added the regression, observed `true !== false`, then required an empty-array response. Added a subprocess/loopback fixture that proves actual CLI `.env.local` loading, redacted output, exit 0 for healthy schemas and exit 1 for schema gaps without touching the real project.

Final verification: `npm test` passed 8/8 checker regressions, ESLint and Next.js 16.4.6 production build (34/34 pages). `npm run typecheck` and `git diff --check` passed. A browser smoke initially exposed an old process requesting an obsolete chunk (HTTP 500); rebuilding had replaced the on-disk chunk hash, so the owned preview was restarted. A longer regression attempt then outlived the tool's 120-second server timeout (20 passed, 44 connection-refused failures, 4 skips); the server was relaunched with an explicit 24-hour lifetime. The unchanged suite then passed 64/64 applicable checks with 4 device-specific skips (`test-results/supabase-publish-regressions-final`); separate rebuilt glass/fallback smoke passed 2/2, and homepage returned HTTP 200. No application patch was made for either preview-lifecycle failure.

Independent read-only review: no checker defects, 8/8 regressions, lint and non-incremental TypeScript passed independently. Review found two screenshots already in ahead commit `a12b29d`; `.gitignore` alone would not remove them. Verified both captures contain only public site/dragon UI, then used `git rm --cached` to untrack them without deleting local files. All other captures and installer remain ignored; the standalone manual script remains untracked.

Final: Ruling: preserve existing ahead commits and their two historic screenshot blobs — the user authorized a normal publication, not rewriting earlier work; the final tip excludes captures and local copies remain. Cost if wrong: those historical, non-secret screenshot blobs are still present in GitHub history. Existing model-source archive blobs are also preserved.

Review limitations upheld: live schema/RLS/triggers/SMTP/redirects and authenticated persistence cannot be certified without administration; no new whole-site/device/date certification is implied. Final remote equality and outgoing-history credential scanning are the publication gate, performed by the parent rather than claimed by the reviewer.

Publication gate: checked 42 staged files and 19 outgoing-history blobs against the configured credential value; no match, private key material or excluded artifact was found. Only `.env.example` is tracked. Final index has no screenshots, both historic local captures are preserved, and staged/working-tree whitespace checks passed. A fresh fetch confirmed `experimento` was 2 ahead/0 behind before the application commit.

**GitHub push blocker:** application commit `62f93fe` was created successfully. Normal HTTPS push using the existing macOS Keychain credential failed with HTTP 403 (`Permission ... denied to algospider`). Retrying with an explicit GitHub CLI credential helper also failed with 403, ruling out a stale Git helper alone. Existing SSH authentication failed with `Permission denied (publickey)`. Repository API reports account-level `push: true`, but the currently configured credential cannot exercise it. GitHub's authoritative branch endpoint still reports `6b576a3b0083802ea453a4fbb61d45479e152468`; publication did not happen. No force-push, auth replacement, history rewrite, fork or PR was attempted.

Current GitHub documentation states fine-grained tokens do not support contributing as an outside/repository collaborator; this is consistent with the authenticated collaborator using a fine-grained token here, but its exact grants were not inspected. Unblocking requires an authorized browser/OAuth GitHub login, an authorized SSH key, or suitable collaborator-compatible token authentication. Supabase schema setup separately requires a scoped administrative connection/token. Never place either credential in `NEXT_PUBLIC_*` variables or paste tokens into committed docs.

Task 2 outcome: verified and committed locally, all remote branches fetched, push blocked by authentication. Task 1 checker is complete; live Supabase schema reconciliation remains administratively blocked. Preview: `http://127.0.0.1:3105` (owned production server configured with a 24-hour tool lifetime).
