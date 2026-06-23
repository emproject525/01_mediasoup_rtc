import { useState } from "react";
import { VideoTile } from "./components/VideoTile";
import { AudioSink } from "./components/AudioSink";
import { Chat } from "./components/Chat";
import { useApp, useLog } from "./shared";

export default function App() {
  const {
    roomStatus,
    local,
    remotes,
    leaveRoom,
    joinRoom,
    myPeerId,
    togglePause,
    chats,
    sendChat,
  } = useApp();
  const [roomId, setRoomId] = useState("test-room");

  const { logs } = useLog();

  const joined = roomStatus === "joined";
  const busy = roomStatus === "connecting";
  const localVideo = local?.find(({ kind }) => kind === "video");
  const localAudio = local?.find(({ kind }) => kind === "audio");

  const remoteVideos = remotes.filter((r) => r.kind === "video");
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
        {localVideo && (
          <VideoTile label="나 (local)" track={localVideo.track} muted />
        )}
        {remoteVideos.map((r) => (
          <VideoTile
            key={r.consumerId}
            label={`peer ${r.peerId}`}
            track={r.track}
          />
        ))}
      </section>

      {remoteAudios.map((r) => (
        <AudioSink key={r.consumerId} track={r.track} />
      ))}

      <div className="bottom">
        {joined && <Chat messages={chats} onSend={sendChat} />}

        <aside className="logs">
          <div className="logs-title">log</div>
          <pre>{logs.join("\n")}</pre>
        </aside>
      </div>
    </div>
  );
}
