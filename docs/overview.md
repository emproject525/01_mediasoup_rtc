# Overview

mediasoup SFU 기반의 N:N 화상 통신 데모. 브라우저 여러 개로 같은 방에 입장해 서로의 카메라/마이크 스트림을 실시간으로 주고받는 것을 목표로 한다. WebRTC 시그널링과 SFU(Selective Forwarding Unit) 파이프라인을 직접 구성해 보는 데 초점이 있다.

## 데모 시나리오

1. 사용자가 방 ID로 입장한다. (`room:join`)
2. 카메라/마이크를 송출한다. (`transport:create` → `produce`)
3. 같은 방의 다른 참가자 스트림을 수신한다. (`consume`)
4. 새 참가자가 들어오거나 나가면 화면이 갱신된다.

성공 기준: **브라우저 탭 2개로 양방향 영상/음성이 보이고 들린다.**

## MVP 범위

- 방 입장 / 퇴장
- 인증 / 계정 / 권한
- 카메라 + 마이크 송출 (VP8 / Opus)
- 같은 방 참가자 스트림 수신 (N:N)
- 참가자 입퇴장에 따른 동적 갱신
- 텍스트 채팅

## Non-goals (이번 데모에서 안 하는 것)

- 녹화 / 다시보기
- 화면 공유 _(여유 되면 스트레치)_
- 다중 worker / 수평 확장, TURN 서버 운영
- 모바일 네이티브 클라이언트

## 현재 구현 상태

| 영역                               | 상태 | 비고                                |
| ---------------------------------- | ---- | ----------------------------------- |
| 시그널링 서버 (socket.io)          | ✅   | `mediasoup/src/signaling/server.ts` |
| Worker / Router / Room / Peer 골격 | ✅   | 단일 worker, 방마다 router 1개      |
| `room:join`                        | ✅   | router RTP capabilities 반환        |
| `transport:create`                 | 🚧   | 이벤트 상수만 정의, 미구현          |
| `produce`                          | 🚧   | 미구현                              |
| `consume`                          | 🚧   | 미구현                              |
| 브라우저 클라이언트 (`app/`)       | ❌   | 아직 없음                           |

> 시그널링 메시지 상세는 [protocol.md](./protocol.md), 디렉터리 구조는
> [structure.md](./structure.md) 참고.

## 기술 스택

- **SFU**: mediasoup (Node.js)
- **시그널링**: socket.io
- **코덱**: 비디오 VP8 / 오디오 Opus (`mediasoup/src/sfu/mediaCodecs.ts`)
- **언어**: TypeScript (ESM)
- **모노레포**: pnpm workspace (`mediasoup/`, `packages/`, 예정 `app/`)
