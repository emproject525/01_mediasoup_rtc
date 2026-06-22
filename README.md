## Reference

**공식 데모**

https://github.com/versatica/mediasoup-demo

## Windows 환경 실행

_mediasoup은 OS별 네이티브 worekr 사용_

Windows에서 `mediasoup-worker` 관련 `ENOENT` 오류가 발생하면 Git Bash에서 다음 명령으로 `postinstall`을 다시 다시 실행해야할 것.

```bash
MEDIASOUP_FORCE_WORKER_PREBUILT_DOWNLOAD=true \
pnpm --dir node_modules/.pnpm/mediasoup@3.20.9/node_modules/mediasoup run postinstall
```

이 명령은 Windows용 `mediasoup-worker.exe`를 다운로드함.
