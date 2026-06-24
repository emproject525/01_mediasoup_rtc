import { Device, type types } from "mediasoup-client";
import {
  EventTalk,
  SignalingEvent,
  TransportResponse,
  VIDEO_CONSUMER_MAX,
  type DataPayload,
  type ErrorResponse,
} from "@rtc/packages";
import type { AppSocket } from "./socket.module";
import EventEmitter from "eventemitter3";
import {
  DataProducer,
  MediaKind,
  SctpStreamParameters,
  Transport,
} from "mediasoup-client/types";
import { debounce } from "./utils";

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
    },
  ];
  log: [string];
  data: [{ peerId: string; payload: DataPayload }];
  consumed: [RemoteStream];
  closed: [{ consumerId: string }];
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
  private readonly emitter = new EventEmitter<MeidaSoupClientEmitterEvents>();

  private device = new Device();
  private sendTransport?: types.Transport;
  private recvTransport?: types.Transport;

  readonly producers = new Map<string, types.Producer>();
  readonly consumers = new Map<string, types.Consumer>();
  private consumedAudioProducerIds = new Set<string>();
  private readonly consumedVideoProducerIds = new Map<
    string,
    { timestamp: number; producerId: string }
  >(new Map());

  dataProducer?: DataProducer;
  readonly dataConsumers = new Map<string, types.DataConsumer>();

  constructor(
    private readonly socket: AppSocket,
    private readonly roomId: string,
  ) {
    socket.on(SignalingEvent.EventTalk, this.subscribeEventTalk);
  }

  private subscribeEventTalk = debounce(async (event: EventTalk) => {
    const myProducerIds = new Set(this.producers.keys());

    for (const talking of event.talking) {
      const { videoProducerId, peerId } = talking;
      if (!videoProducerId || myProducerIds.has(videoProducerId)) continue;

      if (this.consumedVideoProducerIds.has(videoProducerId)) {
        this.consumedVideoProducerIds.set(videoProducerId, {
          producerId: videoProducerId,
          timestamp: Date.now(),
        });
      } else {
        const upper = this.consumedVideoProducerIds.size >= VIDEO_CONSUMER_MAX;

        if (upper) {
          // 오래된 것 제거
          const olded = [...this.consumedVideoProducerIds.values()].sort(
            (a, b) => a.timestamp - b.timestamp,
          )[0];

          let consumerId: string = "";
          this.consumers.forEach((consumer) => {
            if (consumer.producerId === olded.producerId)
              consumerId = consumer.id;
          });

          if (consumerId) {
            this.consumedVideoProducerIds.delete(olded.producerId);
            await this.closeConsume(consumerId);
          }
        }

        await this.consumeWithinLimit(videoProducerId, peerId, "video");
      }
    }
  }, 300);

  /** 방 입장 + 디바이스 로드. 기존 producer 목록을 반환한다. */
  async join() {
    const res = unwrap(
      await this.socket.emitWithAck(SignalingEvent.RoomJoin, {
        roomId: this.roomId,
      }),
    );
    await this.device.load({
      routerRtpCapabilities: res.routerRtpCapabilities as types.RtpCapabilities,
    });

    this.sendTransport = await this.createTransport("send", res.sendTransport);
    this.recvTransport = await this.createTransport("recv", res.recvTransport);

    // 데이터채널 생성 (기본)
    await this.produceData(this.sendTransport);

    return {
      peerId: res.peerId,
      producers: res.producers,
      dataProducers: res.dataProducers,
      sendTransport: res.sendTransport,
      recvTransport: res.recvTransport,
    };
  }

  async leave() {
    const res = unwrap(
      await this.socket.emitWithAck(SignalingEvent.RoomLeave, {
        roomId: this.roomId,
      }),
    );

    return {
      success: res.success,
    };
  }

  private async produceData(sendTransport: Transport) {
    // produceData()가 transport의 "producedata" 이벤트를 발화 → createTransport에 등록한
    // 핸들러가 서버로 sctpStreamParameters를 relay하고 dataProducerId를 받아온다.
    this.dataProducer = await sendTransport.produceData({
      ordered: true,
      label: "chat",
    });
  }

  /** 채팅 등 데이터 전송. 본인 메시지는 SFU가 되돌려주지 않으므로 UI에서 별도 echo 필요. */
  sendChat(payload: DataPayload) {
    if (this.dataProducer?.readyState !== "open") return;
    this.dataProducer.send(JSON.stringify(payload));
  }

  async consumeData(dataProducerId: string, peerId: string) {
    if (!this.recvTransport) return;

    const res = unwrap(
      await this.socket.emitWithAck(SignalingEvent.ConsumeData, {
        roomId: this.roomId,
        dataProducerId,
      }),
    );

    const consumer = await this.recvTransport.consumeData({
      id: res.dataConsumerId,
      dataProducerId,
      sctpStreamParameters: res.sctpStreamParameters as SctpStreamParameters,
      label: res.label,
      protocol: res.protocol,
    });
    consumer.on("message", (payload) =>
      this.emitter.emit("data", {
        peerId,
        payload: JSON.parse(payload) as DataPayload,
      }),
    );

    this.dataConsumers.set(res.dataConsumerId, consumer);
    return consumer;
  }

  /** 카메라/마이크 트랙 송출 */
  async produce(track: MediaStreamTrack) {
    const kind = track.kind as MediaKind;
    if (!this.device.canProduce(kind) || !this.sendTransport) return;

    const producer = await this.sendTransport.produce({
      track,
      ...(kind === "video" && {
        encodings: [
          { rid: "low", maxBitrate: 150_000, scaleResolutionDownBy: 4 },
          { rid: "medium", maxBitrate: 500_000, scaleResolutionDownBy: 2 },
          { rid: "high", maxBitrate: 1_500_000 },
        ],
      }),
    });
    this.producers.set(producer.id, producer);
    return producer;
  }

  async consumeWithinLimit(
    producerId: string,
    peerId: string,
    kind: MediaKind,
  ) {
    if (!this.recvTransport) return null;

    if (kind === "audio" && this.consumedAudioProducerIds.has(producerId))
      return null;

    if (
      kind === "video" &&
      (this.consumedVideoProducerIds.has(producerId) ||
        this.consumedVideoProducerIds.size >= VIDEO_CONSUMER_MAX)
    )
      return null;

    kind === "video"
      ? this.consumedVideoProducerIds.set(producerId, {
          timestamp: Date.now(),
          producerId,
        })
      : this.consumedAudioProducerIds.add(producerId);

    return this.consume(producerId, peerId);
  }

  /** 특정 producer 수신. 이미 받고 있으면 null. */
  private async consume(
    producerId: string,
    peerId: string,
  ): Promise<RemoteStream | null> {
    if (!this.recvTransport) return null;

    const res = unwrap(
      await this.socket.emitWithAck(SignalingEvent.Consume, {
        roomId: this.roomId,
        producerId,
        rtpCapabilities: this.device.recvRtpCapabilities,
      }),
    );

    const consumer = await this.recvTransport.consume({
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
      }),
    );

    const remote: RemoteStream = {
      consumerId: consumer.id,
      producerId,
      peerId,
      kind: res.kind,
      track: consumer.track,
    };
    // 초기/신규/active-speaker swap 모든 경로가 이 이벤트로 UI(remotes)에 반영된다.
    this.emitter.emit("consumed", remote);
    return remote;
  }

  async closeConsume(consumerId: string) {
    const producerId = this.consumers.get(consumerId)?.producerId;
    if (producerId) {
      this.consumedAudioProducerIds.delete(producerId);
      this.consumedVideoProducerIds.delete(producerId);
    }
    this.consumers.delete(consumerId);

    const { success } = unwrap(
      await this.socket.emitWithAck(SignalingEvent.ConsumeClose, {
        roomId: this.roomId,
        consumerId,
      }),
    );
    this.emitter.emit("closed", { consumerId });
    return success;
  }

  /** producer가 닫혔을 때 해당 consumer 정리 */
  removeByProducerId(producerId: string) {
    this.consumedAudioProducerIds.delete(producerId);
    this.consumedVideoProducerIds.delete(producerId);
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
    this.dataConsumers.forEach((c) => c.close());
    this.dataProducer?.close();
    this.producers.clear();
    this.consumers.clear();
    this.dataConsumers.clear();
    this.sendTransport?.close();
    this.recvTransport?.close();
    this.emitter.removeAllListeners();

    // socket 이벤트 제거
    this.socket.off(SignalingEvent.EventTalk, this.subscribeEventTalk);
  }

  onLog = (
    handler: EventEmitter.EventListener<MeidaSoupClientEmitterEvents, "log">,
  ) => {
    this.emitter.on("log", handler);
    return () => this.emitter.off("log", handler);
  };

  onConnectionStateChanged = (
    handler: EventEmitter.EventListener<
      MeidaSoupClientEmitterEvents,
      "connection_state_changed"
    >,
  ) => {
    this.emitter.on("connection_state_changed", handler);
    return () => this.emitter.off("connection_state_changed", handler);
  };

  onData = (
    handler: EventEmitter.EventListener<MeidaSoupClientEmitterEvents, "data">,
  ) => {
    this.emitter.on("data", handler);
    return () => this.emitter.off("data", handler);
  };

  onConsumed = (
    handler: EventEmitter.EventListener<
      MeidaSoupClientEmitterEvents,
      "consumed"
    >,
  ) => {
    this.emitter.on("consumed", handler);
    return () => this.emitter.off("consumed", handler);
  };

  onClosed = (
    handler: EventEmitter.EventListener<MeidaSoupClientEmitterEvents, "closed">,
  ) => {
    this.emitter.on("closed", handler);
    return () => this.emitter.off("closed", handler);
  };

  async replaceTrack(producerId: string, track: MediaStreamTrack) {
    const target = this.producers.get(producerId);
    if (!target) return;
    await target.replaceTrack({ track });
  }

  async pause(producerId: string, pause: boolean) {
    const target = this.producers.get(producerId);
    if (!target) return;
    pause ? target.pause() : target.resume();
  }

  private async createTransport(
    direction: TransportDirection,
    options: TransportResponse,
  ) {
    // const res = unwrap(
    //   await this.socket.emitWithAck(SignalingEvent.TransportCreate, {
    //     roomId: this.roomId,
    //     direction,
    //   }),
    // );
    const parsed = {
      id: options.transportId,
      iceParameters: options.iceParameters,
      iceCandidates: options.iceCandidates,
      dtlsParameters: options.dtlsParameters,
      sctpParameters: options.sctpParameters, // 데이터채널(SCTP)용 — 없으면 produce/consumeData 실패
    } as types.TransportOptions;

    const transport =
      direction === "send"
        ? this.device.createSendTransport(parsed)
        : this.device.createRecvTransport(parsed);

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

      // produceData() 호출 시 발화: sctpStreamParameters를 서버로 relay하고 dataProducerId 수신
      transport.on(
        "producedata",
        ({ sctpStreamParameters, label, protocol }, callback, errback) => {
          this.socket
            .emitWithAck(SignalingEvent.ProduceData, {
              roomId: this.roomId,
              sctpStreamParameters,
              label,
              protocol,
            })
            .then((r) => {
              if (isError(r))
                errback(new Error(`produceData failed: code=${r.code}`));
              else callback({ id: r.dataProducerId });
            })
            .catch(errback);
        },
      );
    }

    return transport;
  }
}
