import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { publicProcedure, router } from "../trpc.js";

export const eventRouter = router({
  create: publicProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        description: z.string().max(500).optional(),
        expiresAt: z.coerce.date().optional(),
        creatorName: z.string().min(1).max(50),
      })
    )
    .mutation(async ({ input }) => {
      return prisma.$transaction(async (tx) => {
        const event = await tx.room.create({
          data: {
            name: input.name,
            description: input.description ?? null,
            expiresAt: input.expiresAt ?? null,
          },
        });

        const creator = await tx.participant.create({
          data: { roomId: event.id, displayName: input.creatorName },
        });

        await tx.eventLog.create({
          data: {
            roomId: event.id,
            participantId: creator.id,
            eventType: "PARTICIPANT_JOINED",
            payload: { displayName: input.creatorName },
          },
        });

        return { event, participantId: creator.id };
      });
    }),

  get: publicProcedure
    .input(
      z.object({
        eventId: z.string().cuid(),
      })
    )
    .query(async ({ input }) => {
      const event = await prisma.room.findUnique({
        where: { id: input.eventId },
        include: { tasks: true, participants: true },
      });
      if (!event) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Event not found" });
      }
      return event;
    }),
});
