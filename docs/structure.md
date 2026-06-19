# Project Structure

```txt
app/                 Browser client (Vite 8 / Rolldown + React 19). SFU test page.
api/                 Future business API server.
mediasoup/           RTC runtime: signaling entrypoint plus mediasoup SFU control.
packages/            Shared protocol package (@rtc/packages): event names + request/response types.
docs/                Architecture and protocol notes.
```

`mediasoup/` is a Node.js service. It owns WebRTC signaling for RTC sessions and calls the mediasoup library to create workers, routers, transports, producers, and consumers.

`app/` is the browser client. It consumes `@rtc/packages` so the signaling protocol (event names, request/response shapes) is shared 1:1 with the server. Core handshake logic lives in `app/src/lib/rtcClient.ts` (mediasoup-client `Device`/`Transport`), wired into React via `app/src/hooks/useRoom.ts`.

`packages/` should only contain code that is imported by more than one runtime. If the app, API, and mediasoup service should stay fully independent, keep protocol details in `docs/` instead.
