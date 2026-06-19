import { MediaKind, Producer, Router } from "mediasoup/types";
import { Peer } from "./peer.module";

export class Room {
  readonly peers = new Map<string, Peer>();

  constructor(
    readonly id: string,
    readonly router: Router,
  ) {}

  getOrCreatePeer(peerId: string) {
    const existingPeer = this.peers.get(peerId);

    if (existingPeer) {
      return existingPeer;
    }

    const peer = new Peer(peerId, this.router);
    this.peers.set(peerId, peer);

    return peer;
  }

  removePeer(peerId: string) {
    this.peers.get(peerId)?.close();
    this.peers.delete(peerId);
  }

  producers(exceptPeerId: string) {
    const list: { producerId: string; peerId: string; kind: MediaKind }[] = [];
    for (const peer of this.peers.values()) {
      if (peer.id === exceptPeerId) continue;
      for (const pr of peer.getProducers()) {
        list.push({ producerId: pr.id, peerId: peer.id, kind: pr.kind });
      }
    }
    return list;
  }
}
