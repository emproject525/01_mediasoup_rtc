import { createServer } from 'node:http';
import { Server } from 'socket.io';
import type { RoomManager } from '../rooms/RoomManager.js';

type SignalingServerOptions = {
  port: number;
  roomManager: RoomManager;
};

export function createSignalingServer({ port, roomManager }: SignalingServerOptions) {
  const httpServer = createServer();
  const io = new Server(httpServer, {
    cors: {
      origin: true,
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    console.info('[signaling] connected', socket.id);

    socket.on('room:join', async ({ roomId }: { roomId: string }, ack) => {
      try {
        const room = await roomManager.getOrCreateRoom(roomId);
        const peer = room.getOrCreatePeer(socket.id);

        socket.join(roomId);

        ack?.({
          peerId: peer.id,
          routerRtpCapabilities: room.router.rtpCapabilities
        });
      } catch (error) {
        ack?.({ error: error instanceof Error ? error.message : 'failed to join room' });
      }
    });

    socket.on('disconnect', () => {
      roomManager.removePeer(socket.id);
      console.info('[signaling] disconnected', socket.id);
    });
  });

  return {
    listen() {
      httpServer.listen(port, () => {
        console.info(`[signaling] listening on :${port}`);
      });
    }
  };
}
