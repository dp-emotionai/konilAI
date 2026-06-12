"use client";

import { useEffect, useState } from "react";
import { getTeacherDashboardSessions } from "@/lib/api/teacher";

export type LiveSession = { id: string; title: string };

export function useTeacherLiveSession(role: "student" | "teacher" | "admin") {
  const [live, setLive] = useState<LiveSession | null>(null);

  useEffect(() => {
    if (role !== "teacher") {
      setLive(null);
      return;
    }
    let mounted = true;
    getTeacherDashboardSessions()
      .then((sessions) => {
        if (!mounted) return;
        const active = sessions.find((s) => s.status === "active");
        setLive(active ? { id: active.id, title: active.title } : null);
      })
      .catch(() => {
        if (mounted) setLive(null);
      });
    return () => {
      mounted = false;
    };
  }, [role]);

  return live;
}
