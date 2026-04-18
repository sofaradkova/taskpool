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

## Testing under load