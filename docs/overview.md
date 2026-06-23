# Overview

mediasoup SFU 기반의 N:N 화상 통신 데모. 브라우저 여러 개로 같은 방에 입장해 서로의 카메라/마이크 스트림을 실시간으로 주고받는 것을 목표로 한다. WebRTC 시그널링과 SFU(Selective Forwarding Unit) 파이프라인을 직접 구성해 보는 데 초점이 있다.

## 데모 시나리오

1. 방 ID로 입장한다. (`room:join` → router capabilities + 송/수신 transport 파라미터 + 기존 producer·dataProducer 목록 수신)
2. 응답으로 받은 파라미터로 송/수신 transport를 생성·연결한다. (`transport:connect`)
3. 카메라/마이크를 송출한다. (`produce` → 다른 참가자에게 `event:producer:new` 알림)
4. 입장과 동시에 채팅용 데이터채널을 만든다. (`produce:data` → `event:dataproducer:new` 알림)
5. 같은 방의 다른 참가자 스트림·채팅을 수신한다. (`consume` / `consume:data`)
6. 음소거·영상 끄기로 자신의 producer를 pause/resume 한다.
7. 송출 종료(`produce:close`)·연결 종료(disconnect) 시 자원이 정리되고 화면이 갱신된다.

성공 기준: **브라우저 탭 2개로 양방향 영상/음성 + 텍스트 채팅이 동작한다.**

## MVP 범위

- 방 입장 / 퇴장
- 카메라 + 마이크 송출 (VP8 / Opus)
- 같은 방 참가자 스트림 수신 (N:N)
- 참가자 입퇴장에 따른 동적 갱신
- 음소거 / 영상 끄기 (producer pause/resume)
- 텍스트 채팅 (mediasoup DataChannel)

## Non-goals (이번 데모에서 안 하는 것)

- 파일 첨부 _(스트레치 — 청킹/백프레셔 필요)_
- 인증 / 계정 / 권한
- 녹화 / 다시보기
- 화면 공유 _(여유 되면 스트레치)_
- 다중 worker / 수평 확장, TURN 서버 운영
- 모바일 네이티브 클라이언트

## 현재 구현 상태

서버측 시그널링 전체 루프(입장 → transport 생성/연결 → produce → consume → 정리)가 구현되어 있다.

| 영역                               | 상태 | 비고                                                                                                     |
| ---------------------------------- | ---- | -------------------------------------------------------------------------------------------------------- |
| 시그널링 서버 (socket.io)          | ✅   | `mediasoup/src/signaling/server.ts`                                                                      |
| Worker / Router / Room / Peer 골격 | ✅   | 단일 worker, 방마다 router 1개                                                                           |
| `room:join`                        | ✅   | router capabilities + 송/수신 transport 파라미터 + 기존 producer·dataProducer 목록 반환, 입장 알림       |
| transport 생성 (eager)             | ✅   | `room:join` 시 송/수신 transport를 미리 생성해 파라미터 반환 (SCTP 포함, 별도 `transport:create` 미사용) |
| `transport:connect`                | ✅   | 클라 dtlsParameters로 서버측 transport 연결                                                              |
| `produce`                          | ✅   | Producer 생성 + `event:producer:new` 브로드캐스트                                                        |
| `produce:close`                    | ✅   | Producer 종료                                                                                            |
| `consume`                          | ✅   | `canConsume` 검사 + paused Consumer 생성, producerId 반환                                                |
| `consume:resume`                   | ✅   | 클라 화면 연결 후 서버측 Consumer resume                                                                 |
| `event:producer:closed`            | ✅   | `producerclose` 시 구독자 본인에게 개별 알림                                                             |
| 텍스트 채팅 (DataChannel)          | ✅   | `produce:data` / `consume:data`, `event:dataproducer:new`·`:closed` 알림, SFU 자동 라우팅                |
| 음소거 / 영상 끄기                 | ✅   | 클라에서 audio/video producer pause·resume                                                               |
| 활성 발언자 감지 (`event:talk`)    | ✅   | 방마다 `AudioLevelObserver` 1개, 발언자 목록(`{ peerId, volume }[]`)을 방 전체에 브로드캐스트            |
| 에러 응답                          | ✅   | `SignalingErrorCode` 기반 `{ code, message }` 통일                                                       |
| 연결 종료 정리                     | ✅   | `disconnecting` → peer 제거 + `peer.close()`, 빈 방 router close                                         |
| 브라우저 클라이언트 (`app/`)       | ✅   | Vite 8 / React 19, 핸드셰이크 + 채팅 UI + 음소거/영상 끄기. 2탭에서 채팅 동작 확인                       |

### 남은 항목

- **(참고) TURN 서버 미운영** — `announcedIp` 지정으로 같은 네트워크나 공인 IP 직접 도달 환경은 연결되나, 대칭 NAT/방화벽 환경에선 ICE 실패 가능. 실제 배포 시 TURN 필요. (Non-goals 참고)
- **(마이너) `disconnecting` 정리가 fire-and-forget** — 에러는 `.catch`로 로깅하지만 정리 완료를 기다리지 않고 `disconnected` 로그를 남긴다. 동작엔 지장 없으나 로그 순서가 어긋날 수 있음.
- **(확인 필요) 실기기 미디어 경로 미검증** — 클라 핸드셰이크는 전부 구현됐으나, 실제 카메라/마이크 스트림 송수신은 아직 검증 전.
- **(미구현) 클라이언트 발언자 하이라이트 UI** — 서버가 `event:talk`를 `io.to(roomId)`로 방 전체에 보내지만, `app/`에서 아직 수신·표시하지 않음.

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
