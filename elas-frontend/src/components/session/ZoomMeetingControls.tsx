"use client";

import {
  ChevronUp,
  Maximize2,
  MessageSquare,
  Mic,
  MicOff,
  Minimize2,
  MonitorUp,
  MoreHorizontal,
  PhoneOff,
  Users,
  Video,
  VideoOff,
} from "lucide-react";

import { cn } from "@/lib/cn";

function Control({
  label,
  icon,
  active = false,
  danger = false,
  disabled = false,
  onClick,
  badge,
  menuHint = false,
}: {
  label: string;
  icon: React.ReactNode;
  active?: boolean;
  danger?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  badge?: number;
  menuHint?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "group relative flex min-w-[62px] flex-col items-center justify-center gap-1 rounded-lg px-2 py-2 text-white transition hover:bg-white/10",
        active && "text-[#62A9FF]",
        danger && "bg-[#E02828] px-5 hover:bg-[#c92222]",
        disabled && "cursor-not-allowed opacity-40"
      )}
    >
      <span className="relative flex h-6 items-center justify-center">
        {icon}
        {badge !== undefined && badge > 0 && (
          <span className="absolute -right-3 -top-2 min-w-5 rounded-full bg-[#E02828] px-1.5 py-0.5 text-center text-[9px] font-bold leading-none text-white">
            {badge > 99 ? "99+" : badge}
          </span>
        )}
        {menuHint && (
          <ChevronUp className="absolute -right-4 top-0 text-white/60" size={12} />
        )}
      </span>
      <span className="max-w-[92px] truncate text-[10px] font-medium sm:text-[11px]">{label}</span>
    </button>
  );
}

export function ZoomMeetingControls({
  isMicEnabled,
  isCameraEnabled,
  isScreenSharing,
  isFullscreen,
  participantsCount,
  chatActive = false,
  participantsActive = false,
  onToggleMic,
  onToggleCamera,
  onToggleScreenShare,
  onToggleChat,
  onToggleParticipants,
  onToggleFullscreen,
  onMore,
  onLeave,
  leaveLabel = "Выйти",
  cameraDisabled = false,
}: {
  isMicEnabled: boolean;
  isCameraEnabled: boolean;
  isScreenSharing: boolean;
  isFullscreen: boolean;
  participantsCount: number;
  chatActive?: boolean;
  participantsActive?: boolean;
  onToggleMic: () => void;
  onToggleCamera: () => void;
  onToggleScreenShare: () => void;
  onToggleChat: () => void;
  onToggleParticipants: () => void;
  onToggleFullscreen: () => void;
  onMore?: () => void;
  onLeave: () => void;
  leaveLabel?: string;
  cameraDisabled?: boolean;
}) {
  return (
    <div className="flex w-full items-center gap-2 border-t border-white/10 bg-[#1c1c1c] px-2 py-1.5 shadow-[0_-8px_25px_rgba(0,0,0,0.18)] sm:px-4">
      <div className="flex min-w-0 items-center">
        <Control
          label={isMicEnabled ? "Выключить звук" : "Включить звук"}
          icon={isMicEnabled ? <Mic size={21} /> : <MicOff size={21} />}
          active={!isMicEnabled}
          onClick={onToggleMic}
          menuHint
        />
        <Control
          label={isCameraEnabled ? "Остановить видео" : "Включить видео"}
          icon={isCameraEnabled ? <Video size={21} /> : <VideoOff size={21} />}
          active={!isCameraEnabled}
          disabled={cameraDisabled}
          onClick={onToggleCamera}
          menuHint
        />
      </div>

      <div className="flex min-w-0 flex-1 items-center justify-start overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:justify-center">
        <Control
          label="Участники"
          icon={<Users size={21} />}
          badge={participantsCount}
          active={participantsActive}
          onClick={onToggleParticipants}
        />
        <Control
          label="Чат"
          icon={<MessageSquare size={21} />}
          active={chatActive}
          onClick={onToggleChat}
        />
        <Control
          label={isScreenSharing ? "Остановить показ" : "Демонстрация"}
          icon={<MonitorUp size={21} />}
          active={isScreenSharing}
          onClick={onToggleScreenShare}
        />
        <Control
          label={isFullscreen ? "Выйти из полного" : "Полный экран"}
          icon={isFullscreen ? <Minimize2 size={21} /> : <Maximize2 size={21} />}
          active={isFullscreen}
          onClick={onToggleFullscreen}
        />
        <Control
          label="Ещё"
          icon={<MoreHorizontal size={22} />}
          onClick={onMore}
        />
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <Control
          label={leaveLabel}
          icon={<PhoneOff size={21} fill="currentColor" />}
          danger
          onClick={onLeave}
        />
      </div>
    </div>
  );
}
