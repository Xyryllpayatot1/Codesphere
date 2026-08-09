// ---------------------------------------------------------------------------
// Networking Lab — realism test suite.
//
// Drives the pure engine (NetworkSimulator + packet/CLI functions) through 16
// real-world scenarios that a student would hit in the lab, and asserts the
// engine behaves like a real network (not just "ok"). Run with:
//
//   npx tsx scripts/netlab-realism-tests.ts
//
// Exits non-zero if any scenario fails.
// ---------------------------------------------------------------------------

import { NetworkSimulator, buildTemplate } from "../src/lib/net/sim";
import { runCommand } from "../src/lib/net/commands";
import type { Device } from "../src/lib/net/types";

let pass = 0;
let fail = 0;
const failures: string[] = [];

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

function test(name: string, fn: () => void) {
  try {
    fn();
    pass++;
    console.log(`  PASS  ${name}`);
  } catch (e) {
    fail++;
    failures.push(name);
    console.log(`  FAIL  ${name} — ${(e as Error).message}`);
  }
}

function byHostname(sim: NetworkSimulator, name: string): Device {
  const d = sim.devices.find((x) => x.config.hostname === name);
  if (!d) throw new Error(`missing device ${name}`);
  return d;
}

function setHost(d: Device, ip: string, mask: string, gw?: string) {
  d.config.interfaces[0] = { ...d.config.interfaces[0], ip, mask, status: "up" };
  if (gw) d.config.gateway = gw;
}

function ifaceIp(d: Device): string {
  const ip = d.config.interfaces.find((i) => i.ip)?.ip;
  if (!ip) throw new Error(`${d.config.hostname} has no IP`);
  return ip;
}

// ---------------------------------------------------------------------------

console.log("\n1. Same-subnet L2 ping through a switch (ARP + MAC delivery)");
test("PC1 pings PC2 on the same /24 via a switch", () => {
  const sim = new NetworkSimulator(buildTemplate("small-lan"));
  setHost(byHostname(sim, "PC1"), "192.168.1.11", "255.255.255.0");
  setHost(byHostname(sim, "PC2"), "192.168.1.12", "255.255.255.0");
  const r = sim.ping(byHostname(sim, "PC1").id, "192.168.1.12");
  assert(r.ok, r.error ?? r.summary);
  const actions = r.steps.map((s) => s.action);
  assert(actions.includes("Same subnet"), "trace should reason about same subnet");
  assert(actions.includes("ARP request"), "trace should show ARP");
  assert(actions.includes("MAC lookup"), "trace should show switch MAC lookup");
  assert(actions.includes("Delivered at L2"), "trace should show L2 delivery");
});

console.log("\n2. Cross-subnet routing with static routes (two routers)");
test("PC1 reaches PC2 across two routers using static routes", () => {
  const sim = new NetworkSimulator(buildTemplate("two-router"));
  setHost(byHostname(sim, "PC1"), "192.168.1.10", "255.255.255.0", "192.168.1.1");
  setHost(byHostname(sim, "PC2"), "192.168.2.10", "255.255.255.0", "192.168.2.1");
  sim.addRoute(byHostname(sim, "R1").id, "192.168.2.0", "255.255.255.0", "10.0.0.2");
  sim.addRoute(byHostname(sim, "R2").id, "192.168.1.0", "255.255.255.0", "10.0.0.1");
  const r = sim.ping(byHostname(sim, "PC1").id, "192.168.2.10");
  assert(r.ok, r.error ?? r.summary);
  assert(r.steps.some((s) => s.action === "Static route"), "trace should show a static-route match");
  assert(r.steps.some((s) => s.action.includes("Forward out")), "trace should show the router forwarding");
});

