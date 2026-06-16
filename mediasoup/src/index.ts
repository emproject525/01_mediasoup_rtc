import { config } from './config/env.js';
import { createSignalingServer } from './signaling/server.js';
import { createWorkerManager } from './sfu/workerManager.js';
import { RoomManager } from './rooms/RoomManager.js';

async function main() {
  const workerManager = await createWorkerManager();
  const roomManager = new RoomManager(workerManager);

  const signalingServer = createSignalingServer({
    port: config.signalingPort,
    roomManager
  });

  signalingServer.listen();
}

main().catch((error) => {
  console.error('[mediasoup] failed to start', error);
  process.exit(1);
});
