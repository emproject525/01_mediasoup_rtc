export const SignalingEvent = {
  /** 방 참여 */
  RoomJoin: "room:join",
  /** mediasoup transport create */
  TransportCreate: "transport:create",
  Produce: "produce",
  ProduceClose: "produce:close",
  Consume: "consume",
  /** peer 입장 */
  PeerJoined: "peer:joined",
} as const;
