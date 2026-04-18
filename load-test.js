import http from "k6/http";
import { check, sleep } from "k6";
import { Counter } from "k6/metrics";

const BASE_URL = "https://taskpool.duckdns.org";

const conflicts = new Counter("claim_conflicts");

export const options = {
  stages: [
    { duration: "30s", target: 10 },  // ramp up to 10 virtual users
    { duration: "60s", target: 10 },  // hold at 10 for 1 minute
    { duration: "30s", target: 30 },  // spike to 30
    { duration: "30s", target: 0  },  // ramp down
  ],
  thresholds: {
    http_req_duration: ["p(95)<2000"],  // 95% of requests under 2s
    http_req_failed:   ["rate<0.05"],   // less than 5% errors
  },
};

function trpcMutation(procedure, input, token) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return http.post(
    `${BASE_URL}/trpc/${procedure}`,
    JSON.stringify(input),
    { headers }
  );
}

function trpcQuery(procedure, input, token) {
  const headers = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return http.get(
    `${BASE_URL}/trpc/${procedure}?input=${encodeURIComponent(JSON.stringify(input))}`,
    { headers }
  );
}

export default function () {
  // 1. Create a new event (each VU creates its own)
  const createRes = trpcMutation("event.create", {
    name: `Load Test Event ${__VU}-${__ITER}`,
    creatorName: `User${__VU}`,
  });

  check(createRes, { "event created": (r) => r.status === 200 });
  if (!createRes || createRes.status !== 200) return;

  let body;
  try { body = JSON.parse(createRes.body); } catch { return; }
  const eventId = body.result?.data?.event?.id;
  const token = body.result?.data?.token;
  if (!eventId || !token) return;

  // 2. Create 3 tasks
  const taskIds = [];
  for (let i = 0; i < 3; i++) {
    const taskRes = trpcMutation("task.create", { eventId, title: `Task ${i + 1}` }, token);
    check(taskRes, { "task created": (r) => r.status === 200 });
    if (!taskRes || taskRes.status !== 200) continue;
    try {
      const taskBody = JSON.parse(taskRes.body);
      const taskId = taskBody.result?.data?.id;
      if (taskId) taskIds.push({ id: taskId, version: 0 });
    } catch {}
  }

  sleep(0.5);

  // 3. Join as a second participant
  const joinRes = trpcMutation("participant.join", { eventId, displayName: `Joiner${__VU}` });
  check(joinRes, { "participant joined": (r) => r.status === 200 });
  if (!joinRes || joinRes.status !== 200) return;
  let joinerToken, joinerId;
  try {
    const joinBody = JSON.parse(joinRes.body);
    joinerToken = joinBody.result?.data?.token;
    joinerId = joinBody.result?.data?.participant?.id;
  } catch { return; }
  if (!joinerToken || !joinerId) return;

  sleep(0.5);

  // 4. Claim tasks and track updated versions for status transitions
  const claimedTasks = [];
  for (const task of taskIds) {
    const claimRes = trpcMutation(
      "task.claim",
      { taskId: task.id, participantId: joinerId, expectedVersion: task.version },
      joinerToken
    );
    if (claimRes && claimRes.status === 200) {
      check(claimRes, { "task claimed": () => true });
      try {
        const claimBody = JSON.parse(claimRes.body);
        const newVersion = claimBody.result?.data?.version;
        if (newVersion !== undefined) {
          claimedTasks.push({ id: task.id, version: newVersion });
        }
      } catch {}
    } else if (claimRes && claimRes.body && claimRes.body.includes("CONFLICT")) {
      conflicts.add(1);
    }
  }

  sleep(0.5);

  // 5. Move claimed tasks to IN_PROGRESS
  const inProgressTasks = [];
  for (const task of claimedTasks) {
    const startRes = trpcMutation(
      "task.updateStatus",
      { taskId: task.id, participantId: joinerId, status: "IN_PROGRESS", expectedVersion: task.version },
      joinerToken
    );
    check(startRes, { "task started": (r) => r.status === 200 });
    if (startRes && startRes.status === 200) {
      try {
        const startBody = JSON.parse(startRes.body);
        const newVersion = startBody.result?.data?.version;
        if (newVersion !== undefined) {
          inProgressTasks.push({ id: task.id, version: newVersion });
        }
      } catch {}
    }
  }

  sleep(0.5);

  // 6. Mark tasks as DONE
  for (const task of inProgressTasks) {
    const doneRes = trpcMutation(
      "task.updateStatus",
      { taskId: task.id, participantId: joinerId, status: "DONE", expectedVersion: task.version },
      joinerToken
    );
    check(doneRes, { "task completed": (r) => r.status === 200 });
  }

  // 7. Read the event board (GET query)
  const getRes = trpcQuery("event.get", { eventId });
  check(getRes, { "event fetched": (r) => r.status === 200 });

  sleep(1);
}
