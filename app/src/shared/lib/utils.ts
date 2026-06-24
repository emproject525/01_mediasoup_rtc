export async function getUserStream() {
  const devices = await navigator.mediaDevices.enumerateDevices();
  const hasAudio = devices.filter((d) => d.kind === "audioinput").length > 0;
  const hasVideo = devices.filter((d) => d.kind === "videoinput").length > 0;

  return await navigator.mediaDevices.getUserMedia({
    audio: hasAudio,
    video: hasVideo,
  });
}

/**
 * 지정된 시간이 지나기 전에 다시 호출되면 이전 타이머를 취소하고
 * 마지막 호출만 실행하는 디바운스 함수입니다.
 * @param callback 실행할 메인 함수
 * @param delay 대기 시간 (밀리초, ms)
 * @returns 디바운스가 적용된 새로운 함수
 */
export function debounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
): (...args: Parameters<T>) => void {
  // 타이머 ID를 기억하기 위한 클로저 변수
  let timerId: ReturnType<typeof setTimeout> | null = null;

  return function (...args: Parameters<T>): void {
    // 기존에 예약된 타이머가 있다면 취소 (이전 호출을 무시)
    if (timerId !== null) {
      clearTimeout(timerId);
    }

    // 새로운 타이머 예약
    timerId = setTimeout(() => {
      callback(...args);
      timerId = null; // 실행 후 타이머 초기화
    }, delay);
  };
}
