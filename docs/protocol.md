# Signaling Protocol

클라이언트 ↔ mediasoup 서버 간 시그널링 메시지 명세. 전송은 socket.io이며, 요청/응답이 필요한 메시지는 socket.io **ack 콜백**으로 결과를 돌려준다.

이벤트 이름 상수: `packages/shared/common.constants.ts` (`SignalingEvent`).

## 핸드셰이크 순서

```txt
client                          server
  | --- room:join ----------------> |  방 입장, router capabilities 수신
  | <-- ack {routerRtpCapabilities} |
  | --- transport:create ---------> |  송/수신용 WebRTC transport 생성   (예정)
  | --- produce ------------------> |  내 미디어 송출                      (예정)
  | --- consume ------------------> |  상대 미디어 수신                    (예정)
```

## 이벤트

### `room:join` ✅ 구현됨

방에 입장하고 해당 방 router의 RTP capability를 받는다. 방이 없으면 서버가 생성한다.

**요청**

```ts
{
  roomId: string;
}
```

**응답 (ack)**

```ts
// 성공
{
  peerId: string;
  routerRtpCapabilities: RtpCapabilities;
}
// 실패
{
  error: string;
}
```

### `transport:create` 🚧 예정

mediasoup WebRTC transport를 생성하고 연결 정보를 반환한다. 송신/수신용을 각각
생성한다. (응답 예: `id`, `iceParameters`, `iceCandidates`, `dtlsParameters`)

### `produce` 🚧 예정

클라이언트의 audio/video 트랙을 서버로 송출한다. 요청에 `transportId`, `kind`,
`rtpParameters`를 포함하고, 서버는 생성된 `producerId`를 반환한다.

### `consume` 🚧 예정

같은 방 다른 참가자의 producer를 구독한다. 서버는 `consumerId`, `producerId`,
`kind`, `rtpParameters`를 반환한다.

## 서버 → 클라이언트 알림 (예정)

- `peer:joined` — 새 참가자 입장 (구독 트리거)
- `peer:left` — 참가자 퇴장 (정리 트리거)

## 연결 종료

socket `disconnect` 시 서버는 해당 peer를 모든 방에서 제거하고, 방이 비면 방을
삭제한다. (`RoomManager.removePeer`)
