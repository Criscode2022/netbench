# NetBench — agent handoff

Read this file before changing code. It is the continuation brief for another coding agent: product rules, architecture, how to run and deploy, UI modes, Eve, tests, recent work, and what not to break.

Last updated: 2026-11-20 (web app and Eve moved off Vercel to the owner's hosting platform, Eve on local models — Bionic first, Ollama second; before that, on 2026-11-18: API moved off Railway, polling instead of a socket in production, magic-link sign-in removed, case-study docs in `docs/`). Repo: `https://github.com/Criscode2022/netbench` (public; it was `network-lab`). Default branch: `main`.

---

## 1. What this is

NetBench is a **browser network lab for junior net/sysadmins**. Users draw a wired/wireless topology, configure IPv4/IPv6, run a per-node CLI, inspect packets with honest drop reasons, save labs, and ask **Eve** (an eve agent on local models) to explain / fix / build — with HITL confirm before mutations.

It is **not** Packet Tracer and **not** a CCIE catalog.

### Hard product constraints (do not violate)

- **Exactly eight device kinds:** `workstation`, `server`, `switch`, `router`, `firewall`, `ap`, `wlc`, `cloud`. `switch` has three capability profiles; do not turn those into new kinds.
- **No BGP, MPLS, VXLAN, or 802.1X.** Requests for those must fail honestly (HTTP 400 / CLI error). OSPF is **area 0 only**.
- The **engine is source of truth**. Angular never invents forwarding. Eve tools call Nest, which calls `Engine`.
- Drops must keep an **honest reason** (packet inspector + `get_path`). Do not fake success.
- Approximations (SSH crypto, RF, OSPF P2P) are marked **simulated**.
- Eve mutations are always authorised by a host-minted `confirmToken`; the human Approve click is optional (auto-approve is the default since the Eve upgrade — `EVE_REQUIRE_APPROVAL=1` / the drawer switch bring it back).
- The forwarding engine is a **long-running Node process**. Do not put it on a 10s serverless timeout.
- Palette is junior-admin only. Wired cables: Ethernet (auto-MDIX), straight-through, crossover, fiber. Wi-Fi is a simplified BSS then IP. No console/serial.

---

## 2. Live URLs

| Piece | URL |
| --- | --- |
| **Angular app (use this)** | https://netbench.cristiancode.dev/ |
| Eve agent | https://netbench-eve.cristiancode.dev |
| Eve health | https://netbench-eve.cristiancode.dev/eve/v1/health → `{"ok":true,"status":"ready"}` |
| Nest API | https://netbench-api.cristiancode.dev/api |
| API health | https://netbench-api.cristiancode.dev/api/health → `version` is the deployed commit |
| API WebSocket | none in production (HTTP-only path); the web app polls `GET /sessions/:id/state` |
| Case study | https://cristiancode.dev/featured/netbench, built from `docs/NN-*.md` |

Railway (`api-production-caeb…`, `web-production-033453…`) answered "Application not found" by November 2026 and is gone. Do not point anything back at it.

Vercel (`netbench-www-criscode2022s-projects.vercel.app`, `netbench-eve-…`, and the extra project names `netbench-web`, `netbench-lab`, `netbench-app`, `netbench-angular`, `netbench`) was left on 2026-11-20 at the owner's request. Do not deploy there or point anything at it; the owner deletes those projects.

After UI commits, tell the user the Angular URL and that they may need a hard refresh.

---

## 3. Monorepo layout

```
network-lab/
  packages/engine/     @netbench/engine — discrete-event simulator (vitest)
  apps/api/            @netbench/api — NestJS REST + WS (vitest)
  apps/web/            @netbench/web — Angular 22 standalone + Tailwind v4
  apps/eve-agent/      Eve, an eve agent on local models (defineAgent / defineTool)
  docs/                case-study docs in Spanish, NN-name.md (the portfolio publishes them), README.md index
  sql/schema.sql       Neon tables
  HANDOFF.md           this file
  README.md            short human overview
```

npm workspaces. Use Node >= 24 (the Eve build rejects older Node). Root `npm install`.

---

## 4. Data flow

```
Angular workspace  --REST+WS-->  Nest SimService  -->  Engine (one per session)
Eve drawer (browser) --NDJSON-->  Eve host (M6)  --HTTP-->  Nest /api/eve/tools/*
                                     |-->  Bionic :1235, then Ollama :11434 (local models)
Mutating Eve tools: (optional HITL Approve)  then  host mints Nest confirmToken  then  apply
```

- Localhost Angular uses `/api` and `ws://host/ws` via `apps/web/proxy.conf.json` → `127.0.0.1:3001`.
- Production Angular uses `https://netbench-api.cristiancode.dev/api` and **no socket** (`WS` is `null` off localhost): `Api.poll()` reads the state every 1.5 s, hands the canvas only unseen packets, and `live` drives the footer LED. The API caches CORS preflights 10 min so each poll is one request.
- Production Eve host is `https://netbench-eve.cristiancode.dev`, a process on the hosting platform. See `apps/web/src/app/eve-client.ts` `EVE_HOST`.
- Eve stream is NDJSON (`message.appended/completed`, `input.requested` HITL, `step.failed`).

---

## 5. Engine (`packages/engine`)

Pure TypeScript. Import in tests: `@netbench/engine`.

| File | Role |
| --- | --- |
| `src/engine.ts` | Discrete-event forwarding, CLI `exec`, ping, path, check |
| `src/devices.ts` | `createDevice`, iface defaults (`adminUp` false on Cisco until no-shut) |
| `src/types.ts` | `DeviceKind`, `KIND_PORTS`, `CableMedia`, `LabJson`, `LabPatch`, checks |
| `src/cables.ts` | Cable types, like/unlike pairing, fiber SFP check |
| `src/labs.ts` | Registry and model/exercise helpers |
| `src/labs-models.ts` | 22 complete reference labs; every one passes Check as shipped |
| `src/labs-exercises.ts` | 26 intentionally broken labs with hints and official `LabPatch` solutions |
| `src/build.ts` | `labFromSpec(spec)` for Eve Builder |
| `src/patch.ts` | Validate/apply `LabPatch` |
| `src/ip.ts` | IPv4/IPv6 helpers |
| `src/commands.ts` | Per-kind `help` text |
| `schema/lab.schema.json` | Lab JSON schema |
| `test/engine.test.ts` | Engine, switch-profile, and curriculum invariants |

### Builtin curriculum (48)

`MODEL_LABS` has 22 complete references; `EXERCISE_LABS` has 26 broken/incomplete labs. `BUILTIN_LABS` concatenates models first, then exercises. Every model must pass `Engine.check()` as shipped. Every exercise must fail as shipped, point to an existing `modelId`, carry progressive hints plus a `solution.patch`, and pass after `applySolution`. The curriculum tests enforce all of these invariants and stable unique IDs.

Switch curriculum pairs:
- `model-unmanaged-switch` / `ex-unmanaged-host-fault`
- `model-managed-l2-switch` / `ex-managed-l2-trunk`
- `model-multilayer-intervlan` / `ex-multilayer-ip-routing`
- `model-multilayer-dhcp` / `ex-multilayer-dhcp-pool`
- `model-multilayer-dhcp-relay` / `ex-multilayer-dhcp-helper`

Device coordinates assume ~112×110 px cards: keep at least 140 px between rows.

### Switch profiles

All three choices remain `kind: "switch"` in JSON and runtime state. The optional `switchProfile` is `unmanaged`, `managed-l2`, or `multilayer`; absent means `managed-l2`, which preserves old labs and saved snapshots. The profile also exists on `LabPatch.addDevices`, is validated on full labs and patches, is returned by `getState`, and is saved by `toLab`. Reject it on non-switch devices.

- **Unmanaged:** physical ports start up; transparent MAC learning and flood/unicast forwarding; no CLI, management IP, VLAN configuration, DHCP, or routing. It preserves tagged frames rather than interpreting them. All-unmanaged loops are contained deterministically and reported as a broadcast-loop warning; do not label this RSTP.
- **Managed L2:** existing switch behavior—access/trunk ports, allowed and native VLAN, per-VLAN MAC learning, RSTP-lite, and management SVI/default gateway. `ip routing` and `no switchport` are rejected.
- **Multilayer:** all managed-L2 behavior plus `ip routing` (off by default), SVI forwarding, routed physical ports (`no switchport`), IPv4/IPv6 static routes, DHCP pools/excluded ranges/bindings, and `ip helper-address` on client-facing SVIs or routed ports.

Multilayer implementation details:
- An SVI injects outbound ARP/IP frames into its VLAN rather than looking for a physical cable named `VlanN`.
- DHCP pool selection matches the client-facing SVI or relay address; it must never use the first pool blindly in a multi-VLAN switch.
- Relay adds client-side SVI metadata, unicasts discover/request to the helper, and rebroadcasts offer/ack only into the original client VLAN.
- `no ip routing` disables forwarding but does not erase configured static routes.
- The simulator intentionally keeps STP as deterministic RSTP-lite. STP priorities/roles, EtherChannel, DHCP snooping, BGP/MPLS/VXLAN/802.1X remain unsupported.

UI palette has **one Switch tile** (default unmanaged). Cycle unmanaged → managed L2 → multilayer with the top-left refresh button on desktop, a long-press on mobile, and always from the inspector/details of a switch already on the canvas. The engine patch field is `setSwitchProfiles`; cables stay and out-of-profile config is stripped. They share the switch icon and `SW` naming sequence. Unmanaged switches expose no terminal or port power controls; managed L2 copy says the SVI is management-only; multilayer state shows whether `ip routing` is enabled. Eve context includes `switchProfile` and `ip-routing=on`. Command reference still lists all three switch CLIs.

### CLI additions (route / address removal)

- Linux: `ip route del default [via GW]`, `ip route del CIDR`, `ip route replace|change default via GW`, `ip addr del CIDR dev IF`, `ip addr flush dev IF`. `ip route add default` now fails with `RTNETLINK answers: File exists` when a static default exists (Linux behaviour) — use `replace`. Deleting an IPv4 prunes static routes whose next hop left every connected subnet (`pruneUnreachableRoutes`) and clears `defaultGw4`.
- Cisco: `no ip route NET MASK [NH]` (`0.0.0.0 0.0.0.0` = default), `no ip address` / `no ipv6 address` in interface mode, `no ip default-gateway`; `shut` alias.
- AP / WLC: `int` abbreviation and per-interface `shutdown` / `no shutdown` (labs 7/8/12 use `int Gi0/1`, `int wlan0`). A bare `no shutdown` on an AP still enables radio + uplink together. The engine test replays every builtin startup line and fails on any `% Unknown command`.

### Ports

```
workstation: eth0, wlan0
server:      eth0, eth1
switch:      Gi0/1 … Gi0/8
router:      Gi0/0 … Gi0/3
firewall:    eth0 … eth3
ap:          Gi0/1, wlan0
wlc:         Gi0/1
cloud:       eth0
```

Linux hosts (`workstation`, `server`, plus firewall/cloud CLI): `ip addr add`, `ip link set`, `ping`, `nmcli wifi connect`, `dhclient`, `ssh`, …
Cisco-like (managed/multilayer `switch`, `router`, `ap`, `wlc`): start at **user** exec; need `enable` then `conf t`. Unmanaged switches have no CLI. `operUp` requires `adminUp` **and** a peer (or radio assoc).

**Important:** `Engine.addLink` now sets `adminUp = true` on both ends. The first lab only `no shut`s Gi0/1 and Gi0/2 in startup; a third PC used to land on Gi0/3 still shutdown. Do not revert that without replacing it.

`addLink` rejects an occupied port (`already cabled`). Optional 4th arg / patch field `cable`: `ethernet` (default, auto-MDIX, always gets carrier), `straight`, `crossover`, `fiber`. Straight/crossover follow CCNA like/unlike rules (switch is the only intermediary). Wrong type still creates the cable but `operUp` is false (`Wrong cable`). Fiber is refused on workstation/server/cloud (no SFP). `getState` ifaces include `peer`, `status`, `statusReason`.

### `labFromSpec(spec)`

Used by HTTP `POST /api/sessions/:id/build` and Eve `build_lab`. Must handle:

- Dual-stack office sentence (switch + router + AP + server + two PCs).
- OBJECTIVE-style: *“two VLANs, one router, wifi on VLAN 20, Linux server on VLAN 10, PC must ping the server via the router”* — count a **bare PC**, map `on VLAN N` **per role**, emit a ping Check.

Out of scope words (`bgp|mpls|vxlan|802.1x`) → 400.

### CLI / packets

- `engine.exec(deviceId, line)` returns `{ output, prompt, error, events }`.
- `engine.getPath(src, dst, proto, family)` — no silent drop; synthesize a drop event if needed.
- `engine.check()` — lab checks (`ping`, `wifi-associated`, `dhcp-bound`, `ospf-full`, …).
- Ping cancel: `engine.cancel()`; echo wait must not hang (`echoWait?.got`).
- Cisco parse: parse **router** before generic `ip` so `ip route` is not swallowed as Linux `ip`.

Run: `npm test -w @netbench/engine`

---

## 6. Nest API (`apps/api`)

Global prefix `/api`. CORS `origin: true`. Long-running: `tsx src/main.ts` (script `start` / `start:dev`).

| Area | Path |
| --- | --- |
| Health | `GET /api/health` |
| Auth | `POST /api/auth/{register,login,guest}` `GET /api/auth/me` (magic-link sign-in was removed on 2026-11-18: it returned the token in the response, so anyone knowing an email could sign in as that account) |
| Labs | `GET /api/labs/builtin`, CRUD `/api/labs` |
| Session | `POST /api/sessions` → `{ sessionId, state }` |
| State | `GET /api/sessions/:id/state` |
| CLI | `POST /api/sessions/:id/cli` `{ deviceId, line }` |
| Check | `POST /api/sessions/:id/check` |
| Edit topology | `POST /api/sessions/:id/edit` `{ patch?, move? }` — **no** confirmToken (user UI) |
| Eve mutations | `POST /api/sessions/:id/{patch,config,build}` **require** `confirmToken` |
| Confirm | `POST /api/sessions/:id/confirm` `{ purpose }` |
| Eve tools | `POST /api/eve/tools/{confirm,get_lab_state,get_device,get_path,run_check,apply_device_config,apply_lab_patch,build_lab,highlight_devices,list_commands}` |
| WS | `GET /ws?sessionId=` (not under `/api`) |

`purpose` values: `apply_lab_patch`, `apply_device_config`, `build_lab`. Missing token → 403. Rate limit: 120 CLI/tool calls per minute per session (`NB_RATE_LIMIT`); a 429 carries a `Retry-After` header (`RateLimitException` + `rate-limit.filter.ts`) and `retryAfter` in the body.

**Idempotent replay** (`SimService.replayed/remember`): the three mutating Eve tool routes accept `idempotencyKey` (body, or `Idempotency-Key` header). A repeat within 10 min returns the stored response with `replayed: true` instead of applying again or failing with 403 on the already-consumed `confirmToken`; a key reused for another purpose is 409. `GET /api/health` reports `version` (`NETBENCH_BUILD` / `HOSTING_COMMIT_SHA` / `SOURCE_VERSION`, else `dev`), `uptimeSec`, `eveTools: true`, `idempotency: true` — the Eve host uses these to tell "old deploy" from "down".

DI: Nest ESM — inject with `@Inject(Class)` where needed. Do not assume string tokens.

### Persistence (`store.ts` + `db.ts`)

- Without `DATABASE_URL`: in-memory maps (tests / guest).
- With Neon: **SELECT users/labs on login/list/get** (not only cache), **await writes**. Schema: `sql/schema.sql`.
- Guests: JWT + banner; lab JSON autosaves to `localStorage.nb_guest_lab` and is restored on reload. Sign in to copy that lab onto the account.

### WebSocket (`create-app.ts`)

Persistent `/ws`. Messages: `{ type: 'cli', deviceId, line }`, `{ type: 'cancel' }`. Server pushes `{ type: 'cli', output, events, state }` and periodic `state`.

Docker image: `apps/api/Dockerfile` (monorepo context) builds the API only. Eve has no image: it needs Bionic or Ollama on the same machine.

Env: `PORT`, `HOST` (listen address; default `0.0.0.0`, the hosting platform sets `127.0.0.1`), `JWT_SECRET`, `DATABASE_URL`, optional `EVE_ORIGIN`.

Run: `npm run start -w @netbench/api` → `http://127.0.0.1:3001/api/health`  
Tests: `npm test -w @netbench/api` (37 tests).

---

## 7. Angular web (`apps/web`)

Angular **22** standalone + signals + Tailwind **v4**. **No zone.js** (zoneless). Native `addEventListener` (Safari `gesturechange`) must call `ChangeDetectorRef.detectChanges()` after `pan.set`.

| File | Role |
| --- | --- |
| `src/app/workspace.ts` | Canvas, pan/zoom, modes (Basic/Simple/Advanced/Focus), boot + session recovery, check panel, Reach (ping/trace), hints, undo, tidy-up, share links, auth, Eve bind |
| `src/app/workspace.html` | Template. Shared `ng-template`s: `#devicePanel` (Simple inspector + Basic sheet), `#reachPanel` |
| `src/app/api.ts` | HTTP/WS client, `PALETTE`, types, `online`/`wsConnected`, `attach()`, `snapshot()`, saved labs |
| `src/app/eve-client.ts` | Eve session + NDJSON stream + HITL |
| `src/app/terminal.ts` | `<nb-terminal>`: per-device tabs, history (↑/↓), Tab completion from the cheat sheet, quick commands (`QUICK_COMMANDS`) |
| `src/app/packets.ts` | `<nb-packets>`: packet list with filter/drops-only, detail card, activity Log tab |
| `src/app/lab-picker.ts` | `<nb-lab-picker>`: curriculum with pass badges + signed-in “My labs” |
| `src/app/cheat-sheet.ts` | `<nb-cheat-sheet>`: searchable command reference; click inserts into the terminal |
| `src/app/toasts.ts` | `<nb-toasts>`: info/success/warn/error with optional action (Undo) |
| `src/app/icons.ts` | `<nb-icon>` inline SVG set; `KIND_ICON` maps device kind → icon |
| `src/styles.css` | Tailwind v4 `@theme` tokens (`ink-*`, `brand-*`, `ok/warn/danger/eve`), component classes (`.btn*`, `.chip*`, `.field`, `.seg`, `.led*`, `.card`), `.grid-canvas` dot grid |
| `src/index.html` | `viewport-fit=cover`, Inter + JetBrains Mono, `favicon.svg` (in `public/`) |
| `proxy.conf.json` | `/api` `/ws` → :3001, `/eve` → :4010 |

Route: `''` → `Workspace`. `App` is an inline `<router-outlet />` (the Angular starter `app.html` was removed).

### Boot order (`Workspace.boot()`)

1. `GET /labs/builtin`.
2. `#lab=<base64url JSON>` in the URL → open that lab (share link), then strip the hash.
3. Else `localStorage.nb_autosave.sessionId` (< 12 h) → `api.attach()` re-uses the still-running engine session (keeps ARP tables, hostnames, terminal state across reloads). 404 → fall through.
4. Else guest snapshot (`nb_guest_lab`) or `lab-1-first-ipv4-ping`.

Every UI action that changes a device (Add IP, Set gateway, enable/disable port, DHCP, Wi-Fi join, start SSH) runs real CLI lines through `runCommands()` and echoes them into that device’s terminal buffer, so the learner sees the command.

Local: `cd apps/web && npx ng serve --host 127.0.0.1 --port 4200 --proxy-config proxy.conf.json`

### UI modes (read before touching the canvas)

| Mode | When | What |
| --- | --- | --- |
| **Desktop** (`innerWidth >= 768`) | md+ | Palette + canvas + inspector + terminal + packets. Eve header toggle. |
| **Full mobile** | narrow && `basic()` false | Tabs: Canvas / Palette / Inspect / Term / Eve. |
| **Basic mobile** | narrow && `basic()` true (**default** `localStorage.nb_basic !== '0'`) | Two tabs: **Canvas / Eve** (`basicTabs`; `setTab()` folds any other tab into Canvas, `showTab()` drives the active state). Header: Check + **Basic on**. FAB **+ Add**. Tap device → bottom sheet (closed by any tab switch). “Ask Eve” buttons (check panel, Reach, Troubleshoot) are available and jump to the Eve tab. |
| **Simple vs Advanced** | `localStorage.nb_advanced === '1'` | **Simple:** device-to-device Ethernet (auto-MDIX), used ports + peer only, IPv4, hide IPv6/MAC/running-config. **Advanced:** cable types, port grid on cards, cable-end port labels, all ifaces, IPv6, MAC, inspector tabs Ports / Network / Config. Basic forces Advanced off. |
| **Focus** (desktop) | `localStorage.nb_focus === '1'`, header ⤢ button or `Shift+F` | Canvas first: thin header (lab picker, Check, connection dot, Exit focus), one floating toolbar (Add ▾ / Cable / Terminal / Eve / − % + fit / palette; the separate zoom toolbar is hidden and button labels collapse to icons below a 48rem canvas via `@container` + `@3xl:inline`), compact chip for the selected device (first hint, Term / Reach / Cable / Details / Delete). Palette and footer hidden. **Eve (toolbar, `E`, palette, “Ask Eve”) opens as a right sidebar without leaving focus** (`focusEve`); **Details opens the full inspector as a sidebar** (`focusInspect`, X closes it and the chip returns); the terminal dock toggles via `focusTerm` (`openTerminalFor()` switches it on). All three reset when focus is toggled so focus always starts canvas-only. |

`basicMode()` = `isNarrow() && basic()`; `focusMode()` = `focus() && !isNarrow()`. Desktop ignores Basic even if the flag is on. `showEve()` / `showInspect()` / `showCanvas()` / `showTerm()` are the single source of truth for what renders in each mode — add new panels there, not with ad-hoc `@if`s. `toggleEve()` / `openEve()` / `closeEve()` branch on focus → narrow → desktop, so callers never need to know the mode. Desktop Simple vs Advanced is the main mode split. Cards/cables use `advUi()` = `advanced() && !basicMode()` so a phone in Basic never shows the port grid even if Advanced was on at desktop width. Eve starts open only at `innerWidth >= 1440` unless `nb_eve_open` says otherwise (at 1280 the four columns squeeze the canvas to ~440px).

### Desktop chrome

- **Header:** logo · `<nb-lab-picker>` (progress bar, pass badges, My labs) · Check (dot = last result) · Simple/Advanced · Focus · ⋯ menu (Save a copy, Reset lab, Tidy up, Copy share link, Copy/Download/Upload JSON, Command reference, Shortcuts, Help topics, Welcome tour, About) · Guest/Account · Eve.
- **Check panel** under the header: per-check pass/fail with the engine reason, “Next lab” on success, “Ask Eve why” on failure. Passing marks the lab in `nb_passed`. Fresh packets from the check are replayed hop by hop and lit as a trace.
- **Canvas overlays:** goal card with live checklist (top-left, collapsible), mode pill (placing/cabling), trace card (bottom-left; hops + honest reason; Esc or click empty canvas clears), link card, zoom toolbar (−/%/+/fit/tidy).
- **Inspector (Simple):** device header with LED, quick actions (Terminal / Reach / Cable / Explain / Delete), **Hints** (engine-state diagnostics with one-click fixes: enable port, enable the peer’s port, replace wrong cable, Add IP or DHCP, set/change gateway when missing, off-subnet or unowned, join Wi-Fi, start SSH), Connections, IPv4 (+ Add IP, DHCP, pencil = change address/mask via `ip addr del` + `add`, Cisco overwrite), Default gateway (Set / Change via `ip route replace` or `no ip route` + `ip route` / Remove), Wi-Fi (join from SSIDs parsed out of AP/WLC running-config), Reach (Ping via CLI or Trace via `POST /path`; result + hop chain; Watch).
- **Dock:** resizable (`nb_dock_h`) — `<nb-terminal>` left, `<nb-packets>` right (Packets | Log). Packet detail has “Show on canvas” (replay) and “Ask Eve why”.
- **Toasts** replace the old hint bar. Delete and Unplug toasts carry **Undo** (delete undo re-adds the device, its links and replays `startup`/`post` from the pre-delete `snapshot()`).

### Learning tools (all engine-driven)

- **Troubleshoot** (check panel, checklist “Why?”, Reach “Explain the drop”): runs `POST /path` for the failing ping/ssh check, takes the last `drop` event and passes its `reason` + `from.device` to `diagnose()`. That function is a regex table over the engine’s drop strings (`Interface X is administratively down`, `No cable on`, `Interface X is down`, `VLAN mismatch`, `No subinterface for VLAN`, `RSTP-lite blocking`, `ARP/NDP timeout for NH at DEV`, `No route to DST on DEV`, `No outgoing interface`, `DEV is not a router`, `TTL expired`, `ACL drop:`, `not associated`). It cross-checks device state (e.g. “no route” while the covering interface is down → L1, not gateway) and returns layer, plain-language detail, “look at”, verify commands and an optional one-click fix. Wi-Fi/DHCP/OSPF checks are read from the check reason (`diagnoseCheck`). Add a branch when the engine gains a new drop string; never infer forwarding the engine did not report.
- **Watch** (Reach panel): `startMonitor()` re-runs `POST /path` every 5 s (`MONITOR_MS`), updates the trace and stops with a toast when the path works. Each tick is one rate-limited call and adds packets to the engine log.
- **Checkpoints** (`nb_ckpt`, max 12): `snapshot()` stored per lab id. Diff compares engine-generated `startup`/`post` lines per device plus cable keys; Restore re-opens the lab (new session).
- **Lab editor** (⋯ → Edit name, goal & checks): edits `name/goal/description/checks` on a `snapshot()` and re-opens it. Builtin ids are replaced by `nb-<slug>-<rand>` so the curriculum entry stays pristine; the result appears in the picker as “(this browser)” with a pencil badge and can be shared via link.
- **Command palette** (`Ctrl+K`): actions, add-device, devices (select/terminal), labs. `buildPalette()` is the single list; keyboard ↑/↓/Enter.
- **View options** (`nb_view`): colour IPs by subnet (`subnetColors`, first-appearance order), VLAN role on Advanced cable labels (`Gi0/1 v10`, `Gi0/8 T`), packet animation on/off.
- **Packets “capture on device”**: `<nb-packets [focusDevice]>` toggle filters to packets whose `from`/`to` is the selected device.
- **Lab report**: `buildReport()` → Markdown (devices, addresses, gateways, cables, checks with last result, recent drops); copy or download.

### Canvas mechanics

- World layer: CSS `translate(pan.x, pan.y) scale(pan.s)`. SVG is **4000×3000+** so paths are not clipped on a ~390px phone. Do **not** size the SVG `inset-0 h-full w-full` (that was the missing-cable bug).
- Cables: SVG `<path>` from `linkPath`, anchored at `anchor(d)` = `(x + cardW()/2, y + 34)` where `cardW()` is 112 (Simple) / 132 (Advanced). Click a cable to inspect/unplug. Radio = dashed purple; fiber orange; crossover teal dashed; wrong-cable dimmed; trace-lit cables cyan (red if the trace dropped). Rubber-band while cabling. Packet dots animate one hop at a time (`animate()` dedupes event ids for 3 s because WS pushes and CLI replies both deliver them).
- The dot grid follows pan/zoom (`gridPos`/`gridSize` bound to `background-position/size`).
- `fitToView()` keeps the topology clear of the goal card and bottom toolbars and runs on load on desktop too.
- Pan: one pointer. Pinch: two pointers. Wheel zoom 0.35–2.4 around cursor. Safari `gesturestart/change/end` on the canvas (non-passive, `NgZone` not enough — use `cdr.detectChanges()`).
- `touch-action: none` on `.grid-canvas`. `setPointerCapture` wrapped in try/catch (synthetic events throw).
- Narrow: `fitToView()` after lab load / becoming narrow / add in Basic.

### Adding devices and cables

- Desktop palette: **Cables** (Ethernet always; Straight/Crossover/Fiber in Advanced) then device types. Click a cable to arm; click two devices (or two free ports in Advanced). Stays armed until Cancel/Escape.
- Mobile: `place(kind)` **auto-drops** at view center (`addDevice` + `dropPoint` + unique `PC3` names).
- Basic FAB **Cable** (left) + **+ Add** (right). Add sheet has Cable first, then `PALETTE`.
- **Cable:** `startCable` / `finishCable` pick first free non-radio iface (`freePort`). Advanced `clickPort` uses that exact port and refuses used ports. After a successful cable in Basic, reopen the sheet on the target device so ports update.
- `POST /sessions/:id/edit` `{ addDevices, addLinks: [{ a, b, cable? }], removeDeviceIds, removeLinks }` and `{ move: [{ id, x, y }] }`.

### Add IP

When a device has no IPv4 (`canAddIpv4`: hosts/routers/firewalls and multilayer switches; never unmanaged or managed-L2 physical ports): suggest the next host on the busiest lab subnet (after the highest used host, e.g. .10 and .20 → **.21**). Apply via CLI:

- Linux: `ip addr add CIDR dev IF` then `ip link set IF up`
- Cisco: `enable`, `conf t`, `interface IF`, `ip address A.B.C.D MASK`, `no shutdown`, `end`

### Device names vs interface names

Each PC has its **own** `eth0`. Three PCs on one switch: `PC1:eth0→SW1:Gi0/1`, `PC2:eth0→SW1:Gi0/2`, `PC3:eth0→SW1:Gi0/3`. Do not “share” eth0.

### Inspector / Basic sheet

- Simple + Basic: **Used ports** (`usedPortRows`: name, Up/Wrong cable/Disabled, peer, Unplug). Free ports hidden behind “Show N free ports”. Then IPv4.
- Advanced inspector: every iface with peer, cable type, MAC, IPv6, running-config.
- Simple cards: `Gi0/1 → PC1` (used only). Advanced cards: port grid (filled = used, outline = free). Used ports on switch/router come from engine `iface.peer` (fallback: links).
- Basic sheet footer: Cable | Close | Delete (icon). Full-mobile inspector: “Back to canvas”. The sheet and the Simple inspector render the same `#devicePanel` template (`big` context flag switches to touch-size controls).

### localStorage keys

| Key | Meaning |
| --- | --- |
| `nb_basic` | `'0'` = full mobile UI; anything else / missing = Basic **on** for phones |
| `nb_advanced` | `'1'` = Advanced inspector/cards |
| `nb_token` | JWT (dropped at boot if `exp` passed; `Api.guest` is computed from the token’s `guest` claim) |
| `nb_autosave` | `{ id, sessionId, at }` — `boot()` re-attaches to `sessionId` if < 12 h old |
| `nb_guest_lab` | Guest lab JSON snapshot (`{ v:1, at, lab }`) restored on reload |
| `nb_eve:{userId}:{nestSessionId}` | Eve session id |
| `nb_eve_auto` | `'0'` = ask before applying Eve's tool calls (default auto-approve) |
| `nb_focus` | `'1'` = desktop Focus mode |
| `nb_eve_open` | `'1'`/`'0'` remembered Eve drawer state (default open only ≥ 1440px) |
| `nb_passed` | JSON array of lab ids whose Check passed (badges + progress bar) |
| `nb_welcome` | `'1'` = welcome tour dismissed |
| `nb_dock_h` | dock height in px |
| `nb_ckpt` | Checkpoints `[{ id, name, at, labId, lab }]` (max 12) |
| `nb_view` | `{ subnet, vlan, anim }` view options |

Share links: `#lab=<base64url(UTF-8 JSON)>` of `snapshot()`; opened labs are copied into the guest snapshot. “Save a copy” (`POST /labs`) mints a fresh `nb-…` id so it never collides with a builtin id.

### Screenshots

Do **not** commit `netbench-*.png` (root `.gitignore`). Playwright MCP writes those in the repo root during verification.

---

## 8. Eve (`apps/eve-agent`)

eve **0.47.x**, self-hosted (`eve build` / `eve start`). `defineAgent({ model })` only — **no `name`**. Sandbox: just-bash, pinned in `agent/sandbox.ts` **and in each subagent's `sandbox.ts`** (a subagent without one gets eve's default backend, which picks Docker when a daemon answers and pulls `ghcr.io/vercel/eve`). `bash`, `read_file`, `write_file`, `web_search` and `web_fetch` are disabled in the root agent and every subagent (`disableTool()` files under each `tools/`).

