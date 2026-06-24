import { SignalingError } from "@rtc/packages";
import {
  Consumer,
  DtlsParameters,
  MediaKind,
  Producer,
  DataProducer,
  DataConsumer,
  Router,
  RtpCapabilities,
  RtpParameters,
  WebRtcTransport,
  SctpStreamParameters,
} from "mediasoup/types";
import { config } from "../config/env";

export class Peer {
  private _sendTransport?: Promise<WebRtcTransport>;
  private _recvTransport?: Promise<WebRtcTransport>;
  private _producers: Map<string, Producer> = new Map();
  private _consumers: Map<string, Consumer> = new Map();
  private _dataProducer?: DataProducer;
  private _dataConsumers: Map<string, DataConsumer> = new Map();

  constructor(
    readonly id: string,
    readonly router: Router,
  ) {}

  getOrCreateSendTransport() {
    if (this._sendTransport) return this._sendTransport;

    const creating = (async () => {
      const transport = await this.router.createWebRtcTransport({
        listenIps: [{ ip: config.listenIp, announcedIp: config.announcedIp }],
        enableUdp: true,
        enableTcp: true,
        preferUdp: true,
        enableSctp: true,
      });
      console.log(
        "[send] iceCandidates",
        JSON.stringify(transport.iceCandidates),
      );
      return transport;
    })();

    creating.catch(() => {
      this._sendTransport = undefined;
    });

    this._sendTransport = creating;
    return creating;
  }

  getOrCreateRecvTransport() {
    if (this._recvTransport) return this._recvTransport;

    const creating = (async () => {
      const transport = await this.router.createWebRtcTransport({
        listenIps: [{ ip: config.listenIp, announcedIp: config.announcedIp }],
        enableUdp: true,
        enableTcp: true,
        preferUdp: true,
        enableSctp: true,
      });
      console.log(
        "[recv] iceCandidates",
        JSON.stringify(transport.iceCandidates),
      );
      return transport;
    })();

    creating.catch(() => {
      this._recvTransport = undefined;
    });

    this._recvTransport = creating;
    return creating;
  }

  async connectTransport(transportId: string, dtlsParameters: DtlsParameters) {
    const recv = await this._recvTransport;
    const send = await this._sendTransport;

    const transport =
      recv?.id === transportId ? recv : send?.id === transportId ? send : null;

    if (transport) {
      await transport.connect({ dtlsParameters });
      return true;
    }

    return false;
  }

  async produce(kind: MediaKind, rtpParameters: RtpParameters) {
    const transport = await this._sendTransport;
    const pr = await transport?.produce({
      kind,
      rtpParameters,
      appData: { peerId: this.id },
    });

    if (pr) {
      pr.on("transportclose", () => {
        this._producers.delete(pr.id);
      });

      this._producers.set(pr.id, pr);

      return pr;
    }
  }

  async produceData(
    sctpStreamParameters: SctpStreamParameters,
    label?: string,
    protocol?: string,
  ) {
    if (this._dataProducer) return this._dataProducer;

    const transport = await this._sendTransport;
    const pr = await transport?.produceData({
      sctpStreamParameters,
      label,
      protocol,
      appData: { peerId: this.id },
    });

    if (pr) {
      pr.on("transportclose", () => {
        this._dataProducer = undefined;
      });
      this._dataProducer = pr;
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

    const transport = await this._recvTransport;
    const co = await transport?.consume({
      producerId,
      rtpCapabilities,
      // ================================
      // 처음부터 RTP를 흘릴지, 멈춰둘지 선택 가능
      // 멈춰두는 이유: 첫 프레임 유실 방지의 목적 (클라가 화면 붙일 때까지 잠깐 멈춤)
      // 클라에서 srcObject로 연결 완료 후 resume 실행
      // ================================
      paused: true,
      preferredLayers: {
        spatialLayer: 0,
      },
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

  async consumeData(dataProducerId: string) {
    const transport = await this._recvTransport;
    const coData = await transport?.consumeData({
      dataProducerId,
    });

    if (coData) {
      coData
        .on("transportclose", () => {
          this._dataConsumers.delete(coData.id);
        })
        .on("dataproducerclose", () => {
          this._dataConsumers.delete(coData.id);
        });
      this._dataConsumers.set(coData.id, coData);

      return coData;
    }
  }

  async resumeConsumer(consumerId: string) {
    await this._consumers.get(consumerId)?.resume();
  }

  async changeConsumerLayer(
    consumerId: string,
    spatialLayer: number,
    temporalLayer?: number,
  ) {
    const consumer = this._consumers.get(consumerId);
    if (!consumer) return;

    await consumer.setPreferredLayers({ spatialLayer, temporalLayer });
  }

  closeConsumer(consumerId: string) {
    this._consumers.get(consumerId)?.close();
    this._consumers.delete(consumerId);
  }

  getProducers() {
    return this._producers.values();
  }

  getDataProducer() {
    return this._dataProducer;
  }

  hasProducer(producerId: string) {
    return this._producers.has(producerId);
  }

  async close() {
    this._producers.forEach((pr) => pr.close());
    this._producers.clear();

    this._consumers.forEach((co) => co.close());
    this._consumers.clear();
    this._dataConsumers.forEach((co) => co.close());
    this._dataConsumers.clear();

    (await this._sendTransport)?.close();
    (await this._recvTransport)?.close();
    delete this._sendTransport;
    delete this._recvTransport;
  }
}
