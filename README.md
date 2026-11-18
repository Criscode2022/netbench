# NetBench

Browser network lab for a junior network and systems administrator — plus **Eve**, a Vercel eve instructor agent.

**Continuing this repo (coding agents):** read [`HANDOFF.md`](./HANDOFF.md) first. It covers architecture, UI modes (Basic / mobile / desktop), Eve, deploy URLs, and what not to regress.

Not Packet Tracer. Not a CCIE catalog. Eight stable device kinds, three realistic switch profiles, dual-stack IPv4/IPv6, honest drops.

- **Try it:** https://netbench-www-criscode2022s-projects.vercel.app/ (no account needed)
- **Case study and docs:** https://cristiancode.dev/featured/netbench, from [`docs/`](./docs/README.md) (Spanish)

## Apps

| Path | What |
| --- | --- |
| `apps/web` | Angular + Tailwind canvas, terminals, packet inspector, Eve drawer |
| `apps/api` | NestJS lab engine, auth, lab CRUD, WebSockets, Eve tool API |
| `apps/eve-agent` | Vercel eve project (`eve deploy`) |
| `packages/engine` | Discrete-event simulator (import this in tests) |

## Device palette

Workstation (eth0+wlan0), Server, Switch (8×Gi), Router (4-port), Firewall (4-port), Access Point, thin WLC, Cloud/Internet stub.

The palette has one Switch tile (unmanaged by default). Cycle unmanaged → managed L2 → multilayer from the top-left button on desktop, a long-press on mobile, or the details of a switch already on the canvas. It remains one backward-compatible `switch` kind:
- **Unmanaged** — plug-and-play MAC learning and forwarding; no CLI, VLANs, IP, DHCP, or routing.
- **Managed L2** — access/trunk VLANs, native VLAN, RSTP-lite, MAC table, and management SVI.
- **Multilayer L3** — managed-L2 features plus `ip routing`, routed ports, SVI routing, static routes, DHCP pools/exclusions, and `ip helper-address`.

## Local run

```bash
cp .env.example .env
npm install
npm test -w @netbench/engine
npm test -w @netbench/api
npm run login:vercel    # once — same Vercel account as production Eve
npm run link:eve        # once — writes AI Gateway OIDC into apps/eve-agent/.env.local
npm run dev             # API :3001 + UI :4200 + Eve :4010
```

- UI: http://localhost:4200
- API: http://localhost:3001/api/health
- Eve: local `eve dev` on `:4010` uses the **same AI Gateway** as production (OIDC from `npm run link:eve`). Tools still talk to Nest on `:3001`, not production. Re-run `npm run link:eve` if the OIDC token expires (~24h). Alternative: set `AI_GATEWAY_API_KEY` in `.env`.

Guest mode works without an account; the lab is saved in this browser and restored on reload. Sign in to keep it on your account and other devices. Accounts are email and password.

## Built-in labs

The curriculum has **48 labs** in two groups:
- **22 Models** are complete reference networks that pass Check as shipped.
- **26 Exercises** are intentionally broken or incomplete, expose progressive hints, and carry an official solution patch that makes Check pass.

Switch-specific models cover unmanaged bridging, managed-L2 VLAN trunks and management SVIs, multilayer inter-VLAN routing, local DHCP, and remote DHCP relay. Paired exercises cover endpoint faults behind an unmanaged switch, trunk allow-lists, missing `ip routing`, a wrong DHCP pool network, and a missing helper address.

Every lab has a **Check** with exact failure reasons, and **Troubleshoot** explains where and why a packet was dropped.

## Command cheat sheet

Open **Command reference** in the UI, or `help` in a node terminal. Linux: `ip addr add|del`, `ip route add|del|replace`, `ping`/`ping6`, `traceroute`, `nmcli wifi connect`, `dhclient`, `ssh`, `dig`. Managed switches and routers use a small Cisco-like subset. Multilayer switches add `ip routing`, `no switchport`, static routes, DHCP pools/exclusions and DHCP relay. Unknown or profile-inappropriate commands fail honestly.

## Simulator overview

See [`docs/03-architecture.md`](./docs/03-architecture.md) and [`docs/17-engine.md`](./docs/17-engine.md). Forwarding is real (MAC, 802.1Q, ARP/NDP, static, OSPFv2 area 0, DHCP, SLAAC, ACL, NAT, simplified Wi-Fi BSS). Eve **reads the engine** via Nest tools; it does not invent a topology.

Lab JSON schema: `packages/engine/schema/lab.schema.json`.

## Deploy

**Split is required:** the forwarding engine is a long-running Node process (not a 10s serverless timeout).

| Piece | Where | Deploys |
| --- | --- | --- |
| Angular | Vercel project `netbench-www` | every push to `main` |
| Eve | Vercel project `netbench-eve` (`eve deploy`, OIDC + AI Gateway) | every push to `main`; by hand with `npm run deploy:eve` |
| Nest API + engine | The owner's own hosting platform, on a Mac, project `netbench-api`, served at `https://netbench-api.cristiancode.dev` through Cloudflare and Tailscale Funnel | every push to `main`, after the engine and API tests pass |
| Postgres | Neon project `netbench`; `sql/schema.sql` is applied by the API at start | — |

That path is HTTP only, so production has no WebSocket: the web app polls the session state every 1.5 s (`apps/web/src/app/api.ts`). Localhost keeps the socket. Any other always-on Node ≥ 24 host works too: `apps/api/Dockerfile` (repo root as context), env `PORT`, `JWT_SECRET`, `DATABASE_URL`.

Eve's models must be open to the AI Gateway **free tier** (`availableToFreeTier` on https://vercel.com/ai-gateway/models) unless the account buys credits; see `apps/eve-agent/agent/lib/model.ts`.

```bash
npm run login:vercel      # once, if `vercel whoami` says Logged out
npm run link:eve          # link apps/eve-agent → Vercel project netbench-eve
npm run deploy:eve        # production deploy of the Eve agent (also: npm run deploy)
```

Health:
- API `GET https://netbench-api.cristiancode.dev/api/health` (`version` is the deployed commit; `eveTools: true`)
- Eve `GET https://netbench-eve-criscode2022s-projects.vercel.app/eve/v1/health` (`{"ok":true,"status":"ready"}`)
- Angular `https://netbench-www-criscode2022s-projects.vercel.app/`

Full runbook: [`docs/08-deploy.md`](./docs/08-deploy.md).
