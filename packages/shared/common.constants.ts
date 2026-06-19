export const SignalingEvent = {
  /** 방 참여 */
  RoomJoin: "room:join",
  /** mediasoup transport create */
  TransportCreate: "transport:create",
  /** mediasoup transport connect */
  TransportConnect: "transport:connect",
  /** produce 목적의 mediasoupWebRtc 정보 요청 */
  Produce: "produce",
  ProduceClose: "produce:close",
  /** consume 목적의 mediasoupWebRtc 정보 요청 */
  Consume: "consume",
  /** 첫 프레임 유실 방지의 목적으로 consume srcObject 연결 완료 후 호출 */
  ConsumeResume: "consume:resume",
  /** peer 입장 */
  EventPeerJoined: "event:peer:joined",
  EventProducerNew: "event:producer:new",
  EventProducerClosed: "event:producer:closed",
} as const;

export type SignalingEventKey = keyof typeof SignalingEvent;

/** 이벤트 이름 유니온 — 이름 그 자체만 필요할 때(로깅 등) 사용 */
export type SignalingEventValue = (typeof SignalingEvent)[SignalingEventKey];

export const SignalingErrorCode = {
  Unknown: 10000,
  NoPeer: 10001,
  RoomJoinFailed: 10002,
  TransportCreateFailed: 10003,
  TransportConnectFailed: 10004,
  ProduceFailed: 10005,
  ProduceCloseFailed: 10006,
  ConsumeFailed: 10007,
  ConsumeFailedNotSupported: 10008,
  ConsumeResumeFailed: 10009,
} as const;

export type SignalingErrorCodeKey = keyof typeof SignalingErrorCode;

export type SignalingErrorCodeValue =
  (typeof SignalingErrorCode)[SignalingErrorCodeKey];
