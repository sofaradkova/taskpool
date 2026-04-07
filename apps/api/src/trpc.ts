import { initTRPC, TRPCError } from "@trpc/server";
import type { CreateFastifyContextOptions } from "@trpc/server/adapters/fastify";
import { Prisma } from "@prisma/client";

// Keep req/res available to procedures without leaking Fastify's types
// into the shared AppRouter type that the frontend imports.
export interface Context {
  req: CreateFastifyContextOptions["req"];
  res: CreateFastifyContextOptions["res"];
}

export function createContext({ req, res }: CreateFastifyContextOptions): Context {
  return { req, res };
}

// Map Prisma errors to the appropriate TRPCError code.
// TRPCErrors pass through unchanged; anything else becomes INTERNAL_SERVER_ERROR.
function mapPrismaError(err: unknown): unknown {
  if (err instanceof TRPCError) return err;

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case "P2002": // Unique constraint violation
        return new TRPCError({
          code: "CONFLICT",
          message: "A record with that value already exists.",
          cause: err,
        });
      case "P2025": // Record not found (findUniqueOrThrow, updateOrThrow, etc.)
        return new TRPCError({
          code: "NOT_FOUND",
          message: "Record not found.",
          cause: err,
        });
      case "P2003": // Foreign key constraint failed
      case "P2014": // Relation constraint violation
        return new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid reference — related record does not exist.",
          cause: err,
        });
    }
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    return new TRPCError({
      code: "BAD_REQUEST",
      message: "Invalid data sent to the database.",
      cause: err,
    });
  }

  if (err instanceof Prisma.PrismaClientInitializationError) {
    return new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Database connection failed.",
      cause: err,
    });
  }

  return err;
}

const t = initTRPC.context<Context>().create();

const prismaErrorMiddleware = t.middleware(async ({ next }) => {
  try {
    return await next();
  } catch (err) {
    throw mapPrismaError(err);
  }
});

export const router = t.router;

// All procedures run through the Prisma error mapper automatically.
export const publicProcedure = t.procedure.use(prismaErrorMiddleware);
