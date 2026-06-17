import { Router } from "mediasoup/types";

export type SingleWorkerType = {
  getOrCreateRouter(routerId: string): Promise<Router>;
  close(): void;
};
