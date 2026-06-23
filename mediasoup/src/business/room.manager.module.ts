import { Room } from "./room.module";
import type { SingleWorkerType } from "../sfu";

export class RoomManager {
  private readonly rooms = new Map<string, Promise<Room>>();

  constructor(private readonly mediasoupWorker: SingleWorkerType) {}

  async getOrCreateRoom(roomId: string, cb?: (room: Room) => void) {
    const existing = this.rooms.get(roomId);
    if (existing) return existing;

    const creating = (async () => {
      const router = await this.mediasoupWorker.getOrCreateRouter(roomId);
      const room = new Room(roomId, router);
      await room.registerObserver();
      cb?.(room);
      return room;
    })();

    this.rooms.set(roomId, creating);
    creating.catch(() => {
      if (this.rooms.get(roomId) === creating) this.rooms.delete(roomId);
    });

    return creating;
  }

  async removeRoom(roomId: string) {
    const created = this.rooms.get(roomId);
    if (!created) return;

    this.rooms.delete(roomId);
    await Promise.allSettled([
      this.mediasoupWorker.closeRouter(roomId),
      (await created).close(),
    ]);
  }

  /**
   * room에서 peer 제거
   * @param roomId
   * @param peerId
   * @returns
   */
  async removePeer(roomId: string, peerId: string) {
    const created = this.rooms.get(roomId);
    if (!created) return;

    const room = await created;
    room.removePeer(peerId);

    if (room.peers.size > 0) return;
    if (this.rooms.get(roomId) !== created) return;

    await this.removeRoom(roomId);
  }
}
