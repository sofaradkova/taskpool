import { createClient } from "redis";

type RedisClient = ReturnType<typeof createClient>;

let _redis: RedisClient | null = null;

export function getRedis(): RedisClient | null {
  return _redis;
}

export async function connectRedis(url: string): Promise<RedisClient> {
  _redis = createClient({ url });
  await _redis.connect();
  return _redis;
}
