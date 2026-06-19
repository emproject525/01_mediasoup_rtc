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
    }
  | ErrorResponse;

/** {@link SignalingEvent.TransportCreate} 요청 payload */
export type TransportCreateRequest = {
  roomId: string;
  direction: "send" | "recv";
};

/** {@link SignalingEvent.TransportCreate} 응답(ack) */
export type TransportCreateResponse =
  | {
      transportId: string;
      iceParameters: unknown; // WebRTC 연결에 쓰이는 데이터
      iceCandidates: unknown[]; // WebRTC 연결에 쓰이는 데이터
      dtlsParameters: unknown; // WebRTC 연결에 쓰이는 데이터
    }
  | ErrorResponse;

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

/** {@link SignalingEvent.ConsumeResume} 요청 payload */
export type ConsumeResumeRequest = { roomId: string; consumerId: string };

/** {@link SignalingEvent.ConsumeResume} 응답(ack) */
export type ConsumeResumeResponse = { success: true } | ErrorResponse;

/**
 * 클라이언트 → 서버 (서버가 socket.on 으로 받는 이벤트들)
 * 키 = 이벤트 이름, 값 = 핸들러 시그니처
 */
export interface ClientToServerEvents {
  [SignalingEvent.RoomJoin]: (
    req: RoomJoinRequest,
    ack: (res: RoomJoinResponse) => void,
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
  [SignalingEvent.ProduceClose]: (
    req: ProduceCloseRequest,
    ack: (res: ProduceCloseResponse) => void,
  ) => void;
  [SignalingEvent.Consume]: (
    req: ConsumeRequest,
    ack: (res: ConsumeResponse) => void,
  ) => void;
  [SignalingEvent.ConsumeResume]: (
    req: ConsumeResumeRequest,
    ack: (res: ConsumeResumeResponse) => void,
  ) => void;
}
