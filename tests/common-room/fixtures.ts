import { createServerClient } from "@supabase/ssr";
import type { Page } from "@playwright/test";

export type Scenario = { house?: string | null; name?: string; missing?: boolean; profileError?: boolean; revoked?: boolean; directoryError?: boolean; empty?: boolean };
const fixtureUrl = "http://127.0.0.1:3411";
export async function setFixtureScenario(scenario: Scenario & { reset?: boolean }) {
  const response = await fetch(`${fixtureUrl}/__scenario`, { method: "POST", body: JSON.stringify(scenario) });
  if (!response.ok) throw new Error("Local fixture unavailable");
}
export async function signInFixture(page: Page, scenario: Scenario = {}) {
  await setFixtureScenario({ reset: true, ...scenario });
  const session = await (await fetch(`${fixtureUrl}/__session`)).json();
  const cookies: { name: string; value: string; domain: string; path: string; sameSite: "Lax"; httpOnly: boolean; secure: boolean }[] = [];
  const client = createServerClient(fixtureUrl, "local-test-publishable-key", {
    cookies: { getAll: () => [], setAll: (items) => { for (const { name, value } of items) cookies.push({ name, value, domain: "127.0.0.1", path: "/", sameSite: "Lax", httpOnly: false, secure: false }); } },
  });
  const { error } = await client.auth.setSession(session);
  if (error) throw error;
  await page.context().addCookies(cookies);
  await page.addInitScript(() => localStorage.setItem("technika:house:v1", "gryffindor"));
}
export async function fixtureRequests(): Promise<{ method: string; path: string; query: Record<string, string> }[]> {
  return (await fetch(`${fixtureUrl}/__requests`)).json();
}