- Model config is shared in `agent/lib/model.ts` and spread into the root agent and every subagent (`...modelConfig`; keep the explicit `model:` literal next to it for eve's AST tooling). Models are **local only**, through `@ai-sdk/openai-compatible`: `MODEL_CHAIN` = `bionic/qwen3.8-9b-heretic-uncensored-mtplx` (Bionic, LM Studio's app, `EVE_BIONIC_URL` default `http://127.0.0.1:1235/v1`, 65,536-token context, kept loaded by Mac mini Monitor) then `ollama/netbench-eve` (`EVE_OLLAMA_URL` default `http://127.0.0.1:11434/v1`). `netbench-eve` is `qwen3.5:9b-mlx` with `num_ctx 32768` from `apps/eve-agent/ollama/Modelfile` (`ollama create netbench-eve -f …`): Ollama's OpenAI endpoint ignores a per-request context and serves 8,192 tokens, less than Eve's first prompt (~9,300). It takes ~11 GB when loaded, Bionic's model ~5.5 GB. The resolver is a `defineDynamic` on **`step.started` only** (eve accepts only id strings for session/turn selections, and a direct provider model is a live object). Model calls use undici with `headersTimeout`/`bodyTimeout` `EVE_MODEL_TIMEOUT_MS` (15 min) and a 5 s connect timeout: an engine serves one request at a time, so a queued step can wait minutes, while a stopped engine fails over quickly. `agent/lib/model-fallback-hook.ts` (re-exported as `hooks/model-fallback.ts` by the root agent **and** each subagent) advances a durable per-session index on `step.failed` / `turn.failed` with a model code; `chainIndexOf()` matches eve's reported `modelId` to a chain entry. The primary is retried after `EVE_MODEL_RECOVER_MINUTES` (15). Context windows are in `CONTEXT_WINDOW`, capped by `EVE_CONTEXT_TOKENS` (65,536). `EVE_MODEL` / `EVE_FALLBACK_MODELS` take `bionic/<id>` or `ollama/<id>` entries.
- Channel `agent/channels/eve.ts`: `auth: [localDev(), none()]`, `cors: true` so browser guests work.
- Tools under `agent/tools/*.ts` (subagent tool files re-export them). Mutating tools use `mutationApproval()` from `agent/lib/approval.ts`; `EVE_APPROVAL` = `auto` (default, `never()`), `dangerous` (pause only when the tool's `dangerous(input)` flags it: whole-lab replace, device removal, `shutdown`), `once`, `always` (`EVE_REQUIRE_APPROVAL=1` is the legacy alias). Every call still mints its own `confirmToken` via `POST /api/eve/tools/confirm` (never take one from the model) and sends a fresh `idempotencyKey` so a timed-out attempt that already applied is replayed by the API, not applied twice. Inputs pass `agent/lib/guards.ts` first (placeholder `labId`, blank/out-of-scope/destructive CLI, empty patches, bad `Name:port` cables) so a bad model call costs no network round trip.
- `agent/lib/nest.ts`: per-attempt timeout (`EVE_NEST_TIMEOUT_MS` 25 s; `build_lab` 60 s), 2 retries with jittered backoff on network/timeout/429/5xx (`EVE_NEST_RETRIES`), `Retry-After` honoured. Every failure becomes a `NestError` with a `kind` (`route-missing` = 404 `Cannot POST /api/…` i.e. **the deployed API predates the route, redeploy apps/api**; `stale-session` = 404 from the session lookup; `rate-limit`, `forbidden`, `bad-request`, `server`, `network`, `timeout`) and a one-line instruction for the model appended to the message. `apiHealth()` probes `GET /api/health` (memoised 5 s) and the read-only `api_status` tool exposes API health/version, whether a `labId` still resolves and the current model — `instructions.md` tells Eve to use it instead of guessing ("the EVE-NG engine is down" is banned).
- `build_lab` takes `spec` (sentence) **or** `lab` (full lab JSON, zod schema in `agent/lib/lab-schema.ts`, ≤ 40 devices / 80 cables). Nest validates with `validateLab`, replays startup lines and returns `startupErrors`, `check` and `summary`, so the builder can fix rejected lines and rebuild. The spec path itself now scales to 12 PCs by adding trunked switches.
- Subagents: explainer / fixer / builder with skills in `agent/skills/`. Builder instructions carry per-kind startup templates, the port table and an addressing plan.
- Evals: `apps/eve-agent/evals/*.eval.ts` (shutdown iface, ROAS, OSPF, wifi nmcli, refuse BGP, build office, build campus JSON).
- Local: `npm run dev` (Eve on `127.0.0.1:4010`, Nest on `:3001`); `dev.mjs` prints whether Bionic and Ollama answer. `npx eve build` is the compile check (`tsc` only reports the pre-existing `.ts`-extension import, TS5097). Deploy: push to `main`; the hosting platform rebuilds `netbench-eve` (§11).
- Evals: run them **one at a time** (`npx eve eval --max-concurrency 1`). In parallel, the queued requests on one local engine timed out, and on 2026-11-19 Bionic stopped answering during a parallel run. Results on local models (2026-11-19/20) are far below the cloud models': see §10.
- Drawer errors: read `data.message` / `data.error` / `code`, not only `data.error`.

Angular drawer (`eve-client.ts`): the context block prepended to every message carries the whole topology (devices, addresses, gateways, port state), last Check, recent drops and last trace (capped at 40 devices). **HITL by `kind`**: `question` always reaches the user (card with option buttons; `allowFreeform` or option-less questions are answered by typing in the composer — `sendEve()` routes to `eve.answer()`; a typed option label/index resolves the option); `tool-approval` is auto-answered when **Auto-approve** (`nb_eve_auto`, default on) is on; `session-limit` is always answered `continue`. Requests queue (`pendingCount`), auto-answered ones never flash in the card. **Auto-retry**: a failed turn is re-sent up to 3× (2 s / 5 s / 12 s, jittered, `retry in Ns` hints honoured, countdown via `retryAt`) **into the same durable session** so history and the host's model rotation survive; only `session.failed` or a 404/409/410 from eve replaces the session. A `step.failed` followed by an empty `turn.completed`/`session.waiting` (eve's terminal model failure path) counts as a failed turn. **Stream reconnect**: if the NDJSON stream drops mid-turn it reconnects from the cursor up to 6× with backoff (`reconnecting`), deduping by `meta.id`; `message.appended` renders `messageSoFar` so text streams. `action.result` for `apply_*`/`build_lab` triggers `api.refresh()`.