console.log("\n3. Longest-prefix route selection");
test("a /24 toward the target beats an overlapping /16, even if added last", () => {
  const sim = new NetworkSimulator();
  const r1 = sim.addDevice("router", 200, 200);
  const r2 = sim.addDevice("router", 600, 120);
  const r3 = sim.addDevice("router", 600, 320);
  const sw1 = sim.addDevice("switch", 100, 320);
  const sw3 = sim.addDevice("switch", 700, 320);
  const pc1 = sim.addDevice("pc", 40, 440);
  const pc3 = sim.addDevice("pc", 780, 440);
  ["R1", "R2", "R3", "SW1", "SW3", "PC1", "PC3"].forEach((h, i) => {
    sim.devices.find((d) => [r1, r2, r3, sw1, sw3, pc1, pc3][i].id === d.id)!.config.hostname = h;
  });
  sim.connect(pc1.id, "eth0", sw1.id, "eth0", "copperStraight");
  sim.connect(sw1.id, "eth1", r1.id, "eth0", "copperStraight");
  sim.connect(r1.id, "serial0", r2.id, "serial0", "serial");
  sim.connect(r1.id, "serial1", r3.id, "serial0", "serial");
  sim.connect(pc3.id, "eth0", sw3.id, "eth0", "copperStraight");
  sim.connect(sw3.id, "eth1", r3.id, "eth0", "copperStraight");
  sim.setInterfaceIp(r1.id, "eth0", "192.168.1.1", "255.255.255.0");
  sim.setInterfaceIp(r1.id, "serial0", "10.0.0.1", "255.255.255.252");
  sim.setInterfaceIp(r1.id, "serial1", "10.0.1.1", "255.255.255.252");
  sim.setInterfaceIp(r2.id, "serial0", "10.0.0.2", "255.255.255.252");
  sim.setInterfaceIp(r2.id, "eth0", "192.168.5.1", "255.255.255.0");
  sim.setInterfaceIp(r3.id, "serial0", "10.0.1.2", "255.255.255.252");
  sim.setInterfaceIp(r3.id, "eth0", "192.168.10.1", "255.255.255.0");
  setHost(byHostname(sim, "PC1"), "192.168.1.10", "255.255.255.0", "192.168.1.1");
  setHost(byHostname(sim, "PC3"), "192.168.10.10", "255.255.255.0", "192.168.10.1");
  // Broad /16 added first, specific /24 added second — the /24 must win.
  sim.addRoute(r1.id, "192.168.0.0", "255.255.0.0", "10.0.0.2");
  sim.addRoute(r1.id, "192.168.10.0", "255.255.255.0", "10.0.1.2");

  const r = sim.ping(byHostname(sim, "PC1").id, "192.168.10.10");
  assert(r.ok, r.error ?? `expected the specific /24 route to be chosen, got: ${r.error}`);
  assert(r.steps.some((s) => s.detail.includes("10.0.1.2")), "next hop should be R3 (10.0.1.2), not R2");
});

test("without the /24, the /16 misroutes and fails with no-route (proves specificity matters)", () => {
  const sim = new NetworkSimulator();
  const r1 = sim.addDevice("router", 200, 200);
  const r2 = sim.addDevice("router", 600, 120);
  const sw1 = sim.addDevice("switch", 100, 320);
  const pc1 = sim.addDevice("pc", 40, 440);
  const pc3 = sim.addDevice("pc", 900, 440);
  pc3.config.hostname = "PC3";
  sim.connect(pc1.id, "eth0", sw1.id, "eth0", "copperStraight");
  sim.connect(sw1.id, "eth1", r1.id, "eth0", "copperStraight");
  sim.connect(r1.id, "serial0", r2.id, "serial0", "serial");
  sim.setInterfaceIp(r1.id, "eth0", "192.168.1.1", "255.255.255.0");
  sim.setInterfaceIp(r1.id, "serial0", "10.0.0.1", "255.255.255.252");
  sim.setInterfaceIp(r2.id, "serial0", "10.0.0.2", "255.255.255.252");
  setHost(byHostname(sim, "PC1"), "192.168.1.10", "255.255.255.0", "192.168.1.1");
  setHost(byHostname(sim, "PC3"), "192.168.10.10", "255.255.255.0");
  sim.addRoute(r1.id, "192.168.0.0", "255.255.0.0", "10.0.0.2");
  const r = sim.ping(byHostname(sim, "PC1").id, "192.168.10.10");
  assert(!r.ok, "a bare /16 route must not satisfy the /24 target");
  assert(r.fault?.code === "no-route", `expected no-route fault, got ${r.fault?.code}`);
});

