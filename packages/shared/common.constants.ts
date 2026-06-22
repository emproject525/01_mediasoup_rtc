// =======================================================================================
// Signaling Event
// =======================================================================================

export const SignalingEvent = {
  /** 방 참여 */
  RoomJoin: "room:join",
  /** mediasoup transport create */
  TransportCreate: "transport:create",
  /** mediasoup transport connect */
  TransportConnect: "transport:connect",
  /** produce 목적의 mediasoupWebRtc 정보 요청 */
  Produce: "produce",
  /** 데이터채널용 produce 목적의 정보 요청 */
  ProduceData: "produce:data",
  ProduceClose: "produce:close",
  /** consume 목적의 mediasoupWebRtc 정보 요청 */
  Consume: "consume",
  /** 데이터채널용 consume 정보 요청 */
  ConsumeData: "consume:data",
  /** 첫 프레임 유실 방지의 목적으로 consume srcObject 연결 완료 후 호출 */
  ConsumeResume: "consume:resume",
  /** peer 입장 */
  EventPeerJoined: "event:peer:joined",
  /** peer에 새로운 producer가 생겼을 때 */
  EventProducerNew: "event:producer:new",
  /** peer에 새로운 data producer가 생겼을 때 */
  EventDataProducerNew: "event:dataproducer:new",
  /** peer의 producer가 종료되었을 때 */
  EventProducerClosed: "event:producer:closed",
  /** peer의 data producer가 종료되었을 때 */
  EventDataProducerClosed: "event:dataproducer:closed",
} as const;

export type SignalingEventKey = keyof typeof SignalingEvent;

/** 이벤트 이름 유니온 — 이름 그 자체만 필요할 때(로깅 등) 사용 */
export type SignalingEventValue = (typeof SignalingEvent)[SignalingEventKey];

// =======================================================================================
// Signaling Error Code
// =======================================================================================

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
  ProduceDataFailed: 10010,
  ConsumeDataFailed: 10011,
} as const;

export type SignalingErrorCodeKey = keyof typeof SignalingErrorCode;

export type SignalingErrorCodeValue =
  (typeof SignalingErrorCode)[SignalingErrorCodeKey];

// =======================================================================================
// Data Payload
// =======================================================================================

export const MessageId = {
  Chat: 10000,
  Image: 10001,
} as const;

export type MessageIdType = keyof typeof MessageId;

export type MessageIdValue = (typeof MessageId)[MessageIdType];

export type DataPayload =
  | {
      messageId: typeof MessageId.Chat;
      message: string;
    }
  | {
      messageId: typeof MessageId.Image;
      message: {
        extension: "image/png" | "image/gif" | "image/jpeg" | "image/jpg";
        base64: string;
      };
    };
