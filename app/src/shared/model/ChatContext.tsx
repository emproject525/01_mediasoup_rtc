import { DataPayload, MessageId } from "@rtc/packages";
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useLog } from "./LogContext";
import { useApp } from "./AppContext";

interface ChatContextType {
  chats: { from: string; self: boolean; payload: DataPayload }[];
  sendChat(text: string): void;
}

const ChatContext = createContext<ChatContextType | null>(null);

export function ChatContextProvider({ children }: { children?: ReactNode }) {
  const { addLog } = useLog();
  const { room, myPeerId } = useApp();

  const [chats, setChats] = useState<ChatContextType["chats"]>([]);

  const sendChat = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      const payload: DataPayload = {
        messageId: MessageId.Chat,
        message: trimmed,
      };

      room?.sendChat(payload);
      addLog(`[chat] send`);

      // 본인 메시지는 SFU가 되돌려주지 않으므로 로컬에 직접 추가
      setChats((p) => [...p, { from: myPeerId ?? "me", self: true, payload }]);
    },
    [myPeerId, room],
  );

  useEffect(() => {
    setChats([]);
    if (!room) return;

    const unsubscribe = room.onData(({ peerId, payload }) => {
      addLog(`[chat] recv`);
      setChats((prev) => [...prev, { from: peerId, self: false, payload }]);
    });

    return () => {
      unsubscribe();
    };
  }, [room]);

  return (
    <ChatContext.Provider value={{ chats, sendChat }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (context === null) {
    throw new Error("useChat::NoProvider");
  }
  return context;
}