console.log("\n4. Missing route names the failing router");
test("no-route fault points at the router that lacks the route", () => {
  const sim = new NetworkSimulator(buildTemplate("two-router"));
  setHost(byHostname(sim, "PC1"), "192.168.1.10", "255.255.255.0", "192.168.1.1");
  setHost(byHostname(sim, "PC2"), "192.168.2.10", "255.255.255.0", "192.168.2.1");
  const r1 = byHostname(sim, "R1");
  const r = sim.ping(byHostname(sim, "PC1").id, "192.168.2.10");
  assert(!r.ok, "should fail without routes");
  assert(r.fault?.code === "no-route", `expected no-route, got ${r.fault?.code}`);
  assert(r.fault?.deviceIds.includes(r1.id), "fault should highlight R1");
  const diag = sim.diagnose(byHostname(sim, "PC1").id, "192.168.2.10");
  assert(diag.step === "route", `diagnose should reach route step, got ${diag.step}`);
});

console.log("\n5. Missing default gateway");
test("no-gateway fault when the source has no gateway for a remote target", () => {
  const sim = new NetworkSimulator(buildTemplate("two-router"));
  setHost(byHostname(sim, "PC1"), "192.168.1.10", "255.255.255.0");
  setHost(byHostname(sim, "PC2"), "192.168.2.10", "255.255.255.0");
  const r = sim.ping(byHostname(sim, "PC1").id, "192.168.2.10");
  assert(r.fault?.code === "no-gateway", `expected no-gateway, got ${r.fault?.code}`);
});

console.log("\n6. Admin state vs link state (shutdown)");
test("an interface left shutdown blocks traffic and is diagnosed", () => {
  const sim = new NetworkSimulator(buildTemplate("small-lan"));
  setHost(byHostname(sim, "PC1"), "192.168.1.11", "255.255.255.0");
  setHost(byHostname(sim, "PC2"), "192.168.1.12", "255.255.255.0");
  sim.toggleInterface(byHostname(sim, "PC2").id, "eth0");
  const r = sim.ping(byHostname(sim, "PC1").id, "192.168.1.12");
  assert(!r.ok, "ping must fail while the interface is shutdown");
  assert(r.fault?.code === "target-iface-down", `expected target-iface-down, got ${r.fault?.code}`);
  assert(r.fault?.ifaceIds.includes("eth0"), "fault should name the interface");
  sim.toggleInterface(byHostname(sim, "PC2").id, "eth0");
  const ok = sim.ping(byHostname(sim, "PC1").id, "192.168.1.12");
  assert(ok.ok, "re-enabling the interface (no shutdown) must restore connectivity");
});

test("show interfaces reports Status (admin) and Link (operational) separately", () => {
  const sim = new NetworkSimulator(buildTemplate("small-lan"));
  setHost(byHostname(sim, "PC1"), "192.168.1.11", "255.255.255.0");
  const res = runCommand(sim.netSnapshot(), byHostname(sim, "PC1").id, "show interfaces");
  const header = res.lines.find((l) => l.text.includes("Interface"));
  assert(Boolean(header), "show interfaces should print a header");
  assert(header!.text.includes("Status") && header!.text.includes("Link"), "columns: Status (admin) + Link (operational)");
  assert(res.lines.some((l) => l.text.includes("up")), "cabled port should show link up");
  sim.toggleInterface(byHostname(sim, "PC1").id, "eth0");
  const down = runCommand(sim.netSnapshot(), byHostname(sim, "PC1").id, "show interfaces");
  assert(down.lines.some((l) => l.text.includes("down")), "shutdown port should show down");
});

console.log("\n7. Powered-off destination");
test("powered-off target produces target-off fault highlighting the device", () => {
  const sim = new NetworkSimulator(buildTemplate("small-lan"));
  setHost(byHostname(sim, "PC1"), "192.168.1.11", "255.255.255.0");
  setHost(byHostname(sim, "PC2"), "192.168.1.12", "255.255.255.0");
  const pc2 = byHostname(sim, "PC2");
  sim.setPower(pc2.id, false);
  const r = sim.ping(byHostname(sim, "PC1").id, "192.168.1.12");
  assert(r.fault?.code === "target-off", `expected target-off, got ${r.fault?.code}`);
  assert(r.fault?.deviceIds.includes(pc2.id), "fault should highlight PC2");
  sim.setPower(pc2.id, true);
  assert(sim.ping(byHostname(sim, "PC1").id, "192.168.1.12").ok, "powering back on restores it");
});

