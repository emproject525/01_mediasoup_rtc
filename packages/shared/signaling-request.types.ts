import { SignalingEvent, SignalingErrorCodeValue } from "./common.constants";

export type ErrorResponse = {
  code: SignalingErrorCodeValue;
  message: null | string;
};

/** {@link SignalingEvent.RoomJoin} 요청 payload */
export type RoomJoinRequest = { roomId: string };

/** {@link SignalingEvent.RoomJoin} 응답(ack) */
export type RoomJoinResponse =
  | {
      peerId: string;
      routerRtpCapabilities: unknown;
      producers: {
        peerId: string;
        producerId: string;
        kind: "audio" | "video";
      }[];
      dataProducers: {
        peerId: string;
        dataProducerId: string;
      }[];
      sendTransport: TransportResponse;
      recvTransport: TransportResponse;
    }
  | ErrorResponse;

/** {@link SignalingEvent.RoomLeave} 요청 payload */
export type RoomLeaveRequest = { roomId: string };

/** {@link SignalingEvent.RoomLeave} 응답(ack) */
export type RoomLeaveResponse = { success: boolean } | ErrorResponse;

/** {@link SignalingEvent.TransportCreate} 요청 payload */
export type TransportCreateRequest = {
  roomId: string;
  direction: "send" | "recv";
};

/** {@link SignalingEvent.TransportCreate} 응답(ack) */
export type TransportCreateResponse = TransportResponse | ErrorResponse;

export type TransportResponse = {
  transportId: string;
  iceParameters: unknown; // WebRTC 연결에 쓰이는 데이터
  iceCandidates: unknown[]; // WebRTC 연결에 쓰이는 데이터
  dtlsParameters: unknown; // WebRTC 연결에 쓰이는 데이터
  sctpParameters: unknown; // WebRTC 데이터채널 연결에 쓰이는 데이터
};

/** {@link SignalingEvent.TransportConnect} 요청 payload */
export type TransportConnectRequest = {
  roomId: string;
  transportId: string;
  dtlsParameters: unknown;
};

/** {@link SignalingEvent.TransportConnect} 응답(ack) */
export type TransportConnectResponse =
  | {
      success: boolean;
    }
  | ErrorResponse;

/** {@link SignalingEvent.Produce} 요청 payload */
export type ProduceRequest = {
  roomId: string;
  kind: "audio" | "video";
  rtpParameters: unknown; // 나중에 mediasoup RtpParameters 타입으로 교체 가능
};

/** {@link SignalingEvent.Produce} 응답(ack) */
export type ProduceResponse = { producerId: string } | ErrorResponse;

/** {@link SignalingEvent.ProduceData} 요청 payload */
export type ProduceDataRequest = {
  roomId: string;
  sctpStreamParameters: unknown; // mediasoup.SctpStreamParameters
  label?: string; // 식별 label
  protocol?: string; // 앱 정의값
};

/** {@link SignalingEvent.ProduceData} 응답(ack) */
export type ProduceDataResponse = { dataProducerId: string } | ErrorResponse;

/** {@link SignalingEvent.ProduceClose} 요청 payload */
export type ProduceCloseRequest = {
  roomId: string;
  producerId: string;
};

/** {@link SignalingEvent.ProduceClose} 응답(ack) */
export type ProduceCloseResponse = { success: boolean } | ErrorResponse;

/** {@link SignalingEvent.Consume} 요청 payload */
export type ConsumeRequest = {
  roomId: string;
  producerId: string;
  rtpCapabilities: unknown;
};

/** {@link SignalingEvent.Consume} 응답(ack) */
export type ConsumeResponse =
  | {
      consumerId: string;
      kind: "audio" | "video";
      producerId: string;
      rtpParameters: unknown;
    }
  | ErrorResponse;

/** {@link SignalingEvent.ConsumeData} 요청 payload */
export type ConsumeDataRequest = {
  roomId: string;
  dataProducerId: string;
};

/** {@link SignalingEvent.ConsumeData} 응답(ack) */
export type ConsumeDataResponse =
  | {
      dataProducerId: string;
      dataConsumerId: string;
      sctpStreamParameters: unknown;
      label?: string;
      protocol?: string;
    }
  | ErrorResponse;

/** {@link SignalingEvent.ConsumeResume} 요청 payload */
export type ConsumeResumeRequest = { roomId: string; consumerId: string };

/** {@link SignalingEvent.ConsumeResume} 응답(ack) */
export type ConsumeResumeResponse = { success: true } | ErrorResponse;

/** {@link SignalingEvent.ConsumeLayers} 요청 payload */
export type ConsumeChangeLayerRequest = {
  roomId: string;
  consumerId: string;
  /**
   * 해상도
   * - `0` low
   * - `1` medium
   * - `2` high
   */
  spatialLayer: 0 | 1 | 2;
  /** 프레임레이트 단계 */
  temporalLayer?: number;
};

/** {@link SignalingEvent.ConsumeLayers} 응답(ack) */
export type ConsumeChangeLayerResponse = { success: true } | ErrorResponse;

/** {@link SignalingEvent.ConsumeClose} 요청 payload */
export type ConsumeCloseRequest = { roomId: string; consumerId: string };

/** {@link SignalingEvent.ConsumeClose} 응답(ack) */
export type ConsumeCloseResponse = { success: true } | ErrorResponse;

/**
 * 클라이언트 → 서버 (서버가 socket.on 으로 받는 이벤트들)
 * 키 = 이벤트 이름, 값 = 핸들러 시그니처
 */
export interface ClientToServerEvents {
  [SignalingEvent.RoomJoin]: (
    req: RoomJoinRequest,
    ack: (res: RoomJoinResponse) => void,
  ) => void;
  [SignalingEvent.RoomLeave]: (
    req: RoomLeaveRequest,
    ack: (res: RoomLeaveResponse) => void,
  ) => void;
  [SignalingEvent.TransportCreate]: (
    req: TransportCreateRequest,
    ack: (res: TransportCreateResponse) => void,
  ) => void;
  [SignalingEvent.TransportConnect]: (
    req: TransportConnectRequest,
    ack: (res: TransportConnectResponse) => void,
  ) => void;
  [SignalingEvent.Produce]: (
    req: ProduceRequest,
    ack: (res: ProduceResponse) => void,
  ) => void;
  [SignalingEvent.ProduceData]: (
    req: ProduceDataRequest,
    ack: (res: ProduceDataResponse) => void,
  ) => void;
  [SignalingEvent.ProduceClose]: (
    req: ProduceCloseRequest,
    ack: (res: ProduceCloseResponse) => void,
  ) => void;
  [SignalingEvent.Consume]: (
    req: ConsumeRequest,
    ack: (res: ConsumeResponse) => void,
  ) => void;
  [SignalingEvent.ConsumeData]: (
    req: ConsumeDataRequest,
    ack: (res: ConsumeDataResponse) => void,
  ) => void;
  [SignalingEvent.ConsumeResume]: (
    req: ConsumeResumeRequest,
    ack: (res: ConsumeResumeResponse) => void,
  ) => void;
  [SignalingEvent.ConsumeChangeLayer]: (
    req: ConsumeChangeLayerRequest,
    ack: (res: ConsumeChangeLayerResponse) => void,
  ) => void;
  [SignalingEvent.ConsumeClose]: (
    req: ConsumeCloseRequest,
    ack: (res: ConsumeCloseResponse) => void,
  ) => void;
}
