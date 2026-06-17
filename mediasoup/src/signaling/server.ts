import { createServer } from "node:http";
import { Server } from "socket.io";
import { SignalingServerOptions } from "./signaling.types.js";
import {
  SignalingEvent,
  type ClientToServerEvents,
  type ServerToClientEvents,
} from "@rtc/packages";

export function createSignalingServer({
  port,
  roomManager,
}: SignalingServerOptions) {
  const httpServer = createServer();
  const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: {
      origin: true,
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    console.info("[signaling] connected", socket.id);

    // roomId / ack 가 EventsMap 으로부터 자동 추론됨 (인라인 타입 불필요)
    socket.on(SignalingEvent.RoomJoin, async ({ roomId }, ack) => {
      try {
        const room = await roomManager.getOrCreateRoom(roomId);
        const peer = room.getOrCreatePeer(socket.id);

        socket.join(roomId);

        ack({
          peerId: peer.id,
          routerRtpCapabilities: room.router.rtpCapabilities,
        });
      } catch (error) {
        ack({
          error: error instanceof Error ? error.message : "failed to join room",
        });
      }
    });

    // disconnect 시점엔 socket.rooms 가 이미 비므로, disconnecting 에서 처리
    socket.on("disconnecting", () => {
      for (const roomId of socket.rooms) {
        if (roomId === socket.id) continue; // 자기 자신 방은 제외
        roomManager.removePeer(roomId, socket.id);
      }
      console.info("[signaling] disconnected", socket.id);
    });
  });

  return {
    listen() {
      httpServer.listen(port, () => {
        console.info(`[signaling] listening on :${port}`);
      });
    },
  };
}
