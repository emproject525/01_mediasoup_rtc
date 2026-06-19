import { useEffect, useRef } from "react";

/** 화면에 보이지 않는 오디오 재생 전용 엘리먼트 */
export function AudioSink({ track }: { track: MediaStreamTrack }) {
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    el.srcObject = new MediaStream([track]);
    return () => {
      el.srcObject = null;
    };
  }, [track]);

  return <audio ref={audioRef} autoPlay />;
}
