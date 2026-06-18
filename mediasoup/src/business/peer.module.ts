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

export class Peer {
  private _sendTransport?: WebRtcTransport;
  private _recvTransport?: WebRtcTransport;
  private _producers: Map<string, Producer> = new Map();
  private _consumers: Map<string, Consumer> = new Map();

  constructor(
    readonly id: string,
    readonly router: Router,
  ) {}

  async getOrCreateSendTransport() {
    if (this._sendTransport) return this._sendTransport;

    this._sendTransport = await this.router.createWebRtcTransport({
      listenIps: [{ ip: "0.0.0.0", announcedIp: undefined }],
      enableUdp: true,
      enableTcp: true,
      preferUdp: true,
    });

    return this._sendTransport;
  }

  async getOrCreateRecvTransport() {
    if (this._recvTransport) return this._recvTransport;

    this._recvTransport = await this.router.createWebRtcTransport({
      listenIps: [{ ip: "0.0.0.0", announcedIp: undefined }],
      enableUdp: true,
      enableTcp: true,
      preferUdp: true,
    });

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
    const co = await this._recvTransport?.consume({
      producerId,
      rtpCapabilities,
    });

    if (co) {
      co.on("transportclose", () => {
        this._consumers.delete(co.id);
      });
      this._consumers.set(co.id, co);
      return co;
    }
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
