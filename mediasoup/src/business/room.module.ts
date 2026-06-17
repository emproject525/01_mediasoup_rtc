import { Router } from "mediasoup/types";
import { Peer } from "./peer.module";

export class Room {
  readonly peers = new Map<string, Peer>();

  constructor(readonly id: string, readonly router: Router) {}

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
    this.peers.delete(peerId);
  }
}
