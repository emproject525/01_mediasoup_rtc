import 'dotenv/config';

export const config = {
  signalingPort: Number(process.env.MEDIASOUP_SIGNALING_PORT ?? 4000),
  listenIp: process.env.MEDIASOUP_LISTEN_IP ?? '0.0.0.0',
  announcedIp: process.env.MEDIASOUP_ANNOUNCED_IP ?? '127.0.0.1'
};
