import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { createClient } from "redis";
import type { ServerToClientEvents, ClientToServerEvents } from "@taskpool/types";
import type { Server as HttpServer } from "http";
import { connectRedis } from "./redis.js";

export type TypedIO = Server<ClientToServerEvents, ServerToClientEvents>;

let _io: TypedIO | null = null;

export async function createSocketServer(httpServer: HttpServer): Promise<TypedIO> {
  _io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: { origin: process.env.CORS_ORIGIN ?? "http://localhost:3000" },
  });

  const redisUrl = process.env.REDIS_URL;
  if (redisUrl) {
    const pubClient = createClient({ url: redisUrl });
    const subClient = pubClient.duplicate();

    await Promise.all([
      pubClient.connect(),
      subClient.connect(),
      connectRedis(redisUrl),
    ]);
    _io.adapter(createAdapter(pubClient, subClient));

    console.log("Socket.io: using Redis adapter", redisUrl);
  } else {
    console.log("Socket.io: REDIS_URL not set, using in-memory adapter (single-instance only)");
  }

  return _io;
}

export function getIO(): TypedIO {
  if (!_io) throw new Error("Socket.io server not initialized");
  return _io;
}
