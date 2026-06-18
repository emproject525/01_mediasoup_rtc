import { SignalingEvent } from "./common.constants";

/** {@link SignalingEvent.EventPeerJoined} event */
export type EventPeerJoined = { peerId: string };

/** {@link SignalingEvent.EventProducerNew} event */
export type EventProducerNew = {
  producerId: string;
  peerId: string;
  kind: "audio" | "video";
};

/** {@link SignalingEvent.EventProducerClosed} event */
export type EventProducerClosed = {
  producerId: string;
};

/** 서버 → 클라이언트 (서버가 socket.emit 으로 보내는 이벤트들) */
export interface ServerToClientEvents {
  [SignalingEvent.EventPeerJoined]: (event: EventPeerJoined) => void;
  [SignalingEvent.EventProducerNew]: (event: EventProducerNew) => void;
  [SignalingEvent.EventProducerClosed]: (event: EventProducerClosed) => void;
}
