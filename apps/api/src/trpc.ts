import { initTRPC } from "@trpc/server";
import type { CreateFastifyContextOptions } from "@trpc/server/adapters/fastify";

// Keep req/res available to procedures without leaking Fastify's types
// into the shared AppRouter type that the frontend imports.
export interface Context {
  req: CreateFastifyContextOptions["req"];
  res: CreateFastifyContextOptions["res"];
}

export function createContext({ req, res }: CreateFastifyContextOptions): Context {
  return { req, res };
}

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;