---

## 9. How to run locally

Node **24** (eve 0.47 refuses < 24; root `engines` still says `>=20`, which is stale). Local dev machine runs 24.18.

```bash
cp .env.example .env   # JWT_SECRET, optional DATABASE_URL
npm install
ollama create netbench-eve -f apps/eve-agent/ollama/Modelfile   # once, Eve's Ollama fallback
npm run dev                                # API :3001 + UI :4200 + Eve :4010 (Bionic :1235 or Ollama :11434)
```

If API is down, the UI still loads but labs/CLI fail (`ECONNREFUSED 3001`). macOS has **no** `timeout(1)` — use `curl --max-time`.

---

## 10. Tests and verification

```bash
npm test -w @netbench/engine   # 64
npm test -w @netbench/api      # 37
```

`npm run build -w @netbench/engine` and `-w @netbench/api` (`tsc --noEmit`) both pass clean (checked 2026-11-18).

Live API (after deploy): builtin labs Check true; `labFromSpec` OBJECTIVE sentence; HITL 403 without token / 201 with token; BGP spec 400.

UI changes: **verify in a real browser** at **390×844 and 1280×800**. Exercise the changed path (tap, cable, Add IP, Basic on/off). A single screenshot is not verification.

Eve on local models (measured 2026-11-19, `ex-wrong-gateway`, "Fix it with the smallest change"): Bionic fixed it in 9 steps and ~150 s (it first tried Cisco `ip default-gateway` on the Linux PCs), Ollama in 5 steps and ~150 s with the one-line fix; Check passed both times. The 7 evals ask questions with no lab open: on local models 1 of 7 passed (`refuse-bgp`). The build evals failed on a broken Bionic and on timeouts in a parallel run; `shutdown-iface` gets the reply right but no longer calls `get_lab_state` when no lab is open (the instructions now tell Eve to answer from the message then).

