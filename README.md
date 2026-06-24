# mediasoup RTC

mediasoup SFU(Selective Forwarding Unit) 기반의 **N:N 화상 통신 데모**. 여러 브라우저 탭이 같은 방에 입장해 서로의 카메라/마이크 스트림과 텍스트 채팅을 실시간으로 주고받는다.

## 프로젝트 목적

WebRTC 시그널링과 SFU 미디어 파이프라인을 직접 구성해 보는 데 초점이 있다. 단순히 라이브러리를 붙이는 데 그치지 않고, 입장부터 양방향 미디어 송수신·정리까지의 전체 시그널링 루프를 손으로 설계·구현하는 것이 목표다.

- **방 입장 / 퇴장** — 방 ID로 입장, 입퇴장에 따른 참가자 목록 동적 갱신
- **미디어 송수신 (N:N)** — 카메라 + 마이크 송출(VP8 / Opus), 같은 방 참가자 스트림 수신
- **음소거 / 영상 끄기** — producer pause/resume
- **텍스트 채팅** — mediasoup DataChannel 기반, SFU 자동 라우팅
- **활성 발언자 감지** — `AudioLevelObserver`로 발언자 기반 video 구독 동적 교체

성공 기준: **브라우저 탭 2개로 양방향 영상/음성 + 텍스트 채팅이 동작한다.**

## 기술 스택

- **SFU**: mediasoup (Node.js)
- **시그널링**: socket.io (서버) / socket.io-client (클라)
- **클라이언트**: Vite 8 (Rolldown) + React 19, mediasoup-client
- **언어**: TypeScript (ESM)
- **모노레포**: pnpm workspace (`app/`, `mediasoup/`, `packages/`) — `@rtc/packages`로 서버·클라가 프로토콜 타입을 1:1 공유

## 실행

```bash
pnpm dev:mediasoup   # 시그널링/SFU 서버 (:4000)
pnpm dev:app         # 브라우저 클라 (:5173)
```

브라우저 2탭으로 같은 room id 입장 → 양방향 영상/음성 확인.

## Documentation

- [개요 (overview.md)](./docs/overview.md) — mediasoup SFU 기반 N:N 화상 통신 데모 소개
- [프로젝트 구조 (structure.md)](./docs/structure.md) — 디렉터리/패키지 구성
- [시그널링 프로토콜 ① 핸드셰이크 (protocol.01.handshake.md)](./docs/protocol.01.handshake.md) — 입장부터 양방향 미디어 송수신까지의 핸드셰이크
- [시그널링 프로토콜 ② Active Speaker (protocol.02.active-speaker.md)](./docs/protocol.02.active-speaker.md) — 발언자 기반 video 구독 동적 교체 + 무깜빡임 UI

## Reference

**Mediasoup 공식 데모**

https://github.com/versatica/mediasoup-demo

## Windows 환경 실행

_mediasoup은 OS별 네이티브 worekr 사용_

Windows에서 `mediasoup-worker` 관련 `ENOENT` 오류가 발생하면 Git Bash에서 다음 명령으로 `postinstall`을 다시 다시 실행해야할 것.

```bash
MEDIASOUP_FORCE_WORKER_PREBUILT_DOWNLOAD=true \
pnpm --dir node_modules/.pnpm/mediasoup@3.20.9/node_modules/mediasoup run postinstall
```

이 명령은 Windows용 `mediasoup-worker.exe`를 다운로드함.
