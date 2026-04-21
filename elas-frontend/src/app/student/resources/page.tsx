"use client";

import { useEffect, useMemo, useState } from "react";

import { MaterialsStatusPage } from "@/components/resources/MaterialsStatusPage";
import { getStudentGroups, getStudentSessionsList, type StudentGroupRow, type StudentSessionRow } from "@/lib/api/student";
import { formatSessionDateTime } from "@/lib/utils/sessionCalendar";

function sessionStatusLabel(status: StudentSessionRow["status"]) {
  if (status === "live") return "В эфире";
  if (status === "ended") return "Завершена";
  return "Запланирована";
}

export default function StudentResourcesPage() {
  const [groups, setGroups] = useState<StudentGroupRow[]>([]);
  const [sessions, setSessions] = useState<StudentSessionRow[]>([]);

  useEffect(() => {
    getStudentGroups().then(setGroups).catch(() => setGroups([]));
    getStudentSessionsList().then(setSessions).catch(() => setSessions([]));
  }, []);

  const groupItems = useMemo(
    () =>
      groups.map((group) => ({
        id: group.id,
        name: group.name,
        subtitle: group.teacherFullName
          ? `Преподаватель: ${group.teacherFullName}`
          : "Преподаватель не указан",
        href: `/student/group/${group.id}`,
      })),
    [groups]
  );

  const sessionItems = useMemo(
    () =>
      sessions.map((session) => ({
        id: session.id,
        title: session.title,
        subtitle: session.scheduledAt
          ? formatSessionDateTime(session.scheduledAt)
          : session.teacher || "Дата ещё не назначена",
        statusLabel: sessionStatusLabel(session.status),
        href: `/student/session/${session.id}`,
      })),
    [sessions]
  );

  return (
    <MaterialsStatusPage
      title="Материалы"
      description="Здесь будут отображаться учебные файлы преподавателей, привязанные к вашим группам и сессиям. Сейчас показываем реальные группы и занятия, но сам backend для материалов ещё не подключён."
      roleLabel="Ваши"
      backendNotice="Во фронтенде нет подтверждённого API для загрузки, хранения и раздачи материалов. Поэтому страница больше не притворяется готовым файловым хабом: она честно показывает доступные группы и занятия, к которым материалы должны быть привязаны после подключения backend."
      groups={groupItems}
      sessions={sessionItems}
    />
  );
}
