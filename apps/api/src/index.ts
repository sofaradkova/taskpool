import Fastify from "fastify";
import cors from "@fastify/cors";
import {
  fastifyTRPCPlugin,
  type FastifyTRPCPluginOptions,
} from "@trpc/server/adapters/fastify";
import { createContext } from "./trpc.js";
import { appRouter, type AppRouter } from "./routers/index.js";

const app = Fastify({ logger: true });

await app.register(cors, { origin: "http://localhost:3000" });

await app.register(fastifyTRPCPlugin, {
  prefix: "/trpc",
  trpcOptions: {
    router: appRouter,
    createContext,
  } satisfies FastifyTRPCPluginOptions<AppRouter>["trpcOptions"],
});

app.get("/healthz", async () => ({ status: "ok" }));

const start = async (): Promise<void> => {
  try {
    await app.listen({ port: 3001, host: "0.0.0.0" });
  } catch (err: unknown) {
    app.log.error(err);
    process.exit(1);
  }
};

await start();
