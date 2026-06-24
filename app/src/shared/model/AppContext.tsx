import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  AppSocket,
  createSocket,
  getUserStream,
  MediaSoupClient,
  SIGNALING_URL,
} from "../lib";
import { useLog } from "./LogContext";
import { SignalingEvent } from "@rtc/packages";
import { MediaKind } from "mediasoup-client/types";

interface AppContextType {
  socket: AppSocket;
  myPeerId: string | null;
  room: MediaSoupClient | null;
  roomStatus: "idle" | "connecting" | "joined" | "error";
  joinRoom(roomId: string): Promise<void>;
  leaveRoom(): void;
  remotes: {
    producerId: string;
    consumerId: string;
    peerId: string;
    kind: "audio" | "video";
    track: MediaStreamTrack;
  }[];
  local:
    | {
        kind: "audio" | "video";
        track: MediaStreamTrack;
        producerId: string;
        pause: boolean;
      }[]
    | null;
  togglePause(producerId: string): void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppContextProvider({ children }: { children?: ReactNode }) {
  const { addLog } = useLog();

  const socket = useMemo(() => createSocket(SIGNALING_URL), []);
  useEffect(() => {
    socket.connect();
    return () => {
      socket.close();
      socket.off();
    };
  }, [socket]);

  const [myPeerId, setMyPeerId] = useState<AppContextType["myPeerId"]>(null);
  const [room, setRoom] = useState<AppContextType["room"]>(null);
  const [roomStatus, setRoomStatus] =
    useState<AppContextType["roomStatus"]>("idle");
  const [remotes, setRemotes] = useState<AppContextType["remotes"]>([]);
  const [local, setLocal] = useState<AppContextType["local"]>(null);

  const consume = useCallback(
    async (client: MediaSoupClient, producerId: string, peerId: string) => {
      const remote = await client.consume(producerId, peerId);
      if (remote) setRemotes((p) => [...p, remote]);
    },
    [],
  );

  const togglePause = useCallback(
    async (producerId: string) => {
      const idx = local?.findIndex((l) => l.producerId === producerId) ?? -1;
      if (idx < 0) return;

      const producer = local![idx];
      const next = !producer.pause;
      await room?.pause(producerId, next);
      setLocal((prev) => {
        const copied = [...prev!];
        copied.splice(idx, 1, { ...producer, pause: next });
        return copied;
      });
    },
    [local, room],
  );

  const joinRoom = useCallback(
    async (roomId: string) => {
      if (roomStatus === "connecting" || roomStatus === "joined") return;
      try {
        setRoomStatus("connecting");
        addLog(`connecting to ${SIGNALING_URL} ...`);

        const client = new MediaSoupClient(socket, roomId);
        client.onConnectionStateChanged(({ direction, state }) =>
          addLog(`[${direction}] transport state is ${state}`),
        );
        setRoom(client);

        socket
          .on(SignalingEvent.EventPeerJoined, ({ peerId }) => {
            addLog(`peer joined: ${peerId}`);
          })
          .on(
            SignalingEvent.EventProducerNew,
            async ({ producerId, peerId, kind }) => {
              addLog(`new producer: ${kind} from ${peerId}`);
              await consume(client, producerId, peerId);
            },
          )
          .on(
            SignalingEvent.EventDataProducerNew,
            async ({ peerId, dataProducerId }) => {
              addLog(`new data producer: ${peerId}`);
              await client.consumeData(dataProducerId, peerId);
            },
          )
          .on(SignalingEvent.EventProducerClosed, ({ producerId }) => {
            addLog(`producer closed: ${producerId}`);
            client.removeByProducerId(producerId);
            setRemotes((p) => p.filter((r) => r.producerId !== producerId));
          });

        const { peerId, producers, dataProducers } = await client.join();
        setMyPeerId(peerId);
        addLog(`joined room "${roomId} as ${peerId}`);

        // ==========================================
        // 로컬 미디어 송출
        // ==========================================
        const tracks = (await getUserStream()).getTracks();
        const response = await Promise.all(
          tracks.map(async (track) => {
            const producer = await client.produce(track);
            addLog(`start producing ${track.kind} ...`);
            return { track, producer };
          }),
        );
        setLocal(
          response
            .filter(({ producer }) => !!producer)
            .map(({ track, producer }) => ({
              kind: track.kind as MediaKind,
              producerId: producer!.id,
              track,
              pause: false,
            })),
        );

        // ==========================================
        // 기본 producer 수신
        // ==========================================
        for (const p of producers) {
          await consume(client, p.producerId, p.peerId);
        }

        // ==========================================
        // 기본 data producer 수신
        // ==========================================
        for (const p of dataProducers) {
          await client.consumeData(p.dataProducerId, peerId);
        }

        setRoomStatus("joined");
      } catch (error) {
        addLog(
          `joined error: ${error instanceof Error ? error.message : String(error)}`,
        );
        setRoomStatus("error");
      }
    },
    [socket, roomStatus, addLog, consume],
  );

  const leaveRoom = useCallback(async () => {
    try {
      await room?.leave();
    } finally {
      socket.off();
      room?.close();

      local?.forEach((l) => {
        l.track.stop();
      });
      setLocal([]);
      setRemotes([]);
      setMyPeerId(null);

      setRoomStatus("idle");
      addLog(`left room`);
    }
  }, [socket, room, local, addLog]);

  return (
    <AppContext.Provider
      value={{
        socket,
        myPeerId,
        room,
        roomStatus,
        joinRoom,
        leaveRoom,
        remotes,
        local,
        togglePause,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === null) {
    throw new Error("useApp::NoProvider");
  }
  return context;
}