---

## 11. Deploy

All three apps are projects on the owner's hosting platform on the M6 Mac (`~/orca/hosting-platform`), linked to this repository's `main`; every push deploys all three. The platform allows several projects per repository and branch since 2026-11-20, when each has its own subdomain.

| Service | Project (id) | How it is served |
| --- | --- | --- |
| Angular | `netbench` (`14b77286-a98e-47d1-be92-68cb66b9582e`), static | Cloudflare Pages `hp-netbench`, DNS `CNAME netbench.cristiancode.dev`. Survives the Mac being off. |
| Eve | `netbench-eve` (`959c834e-6d43-4a56-a50a-db42b9d1c44e`), backend | Cloudflare (`hp-netbench-eve.pages.dev`) → Tailscale Funnel 10000 → the process |
| API | `netbench-api` (`ccf8e51a-ae03-468c-911a-58ae8976b75e`), backend | Cloudflare (`hp-netbench-api.pages.dev`) → Tailscale Funnel 10000 → the process |
| DB | Neon project `netbench` (`winter-bird-22962986`) | `sql/schema.sql` is applied by the API at start |

### 11.1 Project settings (read before touching a deploy)

| Setting | `netbench` (web) | `netbench-eve` | `netbench-api` |
| --- | --- | --- | --- |
| Install | `npm ci --no-audit --no-fund --workspace @netbench/web --include-workspace-root` | `npm ci --no-audit --no-fund --workspace @netbench/eve-agent --include-workspace-root` | `npm ci --no-audit --no-fund --workspace @netbench/engine --workspace @netbench/api --include-workspace-root` |
| Build | `npm run build -w @netbench/web` | `npm run build -w @netbench/eve-agent` | `npm test -w @netbench/engine && npm test -w @netbench/api` — the tests are the deploy gate |
| Output / start | `apps/web/dist/web/browser` | `npm run start -w @netbench/eve-agent` | `npm run start -w @netbench/api` |
| Node | 24 | 24 | 24 |
| Variables | — | `NETBENCH_API_URL=http://127.0.0.1:4712/s/netbench-api` (the API through the platform's loopback listener: 12 ms a call against ~300 ms through Cloudflare) | secret: `DATABASE_URL` (the Neon `netbench` pooler URL), `JWT_SECRET` |

The platform sets `PORT` and `HOST=127.0.0.1` for the two processes. Pages serves `index.html` for unknown paths, so the web needs no SPA rule; the platform would read a `vercel.json`, so do not add one back.

The admin is `http://127.0.0.1:4710` on the M6 (`/api/sites/<id>`, `/api/sites/<id>/runtime?since=0` for logs), `https://cristians-mac-mini-1.tailc16623.ts.net:8444` on the tailnet, and `https://hosting.cristiancode.dev` from the internet. The process path is HTTP only — Cloudflare → Funnel → the platform's public listener → the process — so **no WebSocket** reaches the API; do not reintroduce a production `WS` URL without adding upgrade support to the platform first. Streaming responses do pass (Eve's NDJSON stream is piped end to end). `/api/health` reports `HOSTING_COMMIT_SHA` as `version`.

