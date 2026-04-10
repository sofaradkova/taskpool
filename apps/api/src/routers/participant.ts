import { TRPCError } from "@trpc/server";
import { z } from "zod";
import jwt from "jsonwebtoken";
import { prisma } from "../prisma.js";
import { publicProcedure, router } from "../trpc.js";

export const participantRouter = router({
  join: publicProcedure
    .input(
      z.object({
        eventId: z.string().cuid(),
        displayName: z.string().min(1).max(50),
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

      const participant = await prisma.$transaction(async (tx) => {
        const p = await tx.participant.create({
          data: { roomId: input.eventId, displayName: input.displayName },
        });
        await tx.eventLog.create({
          data: {
            roomId: input.eventId,
            participantId: p.id,
            eventType: "PARTICIPANT_JOINED",
            payload: { displayName: input.displayName },
          },
        });
        return p;
      });

      const secret = process.env.JWT_SECRET;
      if (!secret) throw new Error("JWT_SECRET not set");
      const token = jwt.sign(
        { participantId: participant.id, roomId: input.eventId },
        secret,
        { expiresIn: "14d" },
      );

      return { participant, token };
    }),
});
