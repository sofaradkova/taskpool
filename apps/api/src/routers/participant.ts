import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { publicProcedure, router } from "../trpc.js";

export const participantRouter = router({
  join: publicProcedure
    .input(
      z.object({
        roomId: z.string().cuid(),
        displayName: z.string().min(1).max(50),
      })
    )
    .mutation(async ({ input }) => {
      const room = await prisma.room.findUnique({
        where: { id: input.roomId },
        select: { id: true },
      });
      if (!room) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Room not found" });
      }

      const participant = await prisma.$transaction(async (tx) => {
        const p = await tx.participant.create({
          data: { roomId: input.roomId, displayName: input.displayName },
        });
        await tx.eventLog.create({
          data: {
            roomId: input.roomId,
            participantId: p.id,
            eventType: "PARTICIPANT_JOINED",
            payload: { displayName: input.displayName },
          },
        });
        return p;
      });

      return participant;
    }),
});
