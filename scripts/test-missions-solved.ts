import { NetworkSimulator, buildTemplate } from "../src/lib/net/sim";
import { getMission } from "../src/lib/net/missions";

function expectOk(slug: string, sim: NetworkSimulator) {
  const m = getMission(slug)!;
  const r = m.verify(sim);
  console.log(`[solved:${slug}] ${r.ok ? "PASS" : "*** FAIL ***"} — ${r.message}`);
  if (!r.ok) r.hints.forEach((h) => console.log(`    hint: ${h}`));
  return r.ok;
}

// lan-basics — build from scratch.
{
  const sim = new NetworkSimulator();
  const sw = sim.addDevice("switch", 400, 200);
  sw.config.hostname = "SW1";
  const pc1 = sim.addDevice("pc", 200, 140);
  const pc2 = sim.addDevice("pc", 620, 140);
  pc1.config.hostname = "PC1";
  pc2.config.hostname = "PC2";
  pc1.config.interfaces[0] = { ...pc1.config.interfaces[0], ip: "192.168.1.10", mask: "255.255.255.0" };
  pc2.config.interfaces[0] = { ...pc2.config.interfaces[0], ip: "192.168.1.11", mask: "255.255.255.0" };
  sim.connect(pc1.id, "eth0", sw.id, "eth0", "copperStraight");
  sim.connect(pc2.id, "eth0", sw.id, "eth1", "copperStraight");
  expectOk("lan-basics", sim);
}

// dhcp-automation — start template, run DHCP on both PCs.
{
  const sim = new NetworkSimulator(buildTemplate("small-lan"));
  const pc1 = sim.devices.find((d) => d.config.hostname === "PC1")!;
  const pc2 = sim.devices.find((d) => d.config.hostname === "PC2")!;
  sim.devices[sim.devices.findIndex((d) => d.id === pc1.id)] = sim.dhcp(pc1.id).device!;
  sim.devices[sim.devices.findIndex((d) => d.id === pc2.id)] = sim.dhcp(pc2.id).device!;
  expectOk("dhcp-automation", sim);
}

// routing-across-networks — configure PCs + static routes.
{
  const sim = new NetworkSimulator(buildTemplate("two-router"));
  const pc1 = sim.devices.find((d) => d.config.hostname === "PC1")!;
  const pc2 = sim.devices.find((d) => d.config.hostname === "PC2")!;
  const r1 = sim.devices.find((d) => d.config.hostname === "R1")!;
  const r2 = sim.devices.find((d) => d.config.hostname === "R2")!;
  pc1.config.interfaces[0] = { ...pc1.config.interfaces[0], ip: "192.168.1.10", mask: "255.255.255.0", status: "up" };
  pc1.config.gateway = "192.168.1.1";
  pc2.config.interfaces[0] = { ...pc2.config.interfaces[0], ip: "192.168.2.10", mask: "255.255.255.0", status: "up" };
  pc2.config.gateway = "192.168.2.1";
  sim.addRoute(r1.id, "192.168.2.0", "255.255.255.0", "10.0.0.2");
  sim.addRoute(r2.id, "192.168.1.0", "255.255.255.0", "10.0.0.1");
  expectOk("routing-across-networks", sim);
}

// home-wifi — template already at goal.
{
  const sim = new NetworkSimulator(buildTemplate("wifi"));
  expectOk("home-wifi", sim);
}

// internet-connection — give cloud an IP + routes.
{
  const sim = new NetworkSimulator(buildTemplate("internet"));
  const cloud = sim.devices.find((d) => d.type === "cloud")!;
  const r1 = sim.devices.find((d) => d.config.hostname === "R1")!;
  const fw = sim.devices.find((d) => d.config.hostname === "FW1")!;
  cloud.config.interfaces[0] = { ...cloud.config.interfaces[0], ip: "203.0.113.2", mask: "255.255.255.0" };
  sim.addRoute(fw.id, "0.0.0.0", "0.0.0.0", "10.0.0.1");
  sim.addRoute(r1.id, "192.168.1.0", "255.255.255.0", "10.0.0.2");
  expectOk("internet-connection", sim);
}
