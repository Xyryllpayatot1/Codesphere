import { NetworkSimulator } from "../src/lib/net/sim";
import { NET_MISSIONS, missionStart } from "../src/lib/net/missions";
import { TOPOLOGIES, buildTopology } from "../src/lib/net/topology";

for (const m of NET_MISSIONS) {
  const sim = new NetworkSimulator(missionStart(m) ?? undefined);
  const r = m.verify(sim);
  console.log(`[mission:${m.slug}] devices=${sim.devices.length} cables=${sim.cables.length} -> ${r.ok ? "PASS" : "FAIL"}: ${r.message}`);
  r.hints.forEach((h) => console.log(`    hint: ${h}`));
}

console.log("---");
for (const t of TOPOLOGIES) {
  const sim = new NetworkSimulator(buildTopology(t.id as never));
  console.log(`[topo:${t.id}] devices=${sim.devices.length} cables=${sim.cables.length} ${t.title}`);
}
