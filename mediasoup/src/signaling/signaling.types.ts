import { RoomManager } from "../business/index.js";

export type SignalingServerOptions = {
  port: number;
  roomManager: RoomManager;
};