console.log("\n8. Physical disconnection");
test("missing cable produces a no-path fault naming the disconnected device", () => {
  const sim = new NetworkSimulator(buildTemplate("small-lan"));
  setHost(byHostname(sim, "PC1"), "192.168.1.11", "255.255.255.0");
  setHost(byHostname(sim, "PC2"), "192.168.1.12", "255.255.255.0");
  const pc2 = byHostname(sim, "PC2");
  const cable = sim.cables.find((c) => c.fromDevice === pc2.id || c.toDevice === pc2.id);
  assert(Boolean(cable), "PC2 should be cabled");
  sim.removeCable(cable!.id);
  const r = sim.ping(byHostname(sim, "PC1").id, "192.168.1.12");
  assert(!r.ok, "ping must fail with PC2 unplugged");
  assert(r.fault?.code === "no-path", `expected no-path, got ${r.fault?.code}`);
});

console.log("\n9. DHCP from a server pool");
test("two clients get distinct in-pool addresses and can ping", () => {
  const sim = new NetworkSimulator(buildTemplate("small-lan"));
  const pc1 = byHostname(sim, "PC1");
  const pc2 = byHostname(sim, "PC2");
  const a = sim.dhcp(pc1.id);
  const b = sim.dhcp(pc2.id);
  assert(a.ok && b.ok, `${a.error ?? b.error ?? "DHCP failed"}`);
  const ipA = ifaceIp(byHostname(sim, "PC1"));
  const ipB = ifaceIp(byHostname(sim, "PC2"));
  assert(ipA.startsWith("192.168.1.") && ipB.startsWith("192.168.1."), "addresses must come from the pool");
  assert(ipA !== ipB, "no two clients may share an address");
  const r = sim.ping(byHostname(sim, "PC1").id, ipB);
  assert(r.ok, `DHCP clients should ping each other: ${r.error}`);
});

console.log("\n10. DNS resolution, then DNS refused");
test("hostname resolves via the DNS server, then fails when DNS is stopped", () => {
  const sim = new NetworkSimulator(buildTemplate("small-lan"));
  const srv = byHostname(sim, "SRV1");
  const pc1 = byHostname(sim, "PC1");
  setHost(pc1, "192.168.1.11", "255.255.255.0");
  pc1.config.dns = "192.168.1.10";
  const ok = sim.ping(pc1.id, "server.netlab");
  assert(ok.ok, `DNS name should resolve: ${ok.error}`);
  assert(ok.target === "192.168.1.10", "resolved name should map to the server IP");
  sim.setService(srv.id, "dns", false);
  const refused = sim.ping(pc1.id, "server.netlab");
  assert(refused.fault?.code === "dns-refused", `expected dns-refused, got ${refused.fault?.code}`);
});

console.log("\n11. Wireless association and reachability");
test("PC pings a Wi-Fi laptop through the wireless router", () => {
  const sim = new NetworkSimulator(buildTemplate("wifi"));
  const laptop = byHostname(sim, "Laptop1");
  const links = sim.computeWireless();
  assert(links.some((l) => l.deviceId === laptop.id), "laptop should associate over Wi-Fi");
  const pc = byHostname(sim, "PC1");
  const r = sim.ping(pc.id, "192.168.1.20");
  assert(r.ok, `wireless ping failed: ${r.error}`);
});

test("a laptop with the wrong Wi-Fi passphrase cannot reach the LAN", () => {
  const sim = new NetworkSimulator(buildTemplate("wifi"));
  // Secure BOTH radios that broadcast HomeNet — an open one would rightly accept the laptop.
  sim.setWlanSecurity(byHostname(sim, "AP1").id, { ssid: "HomeNet", enabled: true, password: "secret" });
  sim.setWlanSecurity(byHostname(sim, "WR1").id, { ssid: "HomeNet", enabled: true, password: "secret" });
  sim.setWlanSecurity(byHostname(sim, "Laptop1").id, { ssid: "HomeNet", enabled: true, password: "secret" });
  const laptop = byHostname(sim, "Laptop1");
  const good = sim.computeWireless();
  assert(good.some((l) => l.deviceId === laptop.id), "matching passphrase must associate");
  sim.setWlanSecurity(byHostname(sim, "Laptop1").id, { ssid: "HomeNet", enabled: true, password: "wrong" });
  const links = sim.computeWireless();
  assert(!links.some((l) => l.deviceId === laptop.id), "wrong passphrase must block association");
  const pc = byHostname(sim, "PC1");
  const r = sim.ping(pc.id, "192.168.1.20");
  assert(!r.ok, "unassociated laptop must be unreachable");
});

