# Supabase verification and GitHub publication

## Goal and scope

Use the existing ignored `.env.local` to verify the configured Supabase project, publish the current application work to `origin/experimento`, and fetch every remote branch without merging it.

Success means: credentials never enter commits/output; Supabase checks make no writes or emails; missing schema is reported accurately; lint/build/typecheck and checker regressions pass; GitHub's branch SHA equals the local published SHA.

## Approach

Keep the existing checkout and branch because the user is publishing accumulated application work, not starting an isolated feature. Add `npm run supabase:check`, a bounded, read-only checker that loads Next.js environment files, validates the browser-safe URL/key, checks Email Auth settings, and issues zero-row schema probes for the two existing migrations. Never print keys, personal data, provider error bodies or credential-bearing URLs. An inaccessible table is not proof that its RLS is wrong: a deliberately insert-only contact role can deny a read probe.

Publish the runtime source, referenced dragon assets, styles, automated regressions and documentation. Exclude installers, generated screenshot captures from the final file tree and the existing standalone `tests/verify-dragon.spec.ts` manual script (hard-coded port and screenshot destinations). Two captures already exist in a previous unpublished commit; preserve that commit/history, untrack the captures at the final tip without deleting local files, and disclose that historical blobs remain in the push. Existing source-model archives in earlier commits remain unchanged. Do not reset user work, force-push, merge other branches, add backend dependencies, create real accounts or change live dashboard settings.

## Known blockers and security boundary

Live Auth accepts the supplied publishable key. Zero-row reads found `profiles.updated_at` missing and `contact_messages` absent. No administrative access token, database connection/password or authenticated Supabase MCP tools are available. A publishable key cannot apply SQL migrations or inspect triggers/RLS/dashboard redirect configuration.

Do not blindly apply the legacy profiles migration: `CREATE TABLE IF NOT EXISTS` does not reconcile missing columns; its unrestricted SELECT policy can expose profile phone numbers; its public SECURITY DEFINER assignment function takes arbitrary user IDs. Live policies/functions are not audited here. Schema reconciliation and security review require an authorized administrative connection, and are explicitly left blocked rather than simulated.
