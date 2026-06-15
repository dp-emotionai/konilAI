import { useEffect, useMemo, useRef } from "react";

function playElement(element: HTMLMediaElement) {
  const playPromise = element.play();
  if (playPromise) {
    playPromise.catch(() => {
      // Browser can temporarily block autoplay. We retry on metadata/canplay
      // and after user interaction without breaking the session UI.
    });
  }
}

export function StreamVideo({
                              stream,
                              muted = true,
                              autoPlay = true,
                              playsInline = true,
                              ...props
                            }: { stream: MediaStream | null } & React.VideoHTMLAttributes<HTMLVideoElement>) {
  const videoRef = useRef<HTMLVideoElement>(null);

  const streamTrackKey = useMemo(() => {
    if (!stream) return "no-stream";

    return stream
        .getTracks()
        .map((track) => `${track.kind}:${track.id}:${track.readyState}:${track.enabled ? "1" : "0"}`)
        .sort()
        .join("|");
  }, [stream]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.autoplay = Boolean(autoPlay);
    video.playsInline = Boolean(playsInline);
    video.muted = Boolean(muted);

    if (!stream) {
      video.pause();
      video.srcObject = null;
      return;
    }

    // Force re-attach. Some browsers keep the old rendering pipeline when the
    // same MediaStream is moved from a thumbnail video to the main video, or
    // when a remote video track appears after an audio track in a group call.
    video.pause();
    video.srcObject = null;
    video.load();
    video.srcObject = stream;

    const tryPlay = () => playElement(video);
    const retryOnUserGesture = () => tryPlay();

    requestAnimationFrame(tryPlay);
    video.addEventListener("loadedmetadata", tryPlay);
    video.addEventListener("canplay", tryPlay);
    window.addEventListener("click", retryOnUserGesture, { once: true });
    window.addEventListener("touchstart", retryOnUserGesture, { once: true });

    return () => {
      video.removeEventListener("loadedmetadata", tryPlay);
      video.removeEventListener("canplay", tryPlay);
      window.removeEventListener("click", retryOnUserGesture);
      window.removeEventListener("touchstart", retryOnUserGesture);
    };
  }, [stream, streamTrackKey, muted, autoPlay, playsInline]);

  return (
      <video
          ref={videoRef}
          muted={muted}
          autoPlay={autoPlay}
          playsInline={playsInline}
          {...props}
      />
  );
}

export function StreamAudio({ stream }: { stream: MediaStream | null }) {
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!stream) {
      audio.pause();
      audio.srcObject = null;
      return;
    }

    if (audio.srcObject !== stream) {
      audio.srcObject = stream;
    }

    const tryPlay = () => playElement(audio);
    const retryOnUserGesture = () => tryPlay();

    tryPlay();
    audio.addEventListener("loadedmetadata", tryPlay);
    audio.addEventListener("canplay", tryPlay);
    window.addEventListener("click", retryOnUserGesture, { once: true });
    window.addEventListener("touchstart", retryOnUserGesture, { once: true });

    return () => {
      audio.removeEventListener("loadedmetadata", tryPlay);
      audio.removeEventListener("canplay", tryPlay);
      window.removeEventListener("click", retryOnUserGesture);
      window.removeEventListener("touchstart", retryOnUserGesture);
    };
  }, [stream]);

  return <audio ref={audioRef} autoPlay className="hidden" />;
}
