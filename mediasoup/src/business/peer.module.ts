import { SignalingError } from "@rtc/packages";
import {
  Consumer,
  DtlsParameters,
  MediaKind,
  Producer,
  Router,
  RtpCapabilities,
  RtpParameters,
  WebRtcTransport,
} from "mediasoup/types";
import { config } from "../config/env";

export class Peer {
  private _sendTransport?: WebRtcTransport;
  private _recvTransport?: WebRtcTransport;
  private _producers: Map<string, Producer> = new Map();
  private _consumers: Map<string, Consumer> = new Map();

  constructor(readonly id: string, readonly router: Router) {}

  async getOrCreateSendTransport() {
    if (this._sendTransport) return this._sendTransport;

    this._sendTransport = await this.router.createWebRtcTransport({
      listenIps: [{ ip: config.listenIp, announcedIp: config.announcedIp }],
      enableUdp: true,
      enableTcp: true,
      preferUdp: true,
    });

    console.log("[send] iceCandidates", this._sendTransport.iceCandidates);

    return this._sendTransport;
  }

  async getOrCreateRecvTransport() {
    if (this._recvTransport) return this._recvTransport;

    this._recvTransport = await this.router.createWebRtcTransport({
      listenIps: [{ ip: config.listenIp, announcedIp: config.announcedIp }],
      enableUdp: true,
      enableTcp: true,
      preferUdp: true,
    });

    console.log("[recv] iceCandidates", this._recvTransport.iceCandidates);

    return this._recvTransport;
  }

  async connectTransport(transportId: string, dtlsParameters: DtlsParameters) {
    const target =
      this._recvTransport?.id === transportId
        ? this._recvTransport
        : this._sendTransport?.id === transportId
        ? this._sendTransport
        : null;

    if (target) {
      await target.connect({ dtlsParameters });
      return true;
    }

    return false;
  }

  async produce(kind: MediaKind, rtpParameters: RtpParameters) {
    const pr = await this._sendTransport?.produce({
      kind,
      rtpParameters,
    });

    if (pr) {
      this._producers.set(pr.id, pr);
      return pr;
    }
  }

  closeProduce(producerId: string) {
    const pr = this._producers.get(producerId);
    if (!pr) return false;

    pr.close();
    this._producers.delete(producerId);

    return true;
  }

  async consume(producerId: string, rtpCapabilities: RtpCapabilities) {
    const canConsume = this.router.canConsume({ producerId, rtpCapabilities });
    if (!canConsume) throw new SignalingError("ConsumeFailedNotSupported");

    const co = await this._recvTransport?.consume({
      producerId,
      rtpCapabilities,
      // ================================
      // 처음부터 RTP를 흘릴지, 멈춰둘지 선택 가능
      // 멈춰두는 이유: 첫 프레임 유실 방지의 목적 (클라가 화면 붙일 때까지 잠깐 멈춤)
      // 클라에서 srcObject로 연결 완료 후 resume 실행
      // ================================
      paused: true,
    });

    if (co) {
      co.on("transportclose", () => {
        this._consumers.delete(co.id);
      }).on("producerclose", () => {
        this._consumers.delete(co.id);
      });
      this._consumers.set(co.id, co);
      return co;
    }
  }

  async resumeConsumer(consumerId: string) {
    await this._consumers.get(consumerId)?.resume();
  }

  getProducers() {
    return this._producers.values();
  }

  close() {
    this._producers.forEach((pr) => pr.close());
    this._producers.clear();

    this._consumers.forEach((co) => co.close());
    this._consumers.clear();

    this._sendTransport?.close();
    this._recvTransport?.close();
    delete this._sendTransport;
    delete this._recvTransport;
  }
}