Verify after a deploy:

```bash
curl -s https://netbench-api.cristiancode.dev/api/health       # "version":"<sha12>", "eveTools":true
curl -s https://netbench-eve.cristiancode.dev/eve/v1/health      # {"ok":true,"status":"ready",…}
```

Then in the browser at https://netbench.cristiancode.dev/: footer **Connected**, `ping -c 3 10.0.0.20` from PC1 in lab 1, Check passes; on `ex-wrong-gateway`, ask Eve to fix it and wait (minutes on a local model). This Mac can cache a "no such host" for a new `*.cristiancode.dev` name; test with `curl --resolve` or Chrome `--host-resolver-rules` against the `hp-<slug>.pages.dev` address.

Keep the platform's **Portfolio** switch off for all three projects. The portfolio matches a project to a destacado by repository, so switching one on would point NetBench's Web link at whichever project it is. The destacado (`netbench` on cristiancode.dev) is maintained through the portfolio's MCP server, and its docs come from `docs/`.

**History.** Until November 2026 the API was on a Railway trial and the web app and Eve were on Vercel, Eve on cloud models through the AI Gateway. By 2026-11-18 Railway answered "Application not found"; the API moved to the hosting platform that day. On 2026-11-20 the web app and Eve left Vercel for the same platform, and Eve moved to local models.

