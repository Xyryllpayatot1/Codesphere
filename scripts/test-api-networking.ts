// End-to-end smoke test for the networking API against a running dev server.
// Usage: npx tsx scripts/test-api-networking.ts <baseUrl>
import { buildTemplate } from "../src/lib/net/sim";
import { NetworkSimulator } from "../src/lib/net/sim";

const base = process.argv[2] ?? "http://localhost:3112";

let cookie = "";
let failures = 0;

async function api(path: string, opts: { method?: string; body?: unknown } = {}) {
  const res = await fetch(`${base}${path}`, {
    method: opts.method ?? "GET",
    headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  const setCookie = res.headers.get("set-cookie");
  if (setCookie) cookie = setCookie.split(";")[0];
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }
  if (json && typeof json === "object" && "data" in (json as Record<string, unknown>)) {
    json = (json as { data: unknown }).data;
  }
  return { status: res.status, json };
}

function check(name: string, ok: boolean, extra?: string) {
  console.log(`${ok ? "[OK]" : "[FAIL]"} ${name}${extra ? ` — ${extra}` : ""}`);
  if (!ok) failures++;
}

async function main() {
  const stamp = Date.now().toString(36);
  const register = await api("/api/auth/register", {
    method: "POST",
    body: { name: "API Tester", email: `apitest${stamp}@test.dev`, username: `apitest${stamp}`, password: "testing1234" },
  });
  check("register fresh user", register.status === 200);

  // --- mission submit: wifi template is solvable as-shipped
  const wifiSnap = buildTemplate("wifi");
  const submit = await api("/api/networking/missions/home-wifi/submit", {
    method: "POST",
    body: { snapshot: wifiSnap },
  });
  const s = submit.json as { passed?: boolean; firstTime?: boolean; xpAwarded?: number; coinsAwarded?: number };
  check("submit home-wifi passed", submit.status === 200 && s.passed === true, `status=${submit.status} passed=${s.passed}`);
  check("submit home-wifi awarded xp", s.xpAwarded === 25, `xp=${s.xpAwarded}`);
  check("submit home-wifi awarded coins", s.coinsAwarded === 7, `coins=${s.coinsAwarded}`);

  // --- mission submit: lan-basics with empty network fails
  const empty = new NetworkSimulator().snapshot;
  const bad = await api("/api/networking/missions/lan-basics/submit", { method: "POST", body: { snapshot: empty } });
  const b = bad.json as { passed?: boolean; message?: string };
  check("submit lan-basics (empty) rejected", bad.status === 200 && b.passed === false, `passed=${b.passed} msg=${b.message}`);

  // --- second submit of an already-completed mission yields no new xp
  const again = await api("/api/networking/missions/home-wifi/submit", { method: "POST", body: { snapshot: wifiSnap } });
  const a = again.json as { firstTime?: boolean; xpAwarded?: number };
  check("re-submit home-wifi no double reward", a.firstTime === false && a.xpAwarded === 0, `firstTime=${a.firstTime} xp=${a.xpAwarded}`);

  // --- catalog shows completion
  const cat = await api("/api/networking/missions");
  const c = cat.json as { stats?: { completed?: number }; missions?: { status?: string }[] };
  const completed = c.stats?.completed ?? -1;
  check("mission catalog reflects completion", completed >= 1, `completed=${completed}`);

  // --- project create / list / patch / delete
  const created = await api("/api/networking/projects", {
    method: "POST",
    body: { title: "API smoke project", snapshot: wifiSnap },
  });
  const pr = created.json as { id?: string; title?: string };
  check("project created", created.status === 200 && !!pr.id, `id=${pr.id}`);

  const list = await api("/api/networking/projects");
  const l = list.json as { id?: string; title?: string; devices?: number }[];
  check("project listed", Array.isArray(l) && l.some((p) => p.id === pr.id && p.devices === 4), `found=${l?.some((p) => p.id === pr.id)}`);

  const patched = await api(`/api/networking/projects/${pr.id}`, { method: "PATCH", body: { title: "renamed" } });
  const pt = patched.json as { title?: string };
  check("project renamed", patched.status === 200 && pt.title === "renamed", `title=${pt.title}`);

  const one = await api(`/api/networking/projects/${pr.id}`);
  const o = one.json as { snapshot?: { devices?: unknown[] } };
  check("project get returns snapshot", one.status === 200 && (o.snapshot?.devices?.length ?? 0) === 4, `devices=${o.snapshot?.devices?.length}`);

  const del = await api(`/api/networking/projects/${pr.id}`, { method: "DELETE" });
  check("project deleted", del.status === 200);

  const after = await api("/api/networking/projects");
  const al = after.json as { id?: string }[];
  check("project gone after delete", Array.isArray(al) && !al.some((p) => p.id === pr.id));

  console.log(failures === 0 ? "\nALL API CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
