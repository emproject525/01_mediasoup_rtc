import {
  MediaKind,
  Producer,
  Router,
  RtpParameters,
  WebRtcTransport,
} from "mediasoup/types";

export class Peer {
  private _sendTransport?: WebRtcTransport;
  private _recvTransport?: WebRtcTransport;
  private _producers: Map<string, Producer> = new Map();

  constructor(readonly id: string, readonly router: Router) {}

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

  async produce(kind: MediaKind, rtpParameters: RtpParameters) {
    const pr = await this._sendTransport?.produce({
      kind,
      rtpParameters,
    });

    if (pr) {
      this._producers.set(pr.id, pr);
      return pr.id;
    }
  }

  closeProduce(producerId: string) {
    const pr = this._producers.get(producerId);
    if (!pr) return false;

    pr.close();
    this._producers.delete(producerId);

    return true;
  }

  close() {
    this._producers.forEach((pr) => pr.close());
    this._producers.clear();

    this._sendTransport?.close();
    this._recvTransport?.close();
    delete this._sendTransport;
    delete this._recvTransport;
  }
}
