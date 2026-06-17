import { Room } from "./room.module.js";
import type { SingleWorkerType } from "../sfu/sfu.types.js";

export class RoomManager {
  private readonly rooms = new Map<string, Room>();

  constructor(private readonly mediasoupWorker: SingleWorkerType) {}

  async getOrCreateRoom(roomId: string) {
    const existing = this.rooms.get(roomId);
    if (existing) return existing;

    const router = await this.mediasoupWorker.getOrCreateRouter(roomId);
    const room = new Room(roomId, router);
    this.rooms.set(roomId, room);

    return room;
  }

  removeRoom(roomId: string) {
    const target = this.rooms.get(roomId);
    if (!target) return;

    target.router.close();
    this.rooms.delete(target.id);
  }

  removePeer(roomId: string, peerId: string) {
    const target = this.rooms.get(roomId);
    if (!target) return;

    target.removePeer(peerId);
    if (target.peers.size === 0) {
      this.removeRoom(target.id);
    }
  }
}
