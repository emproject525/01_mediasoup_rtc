export async function getUserStream() {
  const devices = await navigator.mediaDevices.enumerateDevices();
  const hasAudio = devices.filter((d) => d.kind === "audioinput").length > 0;
  const hasVideo = devices.filter((d) => d.kind === "videoinput").length > 0;

  return await navigator.mediaDevices.getUserMedia({
    audio: hasAudio,
    video: hasVideo,
  });
}
