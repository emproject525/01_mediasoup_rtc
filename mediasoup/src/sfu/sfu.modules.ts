import { createWorker } from "mediasoup";
import type { Router, Worker } from "mediasoup/types";
import { MediaCodecs } from "./sfu.constants";
import type { SingleWorkerType } from "./sfu.types";

class SingleWorker implements SingleWorkerType {
  constructor(private readonly worker: Worker) {}
  private _routers: Map<string, Promise<Router>> = new Map();

  getOrCreateRouter(routerId: string) {
    const existing = this._routers.get(routerId);
    if (existing) return existing;

    const creating = this.worker.createRouter({ mediaCodecs: MediaCodecs });
    this._routers.set(routerId, creating);

    creating.catch(() => {
      if (this._routers.get(routerId) === creating)
        this._routers.delete(routerId);
    });

    return creating;
  }

  async closeRouter(routerId: string) {
    const created = this._routers.get(routerId);
    this._routers.delete(routerId);
    (await created)?.close();
  }

  async close() {
    const created = [...this._routers.values()];
    this._routers.clear();
    await Promise.allSettled(created); // 생성 중인 방들이 성공/실패로 정착할 때까지 대기
    this.worker.close(); // 모든 router를 cascade close
  }
}

export async function createSingleWorker(): Promise<SingleWorker> {
  const worker = await createWorker({
    rtcMinPort: 40000,
    rtcMaxPort: 49999,
  });

  worker.on("died", (error) => {
    console.error("[mediasoup] worker died", error);
    process.exit(1);
  });

  return new SingleWorker(worker);
}
