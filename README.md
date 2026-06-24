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
