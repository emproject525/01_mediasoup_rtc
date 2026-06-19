# Overview

mediasoup SFU 기반의 N:N 화상 통신 데모. 브라우저 여러 개로 같은 방에 입장해 서로의 카메라/마이크 스트림을 실시간으로 주고받는 것을 목표로 한다. WebRTC 시그널링과 SFU(Selective Forwarding Unit) 파이프라인을 직접 구성해 보는 데 초점이 있다.

## 데모 시나리오

1. 사용자가 방 ID로 입장한다. (`room:join` → router capabilities + 기존 producer 목록 수신)
2. 송/수신용 transport를 만들고 연결한다. (`transport:create` → `transport:connect`)
3. 카메라/마이크를 송출한다. (`produce` → 다른 참가자에게 `event:producer:new` 알림)
4. 같은 방의 다른 참가자 스트림을 수신한다. (`consume`)
5. 송출 종료(`produce:close`)·연결 종료(disconnect) 시 자원이 정리되고 화면이 갱신된다.

성공 기준: **브라우저 탭 2개로 양방향 영상/음성이 보이고 들린다.**

## MVP 범위

- 방 입장 / 퇴장
- 카메라 + 마이크 송출 (VP8 / Opus)
- 같은 방 참가자 스트림 수신 (N:N)
- 참가자 입퇴장에 따른 동적 갱신

## Non-goals (이번 데모에서 안 하는 것)

- 인증 / 계정 / 권한
- 녹화 / 다시보기
- 화면 공유 _(여유 되면 스트레치)_
- 텍스트 채팅 _(여유 되면 스트레치)_
- 다중 worker / 수평 확장, TURN 서버 운영
- 모바일 네이티브 클라이언트

## 현재 구현 상태

서버측 시그널링 전체 루프(입장 → transport 생성/연결 → produce → consume → 정리)가 구현되어 있다.

| 영역                               | 상태 | 비고                                                       |
| ---------------------------------- | ---- | ---------------------------------------------------------- |
| 시그널링 서버 (socket.io)          | ✅   | `mediasoup/src/signaling/server.ts`                        |
| Worker / Router / Room / Peer 골격 | ✅   | 단일 worker, 방마다 router 1개                             |
| `room:join`                        | ✅   | router capabilities + 기존 producer 목록 반환, 입장 알림   |
| `transport:create`                 | ✅   | 방향(send/recv)별 WebRTC transport 생성, ICE/DTLS 파라미터 |
| `transport:connect`                | ✅   | 클라 dtlsParameters로 서버측 transport 연결                |
| `produce`                          | ✅   | Producer 생성 + `event:producer:new` 브로드캐스트          |
| `produce:close`                    | ✅   | Producer 종료                                              |
| `consume`                          | ✅   | `canConsume` 검사 + paused Consumer 생성, producerId 반환  |
| `consume:resume`                   | ✅   | 클라 화면 연결 후 서버측 Consumer resume                   |
| `event:producer:closed`            | ✅   | `producerclose` 시 구독자 본인에게 개별 알림               |
| 에러 응답                          | ✅   | `SignalingErrorCode` 기반 `{ code, message }` 통일         |
| 연결 종료 정리                     | ✅   | `disconnecting` → peer 제거 + `peer.close()`, 빈 방 router close |
| 브라우저 클라이언트 (`app/`)       | ✅   | Vite 8 / React 19, 핸드셰이크 전체 구현 (실기기 미디어 검증 전) |

### 알려진 보강 포인트

- **(마이너) `producerclose` 시 `_consumers` 맵 미정리** — `transportclose`에서만 맵을 비운다. producer 종료 경로에서도 맵 정리 필요.
- **(참고) `listenIps.announcedIp` 미설정** — 같은 PC localhost 2탭은 동작하나, 다른 기기/배포 환경에선 도달 가능한 IP 지정 필요.

> 시그널링 메시지 상세는 [protocol.md](./protocol.md), 디렉터리 구조는
> [structure.md](./structure.md) 참고.

## 기술 스택

- **SFU**: mediasoup (Node.js)
- **시그널링**: socket.io (서버) / socket.io-client (클라)
- **클라이언트**: Vite 8 (Rolldown) + React 19, mediasoup-client
- **코덱**: 비디오 VP8 / 오디오 Opus (`mediasoup/src/sfu/mediaCodecs.ts`)
- **언어**: TypeScript (ESM)
- **모노레포**: pnpm workspace (`app/`, `mediasoup/`, `packages/`)
- **프로토콜 공유**: `@rtc/packages`를 서버·클라가 함께 import (이벤트/요청·응답 타입 1:1)

## 실행

```bash
pnpm dev:mediasoup   # 시그널링/SFU 서버 (:4000)
pnpm dev:app         # 브라우저 클라 (:5173)
```

브라우저 2탭으로 같은 room id 입장 → 양방향 영상/음성 확인.
