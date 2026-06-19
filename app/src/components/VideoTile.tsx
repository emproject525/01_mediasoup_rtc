import { useEffect, useRef } from "react";

type Props = {
  label: string;
  track: MediaStreamTrack;
  muted?: boolean;
};

export function VideoTile({ label, track, muted }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
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
      />
      <span className="tile-label">{label}</span>
    </div>
  );
}
