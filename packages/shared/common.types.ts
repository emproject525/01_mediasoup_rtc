import { SignalingEvent } from "./common.constants";

/** 이벤트 이름 유니온 — 이름 그 자체만 필요할 때(로깅 등) 사용 */
export type SignalingEventType =
  (typeof SignalingEvent)[keyof typeof SignalingEvent];

/** room:join 요청 payload */
export type JoinRoomRequest = { roomId: string };

/** room:join 응답(ack) */
export type JoinRoomResponse =
  | { peerId: string; routerRtpCapabilities: unknown } // mediasoup RtpCapabilities (클라에서 좁히기)
  | { error: string };

/**
 * 클라이언트 → 서버 (서버가 socket.on 으로 받는 이벤트들)
 * 키 = 이벤트 이름, 값 = 핸들러 시그니처
 */
export interface ClientToServerEvents {
  [SignalingEvent.RoomJoin]: (
    req: JoinRoomRequest,
    ack: (res: JoinRoomResponse) => void,
  ) => void;
}

/** 서버 → 클라이언트 (서버가 socket.emit 으로 보내는 이벤트들) */
export interface ServerToClientEvents {
  // 예) "peer:joined": (peerId: string) => void;  ← 나중에 추가
}
