# Final Report — Emoji Removal & Networking Lab Realism Upgrade

Date: 2026-08-08 · Branch: `main`

Two tasks were completed in this session on top of the released redesign (`7f23f81`):
1. **Emoji removal** — strip decorative emojis from the app-owned CodeSphere UI.
2. **Networking Lab realism upgrade** — make the lab behave like a real network.

Both are verified with `npx tsc --noEmit`, `npx eslint`, `npx next build`, and the
new realism test suite (20/20 passing).

---

## Part 1 — Emoji removal

**Rule applied:** emojis were removed from every app-owned UI surface (navigation,
cards, dashboards, banners, search rows, buttons, toasts, lesson/learning widgets,
games, worlds, store, missions). Educational content, DB-driven icon values, and
typographic indicators were kept.

### New icon system

- `src/components/shared/feature-icon.tsx` — a small client component that maps a
  lowercase lucide name (`globe`, `code2`, `network`, `compass`, …) to its lucide
  icon, falling back to `BookOpen`.
- `src/lib/tracks.ts` — `Track.emoji` replaced by `Track.icon` (lucide names).
- `src/lib/onboarding.ts` — `LEARNING_PATHS`, `EXPERIENCE_LEVELS`, `DAILY_GOALS`
  now carry `icon` names instead of emoji strings.
- `src/lib/dashboard-data.ts` — `TrackProgressRow` uses `icon`.

### Converted surfaces (selected)

- Dashboards: `dashboard-view.tsx`, `mobile-dashboard.tsx` (also dropped the
  "Goal met — great work! 🎉" toast).
- Navigation: `sidebar.tsx`, `header.tsx`, `mobile-bottom-nav.tsx`.
- Learn / progress / onboarding pages (incl. the new `progress/` + `(onboarding)/`
  routes from the redesign).
- `search-dialog.tsx` — the per-item `emoji` field was removed entirely from all
  six groups (courses, lessons, games, net missions, projects, achievements).
- Games: `games/shared.tsx` (🪙→Coins, 🗺️→Map, toast→"coins"), `game-card.tsx`
  (`🪙N` → `N coins`), `game-detail.tsx` (Coins).
- Worlds: `world-map.tsx` (BookOpen/Gamepad2/ClipboardList/Wrench chips),
  `worlds/[slug]/page.tsx` (Coins).
- Store, missions-client, lesson widgets (`analogy-block`, `exercise-block`,
  `complete-lesson`, `lesson-mode-panel`), marketing (`course-card`,
  `courses/[slug]/page.tsx`).
- Netlab UI pass that touched palette/mission picker/cable sheets had their
  decorative emoji removed too.

### Audit

`scratch/audit-emoji.ps1` scans `src/` with .NET regexes:
- astral emoji via surrogate range `[\uD800-\uDBFF]`,
- dingbats/symbols via `[\u2600-\u27BF\uFE0F\u200D\u2764\u2B00-\u2BFF\u00A9\u00AE]`.

`scratch/emoji-audit.txt` currently reports **66 remaining lines, all intentional**:
- typographic indicators (`©`, `✓`, `✗`, `•`, `✦`) used as inline markers,
- educational content: `src/lib/content/modes.ts` (learning-mode icons),
  `src/lib/content/types.ts` (lesson-step icons), `src/lib/engine/levels.ts`
  (feature descriptions), `src/lib/constants.ts` (store slot meta),
- grading/validation feedback strings,
- DB-driven icons (`Game.icon`, `Course.icon`, seed data) — data, not UI.

---

## Part 2 — Networking Lab realism upgrade

### Architecture (as implemented)

The lab is a pure TypeScript engine under `src/lib/net/`, shared between the React
canvas and server-side mission validation. One `NetworkSimulator` instance holds
`devices`, `cables`, `macTables`, `startupConfigs`, `wirelessLinks`, plus live
`stats`/`events` and an undo `history`.

| File | Role |
| --- | --- |
| `types.ts` | Device/InterfaceConfig/Route/Cable/Wlan/TraceStep/SimSnapshot model |
| `devices.ts` | `DEVICE_TYPES` metadata + default device configs |
| `ip.ts` | IPv4 math (parse/format, masks, network/broadcast, host checks) |
| `cables.ts` | Cable semantics + link status (power/port aware) |
| `packets.ts` | L2 union-find pathfinding, ARP, MAC learning, routing, DHCP, DNS, structured faults |
| `commands.ts` | Windows-CMD-style CLI computed from live state |
| `services.ts` | Server service definitions (HTTP/DNS/DHCP/…), each wired into the sim |
| `sim.ts` | `NetworkSimulator` state machine + templates |
| `explain.ts`, `inspector.ts` | Teaching copy + packet-header inspection |
| `topology.ts`, `missions.ts`, `progress.ts` | Reference networks, mission scaffold, progress |

### Realism mapping (spec → code)

- **Virtual devices with interfaces** — `Device`/`InterfaceConfig` (id, kind,
  status, ip, mask, wan, description) + `poweredOn`; admin vs operational state is
  modeled as interface `status` (shutdown) against cable/link status (operational),
  surfaced side-by-side by `show interfaces`.
