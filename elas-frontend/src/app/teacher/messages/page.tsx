"use client";

import { useCallback, useEffect, useState } from "react";

import { GroupMessagesWorkspace, type WorkspaceGroupItem } from "@/components/messages/GroupMessagesWorkspace";
import { getGroupById, getTeacherGroups } from "@/lib/api/teacher";
import type { GroupMessage } from "@/lib/api/teacher";

export default function TeacherMessagesPage() {
  const [groups, setGroups] = useState<WorkspaceGroupItem[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(true);

  useEffect(() => {
    getTeacherGroups()
      .then((list) => {
        setGroups(
          list.map((group) => ({
            id: group.id,
            name: group.name,
            subtitle:
              typeof group.sessionCount === "number"
                ? `Сессий: ${group.sessionCount}`
                : "Группа преподавателя",
          }))
        );
      })
      .catch(() => setGroups([]))
      .finally(() => setLoadingGroups(false));
  }, []);

  const loadParticipantMap = useCallback(async (groupId: string) => {
    const detail = await getGroupById(groupId);
    if (!detail) return {};

    const participantMap: Record<string, string> = {};
    if (detail.group.teacher?.id) {
      participantMap[detail.group.teacher.id] =
        detail.group.teacher.fullName?.trim() || detail.group.teacher.email;
    }

    for (const student of detail.group.students ?? []) {
      if (student.id) {
        participantMap[student.id] =
          student.fullName?.trim() || student.email?.trim() || "Студент";
      }
    }

    return participantMap;
  }, []);

  const resolveSenderName = useCallback(
    (
      _group: WorkspaceGroupItem,
      message: GroupMessage,
      participants: Record<string, string>
    ) => {
      if (message.senderId && participants[message.senderId]) {
        return participants[message.senderId];
      }

      if (message.type === "announcement") {
        return "Преподаватель";
      }

      return "Участник группы";
    },
    []
  );

  return (
    <GroupMessagesWorkspace
      role="teacher"
      title="Сообщения"
      description="Рабочее пространство по группам: объявления для студентов и чат по каждой группе."
      groups={groups}
      loadingGroups={loadingGroups}
      loadParticipantMap={loadParticipantMap}
      resolveSenderName={resolveSenderName}
      emptyGroupsTitle="У вас пока нет групп"
      emptyGroupsDescription="Создайте группу или дождитесь привязки студентов, чтобы начать переписку."
    />
  );
}
