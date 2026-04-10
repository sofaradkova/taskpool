import { io, type Socket } from "socket.io-client";
import type { ServerToClientEvents, ClientToServerEvents } from "@taskpool/types";

export type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let _socket: TypedSocket | null = null;

export function getSocket(): TypedSocket {
  if (!_socket) {
    _socket = io(process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001", {
      autoConnect: false,
    });
  }
  return _socket;
}
