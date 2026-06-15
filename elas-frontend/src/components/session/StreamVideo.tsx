import { useEffect, useRef } from "react";

export function StreamVideo({
                              stream,
                              muted,
                              autoPlay = true,
                              playsInline = true,
                              ...props
                            }: { stream: MediaStream | null } & React.VideoHTMLAttributes<HTMLVideoElement>) {
  const videoRef = useRef<HTMLVideoElement>(null);

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

    if (video.srcObject !== stream) {
      video.srcObject = stream;
    }

    const tryPlay = () => {
      const playPromise = video.play();
      if (playPromise) {
        playPromise.catch(() => {
          // Browser can temporarily block autoplay. The next metadata/canplay event
          // or user click will retry, so do not break the video tile.
        });
      }
    };

    tryPlay();
    video.addEventListener("loadedmetadata", tryPlay);
    video.addEventListener("canplay", tryPlay);

    return () => {
      video.removeEventListener("loadedmetadata", tryPlay);
      video.removeEventListener("canplay", tryPlay);
    };
  }, [stream, muted, autoPlay, playsInline]);

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
