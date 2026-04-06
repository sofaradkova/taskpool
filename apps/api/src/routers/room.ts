import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { publicProcedure, router } from "../trpc.js";

export const roomRouter = router({
  create: publicProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        description: z.string().max(500).optional(),
        expiresAt: z.coerce.date().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const room = await prisma.room.create({
        data: {
          name: input.name,
          description: input.description ?? null,
          expiresAt: input.expiresAt ?? null,
        },
      });
      return room;
    }),

  get: publicProcedure
    .input(
      z.object({
        roomId: z.string().cuid(),
      })
    )
    .query(async ({ input }) => {
      const room = await prisma.room.findUnique({
        where: { id: input.roomId },
        include: { tasks: true, participants: true },
      });
      if (!room) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Room not found" });
      }
      return room;
    }),
});
