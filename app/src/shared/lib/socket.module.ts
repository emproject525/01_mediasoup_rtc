import { io, type Socket } from "socket.io-client";
import type { ClientToServerEvents, ServerToClientEvents } from "@rtc/packages";

/**
 * 클라이언트 소켓 타입.
 * 클라 기준 listen = 서버가 보내는 이벤트(ServerToClientEvents),
 *        emit   = 서버가 받는 이벤트(ClientToServerEvents).
 */
export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export function createSocket(url: string): AppSocket {
  return io(url, {
    autoConnect: false,
    transports: ["websocket"],
  });
}
