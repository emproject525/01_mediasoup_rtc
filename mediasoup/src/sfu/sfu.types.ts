import { Router } from "mediasoup/types";

export type SingleWorkerType = {
  getOrCreateRouter(routerId: string): Promise<Router>;
  closeRouter(routerId: string): Promise<void>;
  close(): Promise<void>;
};
