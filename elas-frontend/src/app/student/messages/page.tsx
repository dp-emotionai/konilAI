"use client";

import { useCallback, useEffect, useState } from "react";

import { GroupMessagesWorkspace, type WorkspaceGroupItem } from "@/components/messages/GroupMessagesWorkspace";
import { getStudentGroupDetail, getStudentGroups } from "@/lib/api/student";
import type { GroupMessage } from "@/lib/api/teacher";

export default function StudentMessagesPage() {
  const [groups, setGroups] = useState<WorkspaceGroupItem[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(true);

  useEffect(() => {
    getStudentGroups()
      .then((list) => {
        setGroups(
          list.map((group) => ({
            id: group.id,
            name: group.name,
            subtitle: group.teacherFullName
              ? `Преподаватель: ${group.teacherFullName}`
              : "Группа без указанного преподавателя",
            teacherName: group.teacherFullName || null,
          }))
        );
      })
      .catch(() => setGroups([]))
      .finally(() => setLoadingGroups(false));
  }, []);

  const loadParticipantMap = useCallback(async (groupId: string) => {
    const detail = await getStudentGroupDetail(groupId);
    if (!detail) return {};

    const participantMap: Record<string, string> = {};
    for (const member of detail.members ?? []) {
      if (member.id) {
        participantMap[member.id] = member.fullName?.trim() || member.email;
      }
    }

    return participantMap;
  }, []);

  const resolveSenderName = useCallback(
    (
      group: WorkspaceGroupItem,
      message: GroupMessage,
      participants: Record<string, string>
    ) => {
      if (message.senderId && participants[message.senderId]) {
        return participants[message.senderId];
      }

      if (message.type === "announcement") {
        return group.teacherName?.trim() || "Преподаватель";
      }

      return group.teacherName?.trim() || "Участник группы";
    },
    []
  );

  return (
    <GroupMessagesWorkspace
      role="student"
      title="Сообщения"
      description="Переписка по группам, объявления преподавателя и общий чат без перехода в live-сессию."
      groups={groups}
      loadingGroups={loadingGroups}
      loadParticipantMap={loadParticipantMap}
      resolveSenderName={resolveSenderName}
      emptyGroupsTitle="У вас пока нет доступных групп"
      emptyGroupsDescription="Когда преподаватель добавит вас в группу, здесь появятся сообщения и объявления."
    />
  );
}
