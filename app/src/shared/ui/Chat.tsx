import { useEffect, useRef, useState } from "react";
import { MessageId, type DataPayload } from "@rtc/packages";
import { useChat } from "..";

export function Chat() {
  const { chats, sendChat } = useChat();
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  // 새 메시지마다 맨 아래로 스크롤
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chats]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    sendChat(text);
    setText("");
  };

  return (
    <aside className="chat">
      <div className="chat-title">chat</div>

      <div className="chat-messages">
        {chats.map((m, i) => (
          <div key={i} className={`chat-msg ${m.self ? "self" : ""}`}>
            <span className="chat-from">{m.self ? "me" : m.from}</span>
            <span className="chat-body">{renderBody(m.payload)}</span>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <form className="chat-input" onSubmit={submit}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="메시지 입력…"
        />
        <button type="submit" disabled={!text.trim()}>
          보내기
        </button>
      </form>
    </aside>
  );
}

function renderBody(payload: DataPayload) {
  if (payload.messageId === MessageId.Chat) {
    return payload.message;
  }
  return (
    <img
      className="chat-image"
      src={`data:${payload.message.extension};base64,${payload.message.base64}`}
      alt="이미지"
    />
  );
}
