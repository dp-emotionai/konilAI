"use client";

import { MicOff, Pin, VideoOff } from "lucide-react";

import { cn } from "@/lib/cn";
import { StreamVideo } from "@/components/session/StreamVideo";

function getInitials(name: string) {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length === 0) return "?";
  return parts.map((part) => part[0]?.toUpperCase()).join("");
}

export function ZoomVideoTile({
  stream,
  name,
  isLocal = false,
  videoEnabled = true,
  audioEnabled = true,
  selected = false,
  compact = false,
  mirror = isLocal,
  onClick,
}: {
  stream: MediaStream | null;
  name: string;
  isLocal?: boolean;
  videoEnabled?: boolean;
  audioEnabled?: boolean;
  selected?: boolean;
  compact?: boolean;
  mirror?: boolean;
  onClick?: () => void;
}) {
  const showVideo = Boolean(
    stream &&
      videoEnabled &&
      stream.getVideoTracks().some((track) => track.readyState === "live" && track.enabled)
  );

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative h-full min-h-0 w-full overflow-hidden rounded-xl bg-[#242424] text-left outline-none transition",
        selected
          ? "ring-2 ring-[#2D8CFF] ring-offset-2 ring-offset-[#111111]"
          : "ring-1 ring-white/10 hover:ring-white/30",
        onClick && "cursor-pointer",
        compact && "rounded-lg"
      )}
    >
      {showVideo ? (
        <StreamVideo
          stream={stream}
          autoPlay
          playsInline
          muted={isLocal}
          className={cn(
            "h-full w-full object-cover",
            mirror && "scale-x-[-1]"
          )}
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[radial-gradient(circle_at_top,#333_0%,#1b1b1b_70%)]">
          <div
            className={cn(
              "flex items-center justify-center rounded-full bg-[#3d3d3d] font-semibold text-white shadow-2xl",
              compact ? "h-12 w-12 text-base" : "h-20 w-20 text-2xl sm:h-24 sm:w-24 sm:text-3xl"
            )}
          >
            {getInitials(name)}
          </div>
          <VideoOff className="mt-4 text-white/35" size={compact ? 15 : 20} />
        </div>
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/75 to-transparent" />

      {selected && (
        <div className="absolute left-2 top-2 flex items-center gap-1 rounded-md bg-[#2D8CFF] px-2 py-1 text-[10px] font-semibold text-white shadow-lg">
          <Pin size={11} fill="currentColor" />
          Закреплено
        </div>
      )}

      <div className="absolute bottom-2 left-2 right-2 flex items-end justify-between gap-2">
        <div className="min-w-0 rounded-md bg-black/55 px-2 py-1 text-[11px] font-medium text-white backdrop-blur-sm sm:text-xs">
          <span className="block truncate">{name}{isLocal ? " (Вы)" : ""}</span>
        </div>

        {!audioEnabled && (
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#E02828] text-white shadow-lg">
            <MicOff size={14} />
          </div>
        )}
      </div>
    </button>
  );
}
