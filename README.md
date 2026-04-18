# Taskpool

Real-time collaborative task coordination for group events (apartment moves, parties, volunteer events). Multiple participants claim tasks simultaneously on a live board.

## Stack

- **Frontend** — Next.js + Tailwind
- **Backend** — Fastify + tRPC
- **Realtime** — Socket.io + Redis adapter
- **Database** — PostgreSQL via Prisma
- **Observability** — OpenTelemetry + Grafana + Jaeger

## Getting started

```bash
pnpm install
pnpm prisma migrate dev
pnpm dev
```

## Project structure

```
apps/web       Next.js frontend
apps/api       Fastify backend
packages/db    Prisma schema + client
packages/types Shared TypeScript types
```

## Features

- **Live task board** — tasks move through `UNCLAIMED → CLAIMED → IN_PROGRESS → DONE` and every connected client updates instantly via Socket.io
- **Conflict-safe claiming** — optimistic concurrency (version field) ensures two participants can never claim the same task; the loser gets a conflict toast
- **Live presence** — a participant strip shows who is currently in the room, tracked in Redis with a 30 s heartbeat and 90 s TTL
- **Append-only audit log** — every task state change is written to an `EventLog` table in the same transaction, giving a full history of the event

## Load Testing & Observability

The load test (`load-test.js`) uses [k6](https://k6.io) to simulate realistic concurrent usage. Each virtual user (VU) runs a complete task lifecycle: create event → create 3 tasks → join as second participant → claim all tasks → move to IN_PROGRESS → mark DONE → read board.

**Load shape:**
```
0–30s    0 → 10 VUs   warmup
30–90s   10 VUs        steady state
90–120s  10 → 30 VUs  spike
120–150s 30 → 0 VUs   cooldown
```

**Results:**

| Metric | Value |
|---|---|
| p50 latency | 1.04s |
| p90 latency | 2.42s |
| p95 latency | 3.89s |
| p99 latency | ~5s |
| Error rate | 1.33% |
| Throughput | ~8.6 req/s |
| Iterations completed | 95 |

![Request rate](docs/request-rate-load-test.png)

`task.updateStatus` (blue) dominates at ~4.1 req/s peak — expected, since each iteration calls it 6 times (3 tasks × 2 transitions: CLAIMED→IN_PROGRESS then IN_PROGRESS→DONE). `task.create` and `task.claim` follow at ~2 req/s. `event.create`, `participant.join`, and `event.get` run once per iteration and stay below 1 req/s.

![Latency p50/p95/p99](docs/latency-load-test.png)

At 10 VUs all procedures sit below 1s. As load climbs the percentile lines fan out — p50 stays around 1s while p95 and p99 climb to 3.5–5s. Unlike the request rate (which peaks and drops), latency stays elevated for the remainder of the test. This is the DB connection pool staying saturated.

The database (Supabase) is hosted in `us-east-1` while the GKE cluster runs in `us-central1`. Each query carries ~60ms of cross-region network latency at baseline. A co-located deployment would substantially reduce p95/p99.

### Running observability locally

```bash
kubectl port-forward svc/jaeger 16686:16686 &
kubectl port-forward svc/prometheus 9090:9090 &
kubectl port-forward svc/grafana 3000:3000 &
```

- Grafana: http://localhost:3000 → Dashboards → Taskpool
- Jaeger: http://localhost:16686 → select service `taskpool-api`
- Prometheus: http://localhost:9090

Run the load test:
```bash
k6 run load-test.js
```
