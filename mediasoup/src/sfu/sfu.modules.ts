import { createWorker } from "mediasoup";
import type { Router, Worker } from "mediasoup/types";
import { MediaCodecs } from "./sfu.constants";
import type { SingleWorkerType } from "./sfu.types";

class SingleWorker implements SingleWorkerType {
  constructor(private readonly worker: Worker) {}
  private _routers: Map<string, Router> = new Map();

  async getOrCreateRouter(routerId: string) {
    const existing = this._routers.get(routerId);
    if (existing) return existing;
    const routerOne = await this.worker.createRouter({
      mediaCodecs: MediaCodecs,
    });
    this._routers.set(routerId, routerOne);
    return routerOne;
  }

  close() {
    this._routers.forEach((routerOne) => {
      routerOne.close();
    });
    this._routers.clear();
    this.worker.close();
  }
}

export async function createSingleWorker(): Promise<SingleWorker> {
  const worker = await createWorker({
    rtcMinPort: 40000,
    rtcMaxPort: 49999,
  });

  worker.on("died", () => {
    console.error("[mediasoup] worker died");
    process.exit(1);
  });

  return new SingleWorker(worker);
}