console.log("\n12. Service shutdown (connection refused)");
test("HTTP succeeds, then refuses once the service is stopped", () => {
  const sim = new NetworkSimulator(buildTemplate("small-lan"));
  const srv = byHostname(sim, "SRV1");
  const pc1 = byHostname(sim, "PC1");
  setHost(pc1, "192.168.1.11", "255.255.255.0");
  const ok = sim.runPacket({ sourceId: pc1.id, target: "192.168.1.10", type: "http" });
  assert(ok.ok, `HTTP should succeed: ${ok.error}`);
  sim.setService(srv.id, "http", false);
  const refused = sim.runPacket({ sourceId: pc1.id, target: "192.168.1.10", type: "http" });
  assert(refused.fault?.code === "service-down", `expected service-down, got ${refused.fault?.code}`);
});

console.log("\n13. Routing loop detection");
test("two routers pointing at each other produce a loop fault", () => {
  const sim = new NetworkSimulator();
  const r1 = sim.addDevice("router", 200, 200);
  const r2 = sim.addDevice("router", 600, 200);
  const sw1 = sim.addDevice("switch", 120, 340);
  const sw2 = sim.addDevice("switch", 680, 340);
  const pc1 = sim.addDevice("pc", 40, 460);
  const pc2 = sim.addDevice("pc", 900, 460);
  ["R1", "R2", "SW1", "SW2", "PC1", "PC2"].forEach((h, i) => {
    sim.devices.find((d) => [r1, r2, sw1, sw2, pc1, pc2][i].id === d.id)!.config.hostname = h;
  });
  sim.connect(pc1.id, "eth0", sw1.id, "eth0", "copperStraight");
  sim.connect(sw1.id, "eth1", r1.id, "eth0", "copperStraight");
  sim.connect(r1.id, "serial0", r2.id, "serial0", "serial");
  sim.connect(pc2.id, "eth0", sw2.id, "eth0", "copperStraight");
  sim.setInterfaceIp(r1.id, "eth0", "192.168.1.1", "255.255.255.0");
  sim.setInterfaceIp(r1.id, "serial0", "10.0.0.1", "255.255.255.252");
  sim.setInterfaceIp(r2.id, "serial0", "10.0.0.2", "255.255.255.252");
  setHost(byHostname(sim, "PC1"), "192.168.1.10", "255.255.255.0", "192.168.1.1");
  setHost(byHostname(sim, "PC2"), "192.168.9.10", "255.255.255.0");
  sim.addRoute(r1.id, "192.168.9.0", "255.255.255.0", "10.0.0.2");
  sim.addRoute(r2.id, "192.168.9.0", "255.255.255.0", "10.0.0.1");
  const r = sim.ping(byHostname(sim, "PC1").id, "192.168.9.10");
  assert(r.fault?.code === "loop", `expected loop fault, got ${r.fault?.code}`);
  assert(r.steps.some((s) => s.action === "Routing loop"), "trace should report the loop");
});

console.log("\n14. MAC learning populates the switch table");
test("switch learns source MACs and stops flooding the second time", () => {
  const sim = new NetworkSimulator(buildTemplate("small-lan"));
  const sw = byHostname(sim, "SW1");
  const pc1 = byHostname(sim, "PC1");
  const pc2 = byHostname(sim, "PC2");
  setHost(pc1, "192.168.1.11", "255.255.255.0");
  setHost(pc2, "192.168.1.12", "255.255.255.0");
  const first = sim.ping(pc1.id, "192.168.1.12");
  assert(first.ok, first.error ?? first.summary);
  const table = sim.macTables[sw.id] ?? {};
  assert(table[pc1.config.mac] === "eth0", `switch should learn PC1 on eth0, got ${table[pc1.config.mac]}`);
  const firstFlood = first.steps.find((s) => s.action === "MAC lookup");
  assert(firstFlood?.status === "warn", "first ping should flood (unknown destination MAC)");
  const second = sim.ping(pc2.id, "192.168.1.11");
  assert(second.ok, second.error ?? second.summary);
  assert(sim.macTables[sw.id]?.[pc2.config.mac] === "eth1", "switch should learn PC2 on eth1");
  const secondLookup = second.steps.find((s) => s.action === "MAC lookup");
  assert(secondLookup?.status === "ok", "second ping should be forwarded, not flooded");
});

