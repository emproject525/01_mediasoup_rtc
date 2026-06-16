import mediasoup from 'mediasoup';
import type { Router } from 'mediasoup/node/lib/RouterTypes.js';
import type { Worker } from 'mediasoup/node/lib/WorkerTypes.js';
import { mediaCodecs } from './mediaCodecs.js';

export type WorkerManager = {
  createRouter(): Promise<Router>;
};

export async function createWorkerManager(): Promise<WorkerManager> {
  const worker = await mediasoup.createWorker({
    rtcMinPort: 40000,
    rtcMaxPort: 49999
  });

  worker.on('died', () => {
    console.error('[mediasoup] worker died');
    process.exit(1);
  });

  return new SingleWorkerManager(worker);
}

class SingleWorkerManager implements WorkerManager {
  constructor(private readonly worker: Worker) {}

  createRouter() {
    return this.worker.createRouter({ mediaCodecs });
  }
}
