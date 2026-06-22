import { useState } from "react";
import { useRoom } from "./hooks/useRoom";
import { VideoTile } from "./components/VideoTile";
import { AudioSink } from "./components/AudioSink";
import { Chat } from "./components/Chat";

export default function App() {
  const {
    status,
    peerId,
    localStream,
    remotes,
    logs,
    join,
    leave,
    chats,
    sendChat,
    audioPaused,
    videoPaused,
    toggleAudio,
    toggleVideo,
  } = useRoom();
  const [roomId, setRoomId] = useState("test-room");

  const joined = status === "joined";
  const busy = status === "connecting";
  const localVideoTrack = localStream?.getVideoTracks()[0];
  const hasAudio = !!localStream?.getAudioTracks().length;
  const hasVideo = !!localStream?.getVideoTracks().length;

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
            <button onClick={leave}>나가기</button>
          ) : (
            <button onClick={() => join(roomId)} disabled={busy || !roomId}>
              {busy ? "연결 중…" : "입장"}
            </button>
          )}
          <span className={`status status-${status}`}>{status}</span>
          {peerId && <span className="peer">me: {peerId}</span>}
        </div>
      </header>

      {joined && (hasAudio || hasVideo) && (
        <div className="media-controls">
          {hasAudio && (
            <button
              onClick={toggleAudio}
              className={audioPaused ? "ctl off" : "ctl"}
            >
              {audioPaused ? "🔇 음소거 해제" : "🎙️ 음소거"}
            </button>
          )}
          {hasVideo && (
            <button
              onClick={toggleVideo}
              className={videoPaused ? "ctl off" : "ctl"}
            >
              {videoPaused ? "📷 영상 켜기" : "🚫 영상 끄기"}
            </button>
          )}
        </div>
      )}

      <section className="grid">
        {localVideoTrack && (
          <VideoTile label="나 (local)" track={localVideoTrack} muted />
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