- **MAC learning** — switches/hubs/APs now **learn source MACs** on the ingress
  port during every trace (new in this session). The first frame floods, the next
  goes straight to the right port, and `macTables` populates live.
- **ARP** — every leg broadcasts "who has X?"; `arp -a` and `arpCache` reflect the
  real L2 segment.
- **IP routing** — connected routes, static routes, and **longest-prefix
  selection** (new in this session): a /24 toward the destination always beats an
  overlapping /16 or the default /0 regardless of insertion order, like a real router.
- **Switch / router / WAP / PC behavior** — switches bridge, hubs flood, routers
  route across boundaries, wireless routers keep WAN off the LAN bridge, APs bridge
  Wi-Fi clients; WPA requires matching SSID + passphrase on both sides.
- **Realistic CLI** — Windows-CMD interpreter with `ping`, `tracert`, `ipconfig
  /renew|/release|/all`, `arp -a`, `nslookup`, `hostname`, `show …`, `?`/`help`,
  TAB completion, up-arrow history. Deliberately **not** Cisco syntax (no
  `enable`/`configure terminal`/`Router#` prompts), honoring the no-copying rule.
- **Running vs startup configuration** — new in this session: `show running-config`,
  `show startup-config`, `saveconfig`, and `reload` (restores the saved startup
  config, dropping unsaved changes). The store persists on `saveconfig`.
- **Packet events** — every trace feeds per-device/per-port counters and the
  timeline (`stats`, `events`).
- **Troubleshooting names the failure point** — `PingFault` carries
  `deviceIds`/`cableIds`/`ifaceIds` so the canvas highlights the responsible
  device, cable, or interface; `diagnose()` returns the single next fix.

### New in this session (diffs)

- `src/lib/net/packets.ts` — longest-prefix route selection; MAC-learning on
  ingress ports; optional `startupConfigs` on `NetSnapshot`.
- `src/lib/net/sim.ts` — `netSnapshot()` now exposes `startupConfigs`.
- `src/lib/net/commands.ts` — `show running-config`, `show startup-config`,
  `saveconfig`, `reload`; `show interfaces` gained an operational **Link** column
  next to admin **Status**; help + TAB suggestions updated.
- `src/components/netlab/netlab-store.ts` — `runCmd` persists the startup config
  when `saveconfig` runs.
- `scripts/netlab-realism-tests.ts` — new assertion-based suite (below).

### Realism test scenarios — `npx tsx scripts/netlab-realism-tests.ts`

Result: **20 passed, 0 failed.**

1. Same-subnet L2 ping through a switch (ARP + MAC lookup + delivery steps).
2. Cross-subnet routing across two routers with static routes.
3. Longest-prefix selection: a later-added /24 beats an earlier /16; removing the
   /24 proves the /16 would misroute (`no-route`).
4. Missing route names the failing router (`fault.deviceIds`, diagnose step `route`).
5. Missing default gateway → `no-gateway`.
6. Shutdown interface blocks traffic (`target-iface-down` + `ifaceIds`); re-enable
   restores it; `show interfaces` shows Status vs Link separately.
7. Powered-off target → `target-off`; powering back on restores.
8. Unplugged cable → `no-path` naming the disconnected device.
9. DHCP: two clients get distinct in-pool addresses and can ping.
10. DNS: hostname resolves, then `dns-refused` once the service is stopped.
11. Wi-Fi: PC pings a laptop through the wireless router; wrong passphrase blocks
    association (and the laptop becomes unreachable).
12. HTTP succeeds, then `service-down` (connection refused) once stopped.
13. Routing loop: two routers pointing at each other → `loop` fault + trace step.
14. MAC learning: switch learns PC1 on eth0 / PC2 on eth1; first ping floods
    (`warn`), second forwards (`ok`).
15. Running vs startup: `saveconfig` persists, changes appear only in
    `running-config`, `reload` restores and drops unsaved changes; reload with no
    saved config warns without mutating.
16. CLI agrees with the engine: `ping`/`ipconfig` output reflects live state.

---

## Verification

| Check | Result |
| --- | --- |
| `npx tsc --noEmit` | clean |
| `npx eslint` (netlab + net engine + scripts) | clean |
| `npx next build` | success (all routes) |
| `npx tsx scripts/netlab-realism-tests.ts` | 20/20 pass |
| `npx tsx scripts/test-net.ts` / `scripts/test-missions.ts` | unchanged behavior |

## Files changed (summary)

- Emoji sweep: 20+ UI components/pages plus new `feature-icon.tsx`, icon-based
  `tracks.ts` / `onboarding.ts`, and audit tooling `scratch/audit-emoji.ps1` /
  `scratch/emoji-audit.txt`.
- Engine: `src/lib/net/{packets,commands,sim}.ts`, `netlab-store.ts`.
- Tests: `scripts/netlab-realism-tests.ts` (new).

**Copyright © 2026 Jhon Xyryll Samoy. All rights reserved.**
