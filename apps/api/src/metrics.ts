import { Registry, Counter, Histogram, Gauge } from "prom-client";

export const register = new Registry();

// How long each tRPC procedure takes (labelled by procedure name and success/error)
export const trpcDuration = new Histogram({
  name: "trpc_request_duration_seconds",
  help: "Duration of tRPC procedure calls in seconds",
  labelNames: ["procedure", "status"],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [register],
});

// How many times two participants raced to claim the same task and one lost
export const claimConflicts = new Counter({
  name: "taskpool_claim_conflicts_total",
  help: "Number of task claim conflicts (optimistic concurrency failures)",
  registers: [register],
});

// How many participants are currently connected across all rooms
export const activePresence = new Gauge({
  name: "taskpool_active_participants",
  help: "Number of currently connected participants across all rooms",
  registers: [register],
});

// How many Socket.io connections are currently open
export const socketConnections = new Gauge({
  name: "taskpool_socket_connections",
  help: "Number of active Socket.io connections",
  registers: [register],
});