---

## 12. Coding conventions

- TypeScript strict. Angular index signatures: use `rec['message']` not `rec.message` (TS4111).
- Match existing comment style: short, factual. No process narration in comments.
- Do not add BGP/MPLS/VXLAN/802.1X “just for completeness”.
- Prefer `edit` for user topology; Eve mutations go through confirmToken.
- Commit style: `fix(web): …`, `feat(engine): …` — imperative, scoped.
- After UI work, include **https://netbench.cristiancode.dev/** in the user-facing reply if they asked for deploy URLs.

---

## 13. Recent work (mobile / Basic) — do not regress

| Commit | What |
| --- | --- |
| `4d98d9e` | Phone tabbed shell (Canvas/Palette/Inspect/Term/Eve) |
| `80093da` | Oversized SVG + pinch zoom (cables were clipped) |
| `9b78cf5` | Simple IPv4-first UI; auto-place; Cable without picking Gi0/x |
| `9a9eb37` | Basic mobile toggle (default on) |
| `879a738` | Basic sheet Close \| Delete 50/50 |
| `8efa4ed` | Add IP when no IPv4 |
| `a6d4324` | Inspector Close \| Delete |
| `a33a410` | `addLink` no-shuts both ends; list every cable |
| `6d4de07` | Basic cards/sheet show ports without Advanced |
| `1f95015` | Simple vs Advanced split; Ethernet/straight/crossover/fiber; used-port display; occupied-port reject |
| `3d8b0b5` | Help dialogs in Basic; click to toggle ports |
| (uncommitted) | UI overhaul: design tokens + components, Focus mode, session recovery, Reach (ping/trace) with canvas hop replay, hints with one-click fixes, check panel + checklist + Next lab, undo delete/unplug, tidy-up, share links, saved labs + proper sign-in/out, terminal history/completion/quick commands, packets filter + log, keyboard shortcuts, welcome tour |
| (uncommitted) | Learning tools: Troubleshoot assistant (layered reading of engine drop reasons), Watch monitor, checkpoints with config diff/restore, lab editor (name/goal/checks), command palette, subnet/VLAN overlays, packet capture per device, Markdown lab report |
| (uncommitted) | Engine: `ip route del/replace`, `ip addr del/flush`, `no ip route`, `no ip address`, `no ip default-gateway`, AP/WLC `int` + per-port shutdown; UI change-gateway / change-address flows, wrong-mask and NAT diagnoses, expected policy drops shown as “denied” |
| (uncommitted) | Eve: shared model config with a longer cheap fallback chain + env overrides, no session token caps, compaction at 0.8; mutating tools auto-run (`EVE_REQUIRE_APPROVAL=1` restores HITL); Nest calls retried 2×; `build_lab` accepts full lab JSON (`validateLab`, startup-line feedback, immediate check) and the spec builder scales to 12 PCs over trunked switches; drawer auto-approve switch, 2× auto-retry + manual Retry, full-topology context block |
| `79d346c`…`e58d5d6` | Eve resilience: dynamic multi-provider model chain with a durable per-session fallback hook (root + subagents), `EVE_APPROVAL` modes, input guards, `idempotencyKey` on mutating tools, `nest.ts` timeouts/jitter/`Retry-After`/error kinds (route-missing vs stale-session), `api_status` tool, outage guidance in `instructions.md`; API idempotent replay + `Retry-After` + health `version`/`eveTools`/`idempotency`; drawer: HITL by kind (questions to the user, everything else auto), freeform answers, 3× same-session retries, stream reconnect |
| `469b424` | `api_status` + `nest.ts` recognise an outdated API build (health without `eveTools`) and give one "redeploy apps/api" message instead of "reload the lab" |
| (uncommitted) | Modes: Basic mobile gets a Canvas / Eve tab bar (`basicTabs`, `showTab`) and its Ask-Eve buttons back; desktop Focus opens Eve and the inspector (“Details”) as right sidebars instead of leaving focus (`focusEve`, `focusInspect`, `closeEve`), zoom controls folded into the floating toolbar with container-query label collapse |
| `ede0ec3` | `apps/api/Dockerfile` → `node:24-slim` (eve needs Node ≥ 24; every Railway build had failed at `npx eve build`). Deployed manually via `serviceInstanceDeployV2`; live API now `version ede0ec3ff8da`, `eveTools: true`. Railway GitHub trigger still missing — §11.1 |
| (uncommitted) | Realistic switches: optional backward-compatible `switchProfile`; unmanaged bridging, managed L2/native VLAN/RSTP-lite, and multilayer SVI/routed-port/static routing/DHCP/relay; profile-aware API, Angular palette/inspector, and Eve schemas/coaching; curriculum expanded to 22 passing models + 26 broken exercises with official solutions. |
| `4438b88`…`55b0916` (2026-11-18) | API to `netbench-api.cristiancode.dev` on the hosting platform; web polls the state without a socket (`live` signal, footer texts in 5 languages); API honours `HOST` and reports `HOSTING_COMMIT_SHA`; CORS preflight cached 10 min; magic-link sign-in removed (account takeover); `resolve()` ties go to the newest session (fixed a flaky test); Eve on free-tier models |
| `96affa8`… (2026-11-18) | Case-study docs `docs/01`–`20` (Spanish) for cristiancode.dev, `portfolio-docs.yml` rebuild workflow; old `docs/architecture.md`, `commands.md` and the stale `lab.schema.json` copy folded in or removed |
| `f1fbde1`, `5252dad` (2026-11-20) | Off Vercel: Eve on local models (Bionic, then Ollama `netbench-eve`) through `@ai-sdk/openai-compatible` with 15-min undici timeouts; OIDC auth, Vercel sandbox, link/deploy scripts, `apps/web/vercel.json` and the Railway Eve image removed; web, Eve and API are three hosting-platform projects; subagent sandboxes pinned to just-bash; shell, file and web tools disabled; no-lab answers in `instructions.md` |

