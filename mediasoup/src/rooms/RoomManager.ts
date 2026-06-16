import { Room } from './Room.js';
import type { WorkerManager } from '../sfu/workerManager.js';

export class RoomManager {
  private readonly rooms = new Map<string, Room>();

  constructor(private readonly workerManager: WorkerManager) {}

  async getOrCreateRoom(roomId: string) {
    const existingRoom = this.rooms.get(roomId);

    if (existingRoom) {
      return existingRoom;
    }

    const router = await this.workerManager.createRouter();
    const room = new Room(roomId, router);
    this.rooms.set(roomId, room);

    return room;
  }

  removePeer(peerId: string) {
    for (const room of this.rooms.values()) {
      room.removePeer(peerId);

      if (room.peers.size === 0) {
        this.rooms.delete(room.id);
      }
    }
  }
}
