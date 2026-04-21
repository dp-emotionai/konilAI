"use client";

import { useEffect, useMemo, useState } from "react";

import { MaterialsStatusPage } from "@/components/resources/MaterialsStatusPage";
import { getTeacherAllSessions, getTeacherGroups, type GroupSession, type TeacherGroup } from "@/lib/api/teacher";
import { formatSessionDateTime } from "@/lib/utils/sessionCalendar";

function sessionStatusLabel(status: GroupSession["status"]) {
  if (status === "live") return "В эфире";
  if (status === "ended") return "Завершена";
  return "Запланирована";
}

function sessionHref(session: GroupSession) {
  return session.status === "ended"
    ? `/teacher/session/${session.id}/analytics`
    : `/teacher/session/${session.id}`;
}

export default function TeacherResourcesPage() {
  const [groups, setGroups] = useState<TeacherGroup[]>([]);
  const [sessions, setSessions] = useState<GroupSession[]>([]);

  useEffect(() => {
    getTeacherGroups().then(setGroups).catch(() => setGroups([]));
    getTeacherAllSessions().then(setSessions).catch(() => setSessions([]));
  }, []);

  const groupItems = useMemo(
    () =>
      groups.map((group) => ({
        id: group.id,
        name: group.name,
        subtitle:
          typeof group.sessionCount === "number"
            ? `Сессий: ${group.sessionCount}`
            : "Группа преподавателя",
        href: `/teacher/group/${group.id}`,
      })),
    [groups]
  );

  const sessionItems = useMemo(
    () =>
      sessions.map((session) => ({
        id: session.id,
        title: session.title,
        subtitle: session.startsAt
          ? formatSessionDateTime(session.startsAt)
          : session.groupName || "Время ещё не назначено",
        statusLabel: sessionStatusLabel(session.status),
        href: sessionHref(session),
      })),
    [sessions]
  );

  return (
    <MaterialsStatusPage
      title="Материалы"
      description="Здесь преподаватель должен загружать и раздавать файлы по группам и занятиям. На текущем backend такой контракт не подтверждён, поэтому страница показывает реальные группы и сессии, но не имитирует фальшивый upload."
      roleLabel="Ваши"
      backendNotice="Чтобы материалы стали полноценной рабочей функцией, нужен реальный backend для upload/list/download и привязки файлов к группам или сессиям. Пока этого контракта нет, фронтенд не выдумывает фейковые файлы и показывает только реальные сущности, к которым материалы должны быть привязаны."
      groups={groupItems}
      sessions={sessionItems}
    />
  );
}
