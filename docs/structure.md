# Project Structure

```txt
app/                 Browser client.
api/                 Future business API server.
mediasoup/           RTC runtime: signaling entrypoint plus mediasoup SFU control.
packages/            Optional shared packages, such as protocol types.
docs/                Architecture and protocol notes.
```

`mediasoup/` is a Node.js service. It owns WebRTC signaling for RTC sessions and calls the mediasoup library to create workers, routers, transports, producers, and consumers.

`packages/` should only contain code that is imported by more than one runtime. If the app, API, and mediasoup service should stay fully independent, keep protocol details in `docs/` instead.
