import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Chat, AudioSink, VideoTile } from "./shared/ui";
import { useApp, useLog } from "./shared";
import { VIDEO_CONSUMER_MAX } from "@rtc/packages";

export default function App() {
  const {
    roomStatus,
    local,
    remotes,
    leaveRoom,
    joinRoom,
    myPeerId,
    togglePause,
  } = useApp();
  const [roomId, setRoomId] = useState("test-room");

  const { logs } = useLog();

  const joined = roomStatus === "joined";
  const busy = roomStatus === "connecting";
  const localVideo = local?.find(({ kind }) => kind === "video");
  const localAudio = local?.find(({ kind }) => kind === "audio");

  // video 타일은 화면 용량(C=25)까지만. consume 로직도 25로 제한하지만 UI에서도 하드 cap.
  const remoteVideos = remotes
    .filter((r) => r.kind === "video")
    .slice(0, VIDEO_CONSUMER_MAX);
  const remoteAudios = remotes.filter((r) => r.kind === "audio");

  return (
    <div className="app">
      <header className="bar">
        <h1>mediasoup SFU 테스트</h1>
        <div className="controls">
          <input
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            disabled={joined || busy}
            placeholder="room id"
          />
          {joined ? (
            <button onClick={leaveRoom}>나가기</button>
          ) : (
            <button onClick={() => joinRoom(roomId)} disabled={busy || !roomId}>
              {busy ? "연결 중…" : "입장"}
            </button>
          )}
          <span className={`status status-${roomStatus}`}>{roomStatus}</span>
          {myPeerId && <span className="peer">me: {myPeerId}</span>}
        </div>
      </header>

      {joined && (localAudio || localVideo) && (
        <div className="media-controls">
          {localAudio && (
            <button
              onClick={() => togglePause(localAudio.producerId)}
              className={localAudio.pause ? "ctl off" : "ctl"}
            >
              {localAudio.pause ? "음소거 해제" : "음소거"}
            </button>
          )}
          {localVideo && (
            <button
              onClick={() => togglePause(localVideo.producerId)}
              className={localVideo.pause ? "ctl off" : "ctl"}
            >
              {localVideo.pause ? "영상 켜기" : "영상 끄기"}
            </button>
          )}
        </div>
      )}

      <section className="grid">
        <AnimatePresence>
          {localVideo && (
            <motion.div
              key="local"
              className="tile-wrap"
              layout
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              <VideoTile label="나 (local)" track={localVideo.track} muted />
            </motion.div>
          )}
          {remoteVideos.map((r) => (
            // key는 swap마다 바뀌는 consumerId가 아니라 안정적인 peerId로 — 그래야
            // React가 DOM을 재활용하고 layout 애니메이션이 "슉" 슬라이드로 이어진다.
            <motion.div
              key={r.peerId}
              className="tile-wrap"
              layout
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              <VideoTile label={`peer ${r.peerId}`} track={r.track} />
            </motion.div>
          ))}
        </AnimatePresence>
      </section>

      {remoteAudios.map((r) => (
        <AudioSink key={r.consumerId} track={r.track} />
      ))}

      <div className="bottom">
        {joined && <Chat />}

        <aside className="logs">
          <div className="logs-title">log</div>
          <pre>{logs.join("\n")}</pre>
        </aside>
      </div>
    </div>
  );
}
