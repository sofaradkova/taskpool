import type { TypedIO } from "./socket.js";
import { prisma } from "./prisma.js";
import { getRedis } from "./redis.js";

const PRESENCE_TTL = 90; // seconds

function presenceKey(eventId: string, participantId: string) {
  return `presence:${eventId}:${participantId}`;
}

async function setPresence(eventId: string, participantId: string, displayName: string) {
  const redis = getRedis();
  if (!redis) return;
  await redis.set(
    presenceKey(eventId, participantId),
    JSON.stringify({ displayName, joinedAt: new Date().toISOString() }),
    { EX: PRESENCE_TTL },
  );
}

async function removePresence(eventId: string, participantId: string) {
  const redis = getRedis();
  if (!redis) return;
  await redis.del(presenceKey(eventId, participantId));
}

export async function refreshPresence(eventId: string, participantId: string) {
  const redis = getRedis();
  if (!redis) return;
  await redis.expire(presenceKey(eventId, participantId), PRESENCE_TTL);
}

async function getPresenceSnapshot(
  eventId: string,
): Promise<{ id: string; displayName: string }[]> {
  const redis = getRedis();

  if (redis) {
    // Scan all presence keys for this event
    const keys = await redis.keys(`presence:${eventId}:*`);
    if (keys.length === 0) return [];

    const values = await redis.mGet(keys);
    return keys.flatMap((key, i) => {
      const raw = values[i];
      if (!raw) return [];
      const { displayName } = JSON.parse(raw) as { displayName: string };
      const participantId = key.split(":")[2]!;
      return [{ id: participantId, displayName }];
    });
  }

  // No Redis — fall back to all DB participants for this event
  return prisma.participant.findMany({
    where: { roomId: eventId },
    select: { id: true, displayName: true },
  });
}

export function registerSocketHandlers(io: TypedIO): void {
  io.on("connection", (socket) => {
    socket.on("join_room", async ({ eventId, participantId }) => {
      // Validate the participant belongs to this event
      const participant = await prisma.participant.findFirst({
        where: { id: participantId, roomId: eventId },
        select: { id: true, displayName: true },
      });

      if (!participant) {
        socket.disconnect(true);
        return;
      }

      const room = `room:${eventId}`;
      await socket.join(room);

      // Store on socket so disconnect handler can reference it
      socket.data.eventId = eventId;
      socket.data.participantId = participantId;
      socket.data.displayName = participant.displayName;

      await Promise.all([
        setPresence(eventId, participantId, participant.displayName),
        prisma.eventLog.create({
          data: {
            roomId: eventId,
            participantId,
            eventType: "PARTICIPANT_JOINED",
            payload: { displayName: participant.displayName },
          },
        }),
      ]);

      // Send current presence list only to the joining socket
      const snapshot = await getPresenceSnapshot(eventId);
      socket.emit("presence:snapshot", { participants: snapshot });

      // Broadcast to everyone else in the room
      socket.to(room).emit("participant:joined", {
        participantId,
        displayName: participant.displayName,
      });
    });

    socket.on("heartbeat", async () => {
      const { eventId, participantId } = socket.data as {
        eventId?: string;
        participantId?: string;
      };
      if (!eventId || !participantId) return;
      await refreshPresence(eventId, participantId);
    });

    socket.on("disconnect", async () => {
      const { eventId, participantId, displayName } = socket.data as {
        eventId?: string;
        participantId?: string;
        displayName?: string;
      };

      // Only act if this socket successfully joined a room
      if (!eventId || !participantId) return;

      const room = `room:${eventId}`;

      await Promise.all([
        removePresence(eventId, participantId),
        prisma.eventLog.create({
          data: {
            roomId: eventId,
            participantId,
            eventType: "PARTICIPANT_LEFT",
            payload: { displayName: displayName ?? "" },
          },
        }),
      ]);

      io.to(room).emit("participant:left", { participantId });
    });
  });
}
