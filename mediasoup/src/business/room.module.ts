import { AudioLevelObserver, MediaKind, Router } from "mediasoup/types";
import { Peer } from "./peer.module";
import EventEmitter from "eventemitter3";
import { RoomEvents } from "./room.types";

export class Room {
  readonly peers = new Map<string, Peer>();
  private audioLevelObserver?: AudioLevelObserver;
  private readonly emitter = new EventEmitter<RoomEvents>();

  constructor(
    readonly id: string,
    readonly router: Router,
  ) {}

  async registerObserver() {
    if (this.audioLevelObserver) return;

    this.audioLevelObserver = await this.router.createAudioLevelObserver({
      maxEntries: 25, // 소리가 가장 큰 25명만 보고. 동시 발언자 여럿을 하이라이트하려면 수치 증가
      interval: 500, // ms 단위
      threshold: -55, // 민감도 (낮을수록 더 작은 소리도 소리를 내는 것으로 판단)
    });
    this.audioLevelObserver
      .on("volumes", (volumes) => {
        this.emitter.emit(
          "talk",
          volumes.map(({ producer, volume }) => ({
            peerId: producer.appData.peerId as string,
            volume,
          })),
        );
      })
      .on("silence", () => {
        this.emitter.emit("talk", []);
      });
    return this.audioLevelObserver;
  }

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

  dataProducers(exceptPeerId: string) {
    const list: { dataProducerId: string; peerId: string }[] = [];
    for (const peer of this.peers.values()) {
      if (peer.id === exceptPeerId) continue;
      const dataProducer = peer.getDataProducer();
      if (dataProducer) {
        list.push({ dataProducerId: dataProducer.id, peerId: peer.id });
      }
    }
    return list;
  }

  async observeProducer(producerId: string) {
    if (!this.audioLevelObserver) return;
    await this.audioLevelObserver.addProducer({ producerId });
  }

  onTalk(handler: EventEmitter.EventListener<RoomEvents, "talk">) {
    this.emitter.on("talk", handler);
    return () => this.emitter.off("talk", handler);
  }

  close() {
    this.emitter.removeAllListeners();
    this.audioLevelObserver?.close();
  }
}
