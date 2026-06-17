import { SignalingEvent } from "./common.constants";

/** 이벤트 이름 유니온 — 이름 그 자체만 필요할 때(로깅 등) 사용 */
export type SignalingEventType =
  (typeof SignalingEvent)[keyof typeof SignalingEvent];

export type ErrorResponse = { error: string };

/** {@link SignalingEvent.RoomJoin} 요청 payload */
export type JoinRoomRequest = { roomId: string };

/** {@link SignalingEvent.RoomJoin} 응답(ack) */
export type JoinRoomResponse =
  | { peerId: string; routerRtpCapabilities: unknown } // mediasoup RtpCapabilities (클라에서 좁히기)
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

/**
 * 클라이언트 → 서버 (서버가 socket.on 으로 받는 이벤트들)
 * 키 = 이벤트 이름, 값 = 핸들러 시그니처
 */
export interface ClientToServerEvents {
  [SignalingEvent.RoomJoin]: (
    req: JoinRoomRequest,
    ack: (res: JoinRoomResponse) => void
  ) => void;
  [SignalingEvent.TransportCreate]: (
    req: TransportCreateRequest,
    ack: (res: TransportCreateResponse) => void
  ) => void;
  [SignalingEvent.Produce]: (
    req: ProduceRequest,
    ack: (res: ProduceResponse) => void
  ) => void;
  [SignalingEvent.ProduceClose]: (
    req: ProduceCloseRequest,
    ack: (res: ProduceCloseResponse) => void
  ) => void;
}

/** 서버 → 클라이언트 (서버가 socket.emit 으로 보내는 이벤트들) */
export interface ServerToClientEvents {
  // 예) "peer:joined": (peerId: string) => void;  ← 나중에 추가
}
