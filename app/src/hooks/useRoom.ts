import { useCallback, useRef, useState } from "react";
import { SignalingEvent } from "@rtc/packages";
import { createSocket, type AppSocket } from "../lib/socket.module";
import {
  MediaSoupClient,
  type RemoteStream,
} from "../lib/mediasoup.client.module";
import { SIGNALING_URL } from "../lib/config";

export type RoomStatus = "idle" | "connecting" | "joined" | "error";

export function useRoom() {
  const [status, setStatus] = useState<RoomStatus>("idle");
  const [peerId, setPeerId] = useState<string>();
  const [localStream, setLocalStream] = useState<MediaStream>();
  const [remotes, setRemotes] = useState<RemoteStream[]>([]);
  const [logs, setLogs] = useState<string[]>([]);

  const socketRef = useRef<AppSocket>(null);
  const clientRef = useRef<MediaSoupClient>(null);
  const localStreamRef = useRef<MediaStream>(null);

  const log = useCallback((msg: string) => {
    setLogs((prev) => [...prev, msg]);
  }, []);

  const getUserStream = useCallback(async () => {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const hasAudio = devices.filter((d) => d.kind === "audioinput").length > 0;
    const hasVideo = devices.filter((d) => d.kind === "videoinput").length > 0;

    return await navigator.mediaDevices.getUserMedia({
      audio: hasAudio,
      video: hasVideo,
    });
  }, []);

  const join = useCallback(
    async (roomId: string) => {
      if (status === "connecting" || status === "joined") return;
      try {
        setStatus("connecting");
        log(`Connecting to ${SIGNALING_URL} ...`);

        const socket = createSocket(SIGNALING_URL);
        socketRef.current = socket;
        socket.connect();

        const client = new MediaSoupClient(socket, roomId);
        client.onConnectionStateChanged(({ direction, state }) =>
          log(`[${direction.toUpperCase()}] Transport State is ${state}`)
        );
        client.onLog((message) => log(message));
        clientRef.current = client;

        // 입장 전에 리스너 등록 — 알림을 놓치지 않도록
        socket.on(SignalingEvent.EventPeerJoined, ({ peerId }) => {
          log(`Peer Joined: ${peerId}`);
        });
        socket.on(
          SignalingEvent.EventProducerNew,
          async ({ producerId, peerId, kind }) => {
            log(`NEW Producer: ${kind} from ${peerId}`);
            const remote = await client.consume(producerId, peerId);
            if (remote) setRemotes((prev) => [...prev, remote]);
          }
        );
        socket.on(SignalingEvent.EventProducerClosed, ({ producerId }) => {
          log(`Producer Closed: ${producerId}`);
          client.removeByProducerId(producerId);
          setRemotes((prev) => prev.filter((r) => r.producerId !== producerId));
        });

        const { peerId, producers } = await client.join();
        setPeerId(peerId);
        log(`Joined Room "${roomId}" as ${peerId}`);

        // 로컬 미디어 송출
        const stream = await getUserStream();
        localStreamRef.current = stream;
        setLocalStream(stream);
        for (const track of stream.getTracks()) {
          const producer = await client.produce(track);
          if (producer) log(`Producing ${track.kind} ...`);
        }

        // 기존 producer 수신
        for (const p of producers) {
          const remote = await client.consume(p.producerId, p.peerId);
          if (remote) setRemotes((prev) => [...prev, remote]);
        }

        setStatus("joined");
      } catch (error) {
        setStatus("error");
        log(`Error: ${error instanceof Error ? error.message : String(error)}`);
      }
    },
    [status, log]
  );

  const leave = useCallback(() => {
    clientRef.current?.close();
    socketRef.current?.disconnect();
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    clientRef.current = null;
    socketRef.current = null;
    localStreamRef.current = null;
    setRemotes([]);
    setLocalStream(undefined);
    setPeerId(undefined);
    setStatus("idle");
    log("left room");
  }, [log]);

  return { status, peerId, localStream, remotes, logs, join, leave };
}
