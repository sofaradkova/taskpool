import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { publicProcedure, router } from "../trpc.js";
import { getIO } from "../socket.js";

export const taskRouter = router({
  create: publicProcedure
    .input(
      z.object({
        eventId: z.string().cuid(),
        title: z.string().min(1).max(200),
        description: z.string().max(1000).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const room = await prisma.room.findUnique({
        where: { id: input.eventId },
        select: { id: true },
      });
      if (!room) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Event not found" });
      }

      const task = await prisma.$transaction(async (tx) => {
        const t = await tx.task.create({
          data: {
            roomId: input.eventId,
            title: input.title,
            description: input.description ?? null,
          },
        });
        await tx.eventLog.create({
          data: {
            roomId: input.eventId,
            taskId: t.id,
            eventType: "TASK_CREATED",
            payload: { title: t.title, description: t.description },
          },
        });
        return t;
      });

      getIO()
        .to(`room:${input.eventId}`)
        .emit("task:created", { task: task as never });

      return task;
    }),

  claim: publicProcedure
    .input(
      z.object({
        taskId: z.string().cuid(),
        participantId: z.string().cuid(),
        expectedVersion: z.number().int().min(0),
      })
    )
    .mutation(async ({ input }) => {
      const task = await prisma.$transaction(async (tx) => {
        // CAS update: only succeeds if version and status still match
        const result = await tx.task.updateMany({
          where: {
            id: input.taskId,
            version: input.expectedVersion,
            status: "UNCLAIMED",
          },
          data: {
            status: "CLAIMED",
            claimedBy: input.participantId,
            leaseExpiresAt: new Date(Date.now() + 2 * 60 * 1000),
            version: { increment: 1 },
          },
        });

        if (result.count === 0) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Task already claimed — someone got there first.",
          });
        }

        const updated = await tx.task.findUniqueOrThrow({
          where: { id: input.taskId },
        });

        await tx.eventLog.create({
          data: {
            roomId: updated.roomId,
            taskId: updated.id,
            participantId: input.participantId,
            eventType: "TASK_CLAIMED",
            payload: {
              version: updated.version,
              leaseExpiresAt: updated.leaseExpiresAt,
            },
          },
        });

        return updated;
      });

      getIO()
        .to(`room:${task.roomId}`)
        .emit("task:claimed", {
          taskId: task.id,
          participantId: input.participantId,
          version: task.version,
          leaseExpiresAt: task.leaseExpiresAt!,
        });

      return task;
    }),

  updateStatus: publicProcedure
    .input(
      z.object({
        taskId: z.string().cuid(),
        participantId: z.string().cuid(),
        // All statuses are valid targets; UNCLAIMED→X is handled by task.claim
        status: z.enum(["UNCLAIMED", "CLAIMED", "IN_PROGRESS", "DONE"]),
        expectedVersion: z.number().int().min(0),
      })
    )
    .mutation(async ({ input }) => {
      // Which statuses can transition into each target
      const VALID_SOURCES: Record<string, string[]> = {
        UNCLAIMED:    ["CLAIMED", "IN_PROGRESS", "DONE"],
        CLAIMED:      ["IN_PROGRESS", "DONE"],
        IN_PROGRESS:  ["CLAIMED", "DONE"],
        DONE:         ["CLAIMED", "IN_PROGRESS"],
      };

      const EVENT_TYPE: Record<string, "TASK_UNCLAIMED" | "TASK_CLAIMED" | "TASK_STARTED" | "TASK_COMPLETED"> = {
        UNCLAIMED:   "TASK_UNCLAIMED",
        CLAIMED:     "TASK_CLAIMED",
        IN_PROGRESS: "TASK_STARTED",
        DONE:        "TASK_COMPLETED",
      };

      const validSources = VALID_SOURCES[input.status];
      if (!validSources) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid target status." });
      }

      const task = await prisma.$transaction(async (tx) => {
        const result = await tx.task.updateMany({
          where: {
            id: input.taskId,
            version: input.expectedVersion,
            claimedBy: input.participantId,
            status: { in: validSources as ("CLAIMED" | "IN_PROGRESS" | "DONE")[] },
          },
          data: {
            status: input.status,
            version: { increment: 1 },
            // Releasing back to UNCLAIMED clears ownership and lease
            ...(input.status === "UNCLAIMED" && { claimedBy: null, leaseExpiresAt: null }),
            // Re-claiming resets the lease
            ...(input.status === "CLAIMED" && { leaseExpiresAt: new Date(Date.now() + 2 * 60 * 1000) }),
            // Completing clears the lease
            ...(input.status === "DONE" && { leaseExpiresAt: null }),
          },
        });

        if (result.count === 0) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Task state changed — please refresh.",
          });
        }

        const updated = await tx.task.findUniqueOrThrow({
          where: { id: input.taskId },
        });

        await tx.eventLog.create({
          data: {
            roomId: updated.roomId,
            taskId: updated.id,
            participantId: input.participantId,
            eventType: EVENT_TYPE[input.status]!,
            payload: { version: updated.version, manual: true },
          },
        });

        return updated;
      });

      const io = getIO();
      const room = `room:${task.roomId}`;

      if (input.status === "UNCLAIMED") {
        io.to(room).emit("task:unclaimed", { taskId: task.id, reason: "manual" });
      } else if (input.status === "CLAIMED") {
        io.to(room).emit("task:claimed", {
          taskId: task.id,
          participantId: input.participantId,
          version: task.version,
          leaseExpiresAt: task.leaseExpiresAt!,
        });
      } else if (input.status === "IN_PROGRESS") {
        io.to(room).emit("task:started", {
          taskId: task.id,
          participantId: input.participantId,
          version: task.version,
        });
      } else if (input.status === "DONE") {
        io.to(room).emit("task:completed", {
          taskId: task.id,
          participantId: input.participantId,
          version: task.version,
        });
      }

      return task;
    }),
});
