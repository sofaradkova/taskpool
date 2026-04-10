import { TRPCError } from "@trpc/server";
import { z } from "zod";
import jwt from "jsonwebtoken";
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

        const secret = process.env.JWT_SECRET;
        if (!secret) throw new Error("JWT_SECRET not set");
        const token = jwt.sign(
          { participantId: creator.id, roomId: event.id },
          secret,
          { expiresIn: "14d" },
        );

        return { event, participantId: creator.id, token };
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
