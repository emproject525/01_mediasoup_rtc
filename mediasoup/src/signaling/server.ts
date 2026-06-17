import { createServer } from "node:http";
import { Server } from "socket.io";
import { SignalingServerOptions } from "./server.types";
import {
  SignalingEvent,
  type ClientToServerEvents,
  type ServerToClientEvents,
} from "@rtc/packages";
import { RtpParameters } from "mediasoup/types";

export function createSignalingServer({
  port,
  roomManager,
}: SignalingServerOptions) {
  const httpServer = createServer();
  const io = new Server<ClientToServerEvents, ServerToClientEvents>(
    httpServer,
    {
      cors: {
        origin: true,
        credentials: true,
      },
    }
  );

  io.on("connection", (socket) => {
    console.info("[signaling] connected", socket.id);

    // roomId / ack 가 EventsMap 으로부터 자동 추론됨 (인라인 타입 불필요)
    socket
      .on(SignalingEvent.RoomJoin, async ({ roomId }, ack) => {
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
            error:
              error instanceof Error ? error.message : "failed to join room",
          });
        }
      })
      .on(
        SignalingEvent.TransportCreate,
        async ({ roomId, direction }, ack) => {
          try {
            const room = await roomManager.getOrCreateRoom(roomId);
            const peer = room.getOrCreatePeer(socket.id);

            if (!peer) throw new Error("no peer");

            const transport =
              direction === "recv"
                ? await peer.getOrCreateRecvTransport()
                : await peer.getOrCreateSendTransport();

            ack({
              transportId: transport.id,
              iceParameters: transport.iceParameters,
              iceCandidates: transport.iceCandidates,
              dtlsParameters: transport.dtlsParameters,
            });
          } catch (error) {
            ack({
              error:
                error instanceof Error ? error.message : "failed to join room",
            });
          }
        }
      )
      .on(
        SignalingEvent.Produce,
        async ({ roomId, kind, rtpParameters }, ack) => {
          try {
            const room = await roomManager.getOrCreateRoom(roomId);
            const peer = room.getOrCreatePeer(socket.id);

            if (!peer) throw new Error("no peer");

            const producerId = await peer.produce(
              kind,
              rtpParameters as RtpParameters
            );

            if (!producerId) throw new Error("fail to produce");

            ack({
              producerId,
            });
          } catch (error) {
            ack({
              error:
                error instanceof Error ? error.message : "failed to join room",
            });
          }
        }
      )
      .on(SignalingEvent.ProduceClose, async ({ roomId, producerId }, ack) => {
        try {
          const room = await roomManager.getOrCreateRoom(roomId);
          const peer = room.getOrCreatePeer(socket.id);

          if (!peer) throw new Error("no peer");

          const success = peer.closeProduce(producerId);
          ack({ success });
        } catch (error) {
          ack({
            error:
              error instanceof Error ? error.message : "failed to join room",
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
