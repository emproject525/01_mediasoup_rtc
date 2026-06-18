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
  /** peer 입장 */
  EventPeerJoined: "event:peer:joined",
  EventProducerNew: "event:producer:new",
  EventProducerClosed: "event:producer:closed",
} as const;

/** 이벤트 이름 유니온 — 이름 그 자체만 필요할 때(로깅 등) 사용 */
export type SignalingEventType =
  (typeof SignalingEvent)[keyof typeof SignalingEvent];
