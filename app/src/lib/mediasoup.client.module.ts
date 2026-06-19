import { Device, type types } from "mediasoup-client";
import { SignalingEvent, type ErrorResponse } from "@rtc/packages";
import type { AppSocket } from "./socket.module";
import EventEmitter from "eventemitter3";

export type RemoteStream = {
  consumerId: string;
  producerId: string;
  peerId: string;
  kind: "audio" | "video";
  track: MediaStreamTrack;
};

export type TransportDirection = "send" | "recv";

type MeidaSoupClientEmitterEvents = {
  connection_state_changed: [
    {
      state: types.ConnectionState;
      direction: TransportDirection;
    }
  ];
  log: [string];
};

/** ack 응답이 에러인지 판별 (에러 응답에만 code 필드가 있음) */
function isError(res: unknown): res is ErrorResponse {
  return typeof res === "object" && res !== null && "code" in res;
}

/** 에러면 throw, 아니면 성공 분기로 좁혀서 반환 */
function unwrap<T>(res: T): Exclude<T, ErrorResponse> {
  if (isError(res)) {
    throw new Error(`signaling error: code=${res.code} ${res.message ?? ""}`);
  }
  return res as Exclude<T, ErrorResponse>;
}

/**
 * protocol.md 핸드셰이크를 그대로 감싼 RTC 클라이언트.
 * join → device.load → (lazy) transport 생성/연결 → produce / consume → resume.
 */
export class MediaSoupClient {
  private device = new Device();
  private sendTransport?: types.Transport;
  private recvTransport?: types.Transport;
  private consumedProducerIds = new Set<string>();
  private readonly emitter = new EventEmitter<MeidaSoupClientEmitterEvents>();
  readonly producers = new Map<string, types.Producer>();
  readonly consumers = new Map<string, types.Consumer>();

  constructor(
    private readonly socket: AppSocket,
    private readonly roomId: string
  ) {}

  /** 방 입장 + 디바이스 로드. 기존 producer 목록을 반환한다. */
  async join() {
    const res = unwrap(
      await this.socket.emitWithAck(SignalingEvent.RoomJoin, {
        roomId: this.roomId,
      })
    );
    await this.device.load({
      routerRtpCapabilities: res.routerRtpCapabilities as types.RtpCapabilities,
    });
    return { peerId: res.peerId, producers: res.producers };
  }

  /** 카메라/마이크 트랙 송출 */
  async produce(track: MediaStreamTrack) {
    const transport = await this.getSendTransport();
    const producer = await transport.produce({ track });
    this.producers.set(producer.id, producer);
    return producer;
  }

  /** 특정 producer 수신. 이미 받고 있으면 null. */
  async consume(
    producerId: string,
    peerId: string
  ): Promise<RemoteStream | null> {
    if (this.consumedProducerIds.has(producerId)) return null;
    this.consumedProducerIds.add(producerId);

    const transport = await this.getRecvTransport();
    const res = unwrap(
      await this.socket.emitWithAck(SignalingEvent.Consume, {
        roomId: this.roomId,
        producerId,
        rtpCapabilities: this.device.recvRtpCapabilities,
      })
    );

    const consumer = await transport.consume({
      id: res.consumerId,
      producerId: res.producerId,
      kind: res.kind,
      rtpParameters: res.rtpParameters as types.RtpParameters,
    });
    this.consumers.set(consumer.id, consumer);

    // 서버측 Consumer는 paused로 생성됨 → 화면 붙일 준비가 끝났으니 resume 요청
    unwrap(
      await this.socket.emitWithAck(SignalingEvent.ConsumeResume, {
        roomId: this.roomId,
        consumerId: consumer.id,
      })
    );

    return {
      consumerId: consumer.id,
      producerId,
      peerId,
      kind: res.kind,
      track: consumer.track,
    };
  }

  /** producer가 닫혔을 때 해당 consumer 정리 */
  removeByProducerId(producerId: string) {
    this.consumedProducerIds.delete(producerId);
    for (const [id, consumer] of this.consumers) {
      if (consumer.producerId === producerId) {
        consumer.close();
        this.consumers.delete(id);
      }
    }
  }

  close() {
    this.producers.forEach((p) => p.close());
    this.consumers.forEach((c) => c.close());
    this.producers.clear();
    this.consumers.clear();
    this.sendTransport?.close();
    this.recvTransport?.close();
    this.emitter.removeAllListeners();
  }

  onLog = (
    handler: EventEmitter.EventListener<MeidaSoupClientEmitterEvents, "log">
  ) => {
    this.emitter.on("log", handler);
    return () => this.emitter.off("log", handler);
  };

  onConnectionStateChanged = (
    handler: EventEmitter.EventListener<
      MeidaSoupClientEmitterEvents,
      "connection_state_changed"
    >
  ) => {
    this.emitter.on("connection_state_changed", handler);
    return () => this.emitter.off("connection_state_changed", handler);
  };

  private async getSendTransport() {
    if (!this.sendTransport) {
      this.sendTransport = await this.createTransport("send");
    }
    return this.sendTransport;
  }

  private async getRecvTransport() {
    if (!this.recvTransport) {
      this.recvTransport = await this.createTransport("recv");
    }
    return this.recvTransport;
  }

  private async createTransport(direction: TransportDirection) {
    const res = unwrap(
      await this.socket.emitWithAck(SignalingEvent.TransportCreate, {
        roomId: this.roomId,
        direction,
      })
    );

    const options = {
      id: res.transportId,
      iceParameters: res.iceParameters,
      iceCandidates: res.iceCandidates,
      dtlsParameters: res.dtlsParameters,
    } as types.TransportOptions;

    const transport =
      direction === "send"
        ? this.device.createSendTransport(options)
        : this.device.createRecvTransport(options);

    this.emitter.emit("connection_state_changed", {
      state: transport.connectionState,
      direction,
    });

    // 최초 송/수신 시 1회 발생: 클라 dtlsParameters를 서버로 relay
    transport
      .on("connect", ({ dtlsParameters }, callback, errback) => {
        this.socket
          .emitWithAck(SignalingEvent.TransportConnect, {
            roomId: this.roomId,
            transportId: transport.id,
            dtlsParameters,
          })
          .then((r) => {
            if (isError(r))
              errback(new Error(`connect failed: code=${r.code}`));
            else callback();
          })
          .catch(errback);
      })
      .on("connectionstatechange", (state) => {
        this.emitter.emit("connection_state_changed", { state, direction });
      });

    // send transport에서만: produce 등록 시 협상정보를 서버로 relay
    if (direction === "send") {
      transport.on("produce", ({ kind, rtpParameters }, callback, errback) => {
        this.socket
          .emitWithAck(SignalingEvent.Produce, {
            roomId: this.roomId,
            kind,
            rtpParameters,
          })
          .then((r) => {
            if (isError(r))
              errback(new Error(`produce failed: code=${r.code}`));
            else callback({ id: r.producerId });
          })
          .catch(errback);
      });
    }

    return transport;
  }
}
