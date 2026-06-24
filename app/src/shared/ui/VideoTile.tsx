import { useEffect, useRef, useState } from "react";

type Props = {
  label: string;
  track: MediaStreamTrack;
  muted?: boolean;
};

export function VideoTile({ label, track, muted }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  // 새로 consume/replace한 video는 첫 키프레임 전까지 회색이다 → ready 전에는
  // placeholder를 덮고, 첫 프레임(onPlaying)에서 video를 페이드 인한다.
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    setReady(false); // 트랙 교체 시 다시 placeholder부터
    el.srcObject = new MediaStream([track]);
    return () => {
      el.srcObject = null;
    };
  }, [track]);

  return (
    <div className="tile">
      <video
        id={`video_${label}`}
        ref={videoRef}
        autoPlay
        playsInline
        muted={muted}
        className={ready ? "is-ready" : ""}
        onPlaying={() => setReady(true)}
      />
      {!ready && (
        <div className="tile-placeholder">{label.slice(0, 1).toUpperCase()}</div>
      )}
      <span className="tile-label">{label}</span>
    </div>
  );
}
