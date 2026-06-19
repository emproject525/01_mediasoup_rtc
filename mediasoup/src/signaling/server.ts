import { createServer } from "node:http";
import { Server } from "socket.io";
import { SignalingServerOptions } from "./server.types";
import {
  ErrorResponse,
  SignalingError,
  SignalingErrorCode,
  type SignalingErrorCodeValue,
  SignalingEvent,
  type ClientToServerEvents,
  type ServerToClientEvents,
} from "@rtc/packages";
import {
  DtlsParameters,
  RtpCapabilities,
  RtpParameters,
} from "mediasoup/types";

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
    },
  );

  const getErrorResponse = (
    error: unknown,
    code?: SignalingErrorCodeValue,
  ): ErrorResponse => {
    if (error instanceof SignalingError) {
      return { code: error.code, message: null };
    } else if (error instanceof Error) {
      return {
        code: code ?? SignalingErrorCode.Unknown,
        message: error.message ?? null,
      };
    }
    return { code: SignalingErrorCode.Unknown, message: null };
  };

  io.on("connection", (socket) => {
    console.info("[signaling] connected", socket.id);

    // roomId / ack 가 EventsMap 으로부터 자동 추론됨 (인라인 타입 불필요)
    socket
      .on(SignalingEvent.RoomJoin, async ({ roomId }, ack) => {
        try {
          const room = await roomManager.getOrCreateRoom(roomId);
          const peer = room.getOrCreatePeer(socket.id);

          await socket.join(roomId);

          const producers = room.producers(peer.id);

          ack({
            peerId: peer.id,
            routerRtpCapabilities: room.router.rtpCapabilities,
            producers,
          });

          socket.to(roomId).emit(SignalingEvent.EventPeerJoined, {
            peerId: peer.id,
          });
        } catch (error) {
          ack(getErrorResponse(error, SignalingErrorCode.RoomJoinFailed));
        }
      })
      .on(
        SignalingEvent.TransportCreate,
        async ({ roomId, direction }, ack) => {
          try {
            const room = await roomManager.getOrCreateRoom(roomId);
            const peer = room.getOrCreatePeer(socket.id);

            if (!peer) throw new SignalingError("NoPeer");

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
            ack(
              getErrorResponse(error, SignalingErrorCode.TransportCreateFailed),
            );
          }
        },
      )
      .on(
        SignalingEvent.TransportConnect,
        async ({ roomId, transportId, dtlsParameters }, ack) => {
          try {
            const room = await roomManager.getOrCreateRoom(roomId);
            const peer = room.getOrCreatePeer(socket.id);

            if (!peer) throw new SignalingError("NoPeer");

            const success = await peer.connectTransport(
              transportId,
              dtlsParameters as DtlsParameters,
            );

            ack({ success });
          } catch (error) {
            ack(
              getErrorResponse(
                error,
                SignalingErrorCode.TransportConnectFailed,
              ),
            );
          }
        },
      )
      .on(
        SignalingEvent.Produce,
        async ({ roomId, kind, rtpParameters }, ack) => {
          try {
            const room = await roomManager.getOrCreateRoom(roomId);
            const peer = room.getOrCreatePeer(socket.id);

            if (!peer) throw new SignalingError("NoPeer");

            const producer = await peer.produce(
              kind,
              rtpParameters as RtpParameters,
            );

            if (!producer) throw new SignalingError("ProduceFailed");

            ack({ producerId: producer.id });

            socket.to(roomId).emit(SignalingEvent.EventProducerNew, {
              producerId: producer.id,
              peerId: peer.id,
              kind,
            });
          } catch (error) {
            ack(getErrorResponse(error, SignalingErrorCode.ProduceFailed));
          }
        },
      )
      .on(SignalingEvent.ProduceClose, async ({ roomId, producerId }, ack) => {
        try {
          const room = await roomManager.getOrCreateRoom(roomId);
          const peer = room.getOrCreatePeer(socket.id);

          if (!peer) throw new SignalingError("NoPeer");

          const success = peer.closeProduce(producerId);
          ack({ success });
        } catch (error) {
          ack(getErrorResponse(error, SignalingErrorCode.ProduceCloseFailed));
        }
      })
      .on(
        SignalingEvent.Consume,
        async ({ roomId, producerId, rtpCapabilities }, ack) => {
          try {
            const room = await roomManager.getOrCreateRoom(roomId);
            const peer = room.getOrCreatePeer(socket.id);

            if (!peer) throw new SignalingError("NoPeer");

            const consumer = await peer.consume(
              producerId,
              rtpCapabilities as RtpCapabilities,
            );

            if (!consumer) throw new SignalingError("ConsumeFailed");

            consumer.on("producerclose", () => {
              socket.emit(SignalingEvent.EventProducerClosed, {
                producerId,
              });
            });

            ack({
              consumerId: consumer.id,
              producerId,
              kind: consumer.kind,
              rtpParameters: consumer.rtpParameters,
            });
          } catch (error) {
            ack(getErrorResponse(error, SignalingErrorCode.ConsumeFailed));
          }
        },
      )
      .on(SignalingEvent.ConsumeResume, async ({ roomId, consumerId }, ack) => {
        try {
          const room = await roomManager.getOrCreateRoom(roomId);
          const peer = room.getOrCreatePeer(socket.id);

          if (!peer) throw new SignalingError("NoPeer");

          await peer.resumeConsumer(consumerId);

          ack({ success: true });
        } catch (error) {
          ack(getErrorResponse(error, SignalingErrorCode.ConsumeResumeFailed));
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
