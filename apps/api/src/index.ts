import "./telemetry.js";
import Fastify from "fastify";
import cors from "@fastify/cors";
import {
  fastifyTRPCPlugin,
  type FastifyTRPCPluginOptions,
} from "@trpc/server/adapters/fastify";
import { createContext } from "./trpc.js";
import { appRouter, type AppRouter } from "./routers/index.js";
import { createSocketServer } from "./socket.js";
import { registerSocketHandlers } from "./socketHandlers.js";
import { register } from "./metrics.js";

const app = Fastify({ logger: true });

// Socket.io must be attached before app.listen so it shares the HTTP server
const io = await createSocketServer(app.server);
registerSocketHandlers(io);

const allowedOrigins = (process.env.CORS_ORIGIN ?? "http://localhost:3000").split(",");
await app.register(cors, {
  origin: allowedOrigins,
});

await app.register(fastifyTRPCPlugin, {
  prefix: "/trpc",
  trpcOptions: {
    router: appRouter,
    createContext,
  } satisfies FastifyTRPCPluginOptions<AppRouter>["trpcOptions"],
});

app.get("/healthz", async () => ({ status: "ok" }));

app.get("/metrics", async (_req, reply) => {
  reply.header("Content-Type", register.contentType);
  return reply.send(await register.metrics());
});

const start = async (): Promise<void> => {
  try {
    await app.listen({ port: 3001, host: "0.0.0.0" });
  } catch (err: unknown) {
    app.log.error(err);
    process.exit(1);
  }
};

await start();
