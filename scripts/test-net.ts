import { NetworkSimulator, buildTemplate } from "../src/lib/net/sim";
import { runCommand, cmdSuggestions } from "../src/lib/net/commands";

function p(label: string, r: { ok: boolean; summary: string; error?: string }) {
  console.log(`[${r.ok ? "OK" : "FAIL"}] ${label}: ${r.error ?? r.summary}`);
}

// 1. small-lan template: configure server IP, then DHCP the PCs, then ping.
{
  const sim = new NetworkSimulator(buildTemplate("small-lan"));
  const server = sim.devices.find((d) => d.type === "server")!;
  console.log("template devices:", sim.devices.map((d) => d.config.hostname).join(", "));
  const pc1 = sim.devices.find((d) => d.config.hostname === "PC1")!;
  const dhcp = sim.dhcp(pc1.id);
  p("DHCP PC1", dhcp);
  if (dhcp.device) sim.devices[sim.devices.findIndex((d) => d.id === pc1.id)] = dhcp.device;
  const pc2 = sim.devices.find((d) => d.config.hostname === "PC2")!;
  const dhcp2 = sim.dhcp(pc2.id);
  p("DHCP PC2", dhcp2);
  if (dhcp2.device) sim.devices[sim.devices.findIndex((d) => d.id === pc2.id)] = dhcp2.device;
  const pc1b = sim.devices.find((d) => d.config.hostname === "PC1")!;
  const pc2b = sim.devices.find((d) => d.config.hostname === "PC2")!;
  const ping = sim.ping(pc1b.id, pc2b.config.interfaces.find((i) => i.ip)!.ip!);
  p("PC1 -> PC2 ping", ping);
  ping.steps.forEach((s, i) => console.log(`   ${i}: [${s.layer}] ${s.deviceLabel} ${s.action} — ${s.detail}`));
  const diag = sim.diagnose(pc1b.id, server.config.interfaces.find((i) => i.ip)!.ip!);
  console.log("diagnose:", diag.ok, diag.message);
}

// 2. two-router template: PCs are unconfigured; diagnose should point at IP.
{
  const sim = new NetworkSimulator(buildTemplate("two-router"));
  const pc1 = sim.devices.find((d) => d.config.hostname === "PC1")!;
  const pc2 = sim.devices.find((d) => d.config.hostname === "PC2")!;
  pc1.config.interfaces[0] = { ...pc1.config.interfaces[0], ip: "192.168.1.10", mask: "255.255.255.0" };
  pc1.config.gateway = "192.168.1.1";
  pc2.config.interfaces[0] = { ...pc2.config.interfaces[0], ip: "192.168.2.10", mask: "255.255.255.0" };
  pc2.config.gateway = "192.168.2.1";
  const r1 = sim.devices.find((d) => d.config.hostname === "R1")!;
  r1.routes.push({ id: "r1", network: "192.168.2.0", mask: "255.255.255.0", nextHop: "10.0.0.2" });
  const r2 = sim.devices.find((d) => d.config.hostname === "R2")!;
  r2.routes.push({ id: "r2", network: "192.168.1.0", mask: "255.255.255.0", nextHop: "10.0.0.1" });
  const ping = sim.ping(pc1.id, "192.168.2.10");
  p("two-router PC1 -> PC2 (with routes)", ping);
  ping.steps.forEach((s, i) => console.log(`   ${i}: [${s.layer}] ${s.deviceLabel} ${s.action} — ${s.detail}`));
  // Remove route to verify failure + diagnose.
  r1.routes = [];
  const bad = sim.ping(pc1.id, "192.168.2.10");
  p("two-router PC1 -> PC2 (no route)", bad);
  const diag = sim.diagnose(pc1.id, "192.168.2.10");
  console.log("diagnose:", diag.step, "|", diag.message, "|", diag.hint);
}

// 3. wifi template: PC1 -> laptop through the wireless router/AP.
{
  const sim = new NetworkSimulator(buildTemplate("wifi"));
  const pc = sim.devices.find((d) => d.config.hostname === "PC1")!;
  const laptop = sim.devices.find((d) => d.config.hostname === "Laptop1")!;
  const laptopIp = laptop.config.interfaces.find((i) => i.ip)!.ip!;
  const ping = sim.ping(pc.id, laptopIp);
  p("wifi PC1 -> Laptop1 (192.168.1.20)", ping);
  ping.steps.forEach((s, i) => console.log(`   ${i}: [${s.layer}] ${s.deviceLabel} ${s.action} — ${s.detail}`));
}

// 4. Command-prompt smoke (runCommand → runPacket/DHCP).
{
  const sim = new NetworkSimulator(buildTemplate("two-router"));
  const pc1 = sim.devices.find((d) => d.config.hostname === "PC1")!;
  pc1.config.interfaces[0] = { ...pc1.config.interfaces[0], ip: "192.168.1.10", mask: "255.255.255.0" };
  pc1.config.gateway = "192.168.1.1";
  const r1 = sim.devices.find((d) => d.config.hostname === "R1")!;
  r1.routes.push({ id: "r1", network: "192.168.2.0", mask: "255.255.255.0", nextHop: "10.0.0.2" });
  const r2 = sim.devices.find((d) => d.config.hostname === "R2")!;
  r2.routes.push({ id: "r2", network: "192.168.1.0", mask: "255.255.255.0", nextHop: "10.0.0.1" });
  const pc2 = sim.devices.find((d) => d.config.hostname === "PC2")!;
  pc2.config.interfaces[0] = { ...pc2.config.interfaces[0], ip: "192.168.2.10", mask: "255.255.255.0" };
  pc2.config.gateway = "192.168.2.1";

  const snap = sim.netSnapshot();
  const run = (input: string) => {
    const res = runCommand(snap, pc1.id, input);
    console.log(`> ${input}  [ok=${res.ok}]${res.reason ? ` reason=${res.reason}` : ""}`);
    res.lines.forEach((l) => console.log("  " + l.text));
    return res;
  };
  run("hostname");
  run("ipconfig");
  run("ipconfig /all");
  run("ping 192.168.2.10");
  run("tracert 192.168.2.10");
  run("arp -a");
  run("show routes");
  run("show interfaces");
  const suggest = cmdSuggestions(snap, pc1.id, "ping ");
  console.log("suggestions for 'ping ':", suggest.map((s) => s.cmd).join(", "));
}