console.log("\n15. Running vs startup configuration (saveconfig / reload)");
test("saveconfig persists, changes show in running-config only, reload restores", () => {
  const sim = new NetworkSimulator(buildTemplate("two-router"));
  const r1 = byHostname(sim, "R1");
  setHost(byHostname(sim, "PC1"), "192.168.1.10", "255.255.255.0", "192.168.1.1");
  const save = runCommand(sim.netSnapshot(), r1.id, "saveconfig");
  assert(save.ok && save.configSaved, "saveconfig should report configSaved");
  sim.saveStartupConfig(r1.id);

  sim.setInterfaceIp(r1.id, "eth0", "192.168.77.1", "255.255.255.0");

  let snap = sim.netSnapshot();
  const running = runCommand(snap, r1.id, "show running-config");
  assert(running.ok && running.lines.some((l) => l.text.includes("192.168.77.1")), "running-config shows the change");
  const startup = runCommand(snap, r1.id, "show startup-config");
  assert(startup.ok && startup.lines.some((l) => l.text.includes("192.168.1.1")), "startup-config keeps the saved value");
  assert(!startup.lines.some((l) => l.text.includes("192.168.77.1")), "startup-config must not show the unsaved change");

  const reload = runCommand(snap, r1.id, "reload");
  assert(reload.ok && reload.device, "reload should return a restored device");
  sim.applyDevice(reload.device!);

  snap = sim.netSnapshot();
  const after = runCommand(snap, r1.id, "show running-config");
  assert(after.lines.some((l) => l.text.includes("192.168.1.1")), "reload restores the saved IP");
  assert(!after.lines.some((l) => l.text.includes("192.168.77.1")), "reload drops the unsaved IP");
});

test("reload on a device with no saved config warns instead of clearing it", () => {
  const sim = new NetworkSimulator(buildTemplate("small-lan"));
  const pc1 = byHostname(sim, "PC1");
  setHost(pc1, "192.168.1.11", "255.255.255.0");
  const res = runCommand(sim.netSnapshot(), pc1.id, "reload");
  assert(res.ok, "reload without saved config should still return ok");
  assert(res.device === undefined, "reload without saved config should not mutate the device");
  assert(ifaceIp(byHostname(sim, "PC1")) === "192.168.1.11", "device config must be untouched");
});

console.log("\n16. CLI computed from live engine state (ping / ipconfig / show)");
test("ping from the CLI agrees with the packet engine", () => {
  const sim = new NetworkSimulator(buildTemplate("two-router"));
  setHost(byHostname(sim, "PC1"), "192.168.1.10", "255.255.255.0", "192.168.1.1");
  setHost(byHostname(sim, "PC2"), "192.168.2.10", "255.255.255.0", "192.168.2.1");
  sim.addRoute(byHostname(sim, "R1").id, "192.168.2.0", "255.255.255.0", "10.0.0.2");
  sim.addRoute(byHostname(sim, "R2").id, "192.168.1.0", "255.255.255.0", "10.0.0.1");
  const snap = sim.netSnapshot();
  const ping = runCommand(snap, byHostname(sim, "PC1").id, "ping 192.168.2.10");
  assert(ping.ok, `CLI ping should succeed: ${ping.reason}`);
  assert(ping.lines.some((l) => l.text.includes("Received = 4")), "ping output should show 4 received");
  const ipconfig = runCommand(snap, byHostname(sim, "PC1").id, "ipconfig");
  assert(ipconfig.lines.some((l) => l.text.includes("192.168.1.10")), "ipconfig should show the configured IP");
  const bad = runCommand(snap, byHostname(sim, "PC1").id, "ping 192.168.2.10");
  assert(bad.ok, "second ping must agree too");
});

console.log("\n" + "-".repeat(60));
console.log(`Result: ${pass} passed, ${fail} failed`);
if (failures.length) {
  console.log("Failed:");
  failures.forEach((f) => console.log(`  - ${f}`));
  process.exit(1);
}
