import { config } from "./config/env.js";
import { createSignalingServer } from "./signaling/server.js";
import { createSingleWorker } from "./sfu/sfu.modules.js";
import { RoomManager } from "./business/manager.module.js";

async function main() {
  const worker = await createSingleWorker();
  const roomManager = new RoomManager(worker);

  const signalingServer = createSignalingServer({
    port: config.signalingPort,
    roomManager,
  });

  signalingServer.listen();
}

main().catch((error) => {
  console.error("[mediasoup] failed to start", error);
  process.exit(1);
});