Latest verification (2026-11-20): engine 64 and API 37 tests green, `tsc --noEmit` clean for both, Angular and `eve build` green on the platform. Live at https://netbench.cristiancode.dev in headless Chrome at 1280×800: footer Connected, `ex-wrong-gateway` Check fails, then Eve — on Ollama `netbench-eve`, because Bionic was hung — read the lab, ran `run_check` and `get_path`, replaced PC2's default route and confirmed with `run_check`, in about 2 minutes, streamed through Cloudflare. The test browser itself was killed by memory pressure while Ollama's model (13.8 GB) was loaded; the turn finished on the server.

Previous verification (2026-11-18): engine 64 tests green; API 37 tests green (6 runs in a row); `tsc --noEmit` clean for engine and API; Angular production build green; `eve build` green. Live, in headless Chrome at 1440×900: guest boot, ping, Check pass on lab 1, Check fail on `ex-wrong-gateway`, Eve diagnosed and fixed it through the new API, footer Connected throughout.

### Known pitfalls

1. **SVG viewport clipping** — SVG must be world-sized, not `h-full w-full`.
2. **Zoneless Angular** — gesture/pinch native listeners need `cdr.detectChanges()`.
3. **Switch ports admin down** — only Gi0/1–2 are no-shut in lab-1 startup; new cables must `adminUp` (engine `addLink`).
4. **Eve model** — local only: Bionic `qwen3.8-9b-heretic-uncensored-mtplx`, then Ollama `netbench-eve` (create it from `apps/eve-agent/ollama/Modelfile`; plain `qwen3.5:9b-mlx` has an 8K context through Ollama's OpenAI endpoint, too small for Eve).
5. **Eve URL** — Angular must use `https://netbench-eve.cristiancode.dev`, not an `/eve` proxy on the API.
6. **`defineAgent({ name })`** — invalid on eve 0.47.
7. **Tailwind `flex` vs `[class.hidden]`** — use `[ngClass]` to choose `hidden` **or** `flex`, not both.
8. **Guest labs** persist in `localStorage.nb_guest_lab` and restore on reload. Neon SELECT still required for signed-in lab lists.
9. **Builder spec** — bare “PC” must count; VLAN per role; emit ping Check.
10. **Header stacking** — the header has `backdrop-blur` (a stacking context); it must keep `relative z-30` or its popovers (lab picker, ⋯ menu) render under the canvas.
11. **No regex literals / arrow functions in templates** — Angular rejects them; use component methods (`isApproveOption`, `reachHasTarget`).
12. **Terminal input** binds `[value]`/`(input)` to a signal on purpose: `ngModel` writes programmatic changes asynchronously, which breaks Tab completion and ↑/↓ history.
13. **Hints are state, not simulation** — `hintsFor()` only reads engine facts (adminUp, status, peers, running-config, checks). Never add a hint that predicts forwarding.
14. **`HTTP 404 — Cannot POST /api/eve/tools/confirm` from Eve** (usually with `lab session not found` for the UI's `labKey`) means the API is an older build than the web app and Eve. Check `GET https://netbench-api.cristiancode.dev/api/health`: `version` must be a recent `main` commit and `eveTools: true`. The hosting platform deploys every push; if it did not, look at the deploy in its admin (a failed test leaves the old build serving).
15. **No socket in production** — `WS` is `null` off localhost and `Api.poll()` reads the state. A `wss://` URL would fail on the HTTP-only path and the footer would sit on Reconnecting.
16. **Eve says `MODEL_CALL_FAILED` with `ECONNREFUSED`/`ECONNRESET`/`EPIPE` on `127.0.0.1:1235`** — Bionic is down or hung (on 2026-11-19 it kept its port open but reset every connection until the app was restarted). Eve moves to Ollama on the next step; the drawer re-sends the turn. Check `curl -s 127.0.0.1:1235/v1/models` and Mac mini Monitor's AI page.
17. **Phone header width** — at 390 px the header holds the lab picker, Help (Basic), Undo (not in Basic), Check and Basic on / ⋯. My labs, Save and Redo are hidden below `md` (My labs and Save a copy are in ⋯). One more button made the header 516 px wide and mobile Chrome then zoomed the whole page out; measure `document.documentElement.scrollWidth` at 390 after any header change.
18. **Eve's replies are rendered** by `eve-markdown.ts` (escape first, then fenced code, `code`, **bold**). Tables and headings are not rendered; `instructions.md` and the `how-eve-must-talk` skill tell Eve not to write them.
19. **Subagent sandboxes** — every subagent needs its own `sandbox.ts` pinning just-bash. Without it eve's default backend uses Docker on this Mac (Docker's VM is capped at 5 GB and the internal disk is nearly full).
20. **Local models are slow and serial** — a multi-step fix takes ~2.5 min, one conversation at a time. Run evals with `--max-concurrency 1`.

---

## 14. Suggested next work (not started)

These are ideas, not commitments:

- Recable/no-shut existing Gi0/3 on old sessions without asking the user to delete the cable.
- Persist Basic/Advanced/Focus per user account, not only localStorage.
- Dedicated `POST /sessions/:id/state` (or `/labs` on builtin id) that does not let a signed-in autosave overwrite a row keyed by a builtin lab id.
- Add a GitHub Actions workflow for tests, type checks and the web build; today only the API deploy runs the tests.
- Bump root `package.json` `engines.node` to `>=24` (eve's real requirement).
- Desktop Basic is unused; only phones. Desktop uses Simple vs Advanced.
- Console cable (out-of-band CLI) — not in the palette.

---

## 15. Quick “where do I edit X?”

| Want | Edit |
| --- | --- |
| Ping/ARP/OSPF/VLAN forwarding | `packages/engine/src/engine.ts` |
| Builtin labs | `packages/engine/src/labs.ts` |
| New device kind (discouraged) | `types.ts` KIND_PORTS + `devices.ts` + UI palette |
| Builder English → topology | `packages/engine/src/build.ts` |
| REST/WS | `apps/api/src/http.ts`, `create-app.ts`, `sim.service.ts` |
| Canvas / Basic / inspector / Focus | `apps/web/src/app/workspace.ts` + `workspace.html` |
| Terminal behaviour, quick commands | `apps/web/src/app/terminal.ts` |
| Packet list / activity log | `apps/web/src/app/packets.ts` |
| Icons, colours, button styles | `apps/web/src/app/icons.ts`, `apps/web/src/styles.css` |
| API origin / palette labels | `apps/web/src/app/api.ts` |
| Eve stream / HITL | `apps/web/src/app/eve-client.ts` |
| Eve model / tools | `apps/eve-agent/agent/agent.ts`, `agent/tools/` |
| DB schema | `sql/schema.sql` + `apps/api/src/store.ts` |

---

## 16. First commands for a new agent

```bash
cd netbench   # a clone of git@github.com:Criscode2022/netbench.git, or the worktree you were given
git status && git log -5 --oneline
npm test -w @netbench/engine && npm test -w @netbench/api
curl -s https://netbench-api.cristiancode.dev/api/health   # "version" must match a recent main commit; if not, check the deploy per §11.1 before debugging anything Eve-related
```

Then read `workspace.html` / `workspace.ts` if the task is UI, or `engine.ts` / `labs.ts` if it is forwarding. Keep the eight-device junior palette. Verify phones at 390×844 and desktop at 1280×800 for any UI change.
