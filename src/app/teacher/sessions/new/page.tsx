"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PageHero from "@/components/common/PageHero";
import Reveal from "@/components/common/Reveal";
import { Card } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import {
  getTeacherGroups,
  createSession,
  type TeacherGroup,
} from "@/lib/api/teacher";
import { hasAuth, getApiBaseUrl } from "@/lib/api/client";
import { useToast } from "@/components/ui/Toast";

export default function TeacherCreateSessionPage() {
  const router = useRouter();
  const toast = useToast();

  const [type, setType] = useState<"lecture" | "exam">("lecture");
  const [title, setTitle] = useState("");
  const [groupId, setGroupId] = useState("");
  const [groups, setGroups] = useState<TeacherGroup[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<{
    id: string;
    code: string;
    title: string;
  } | null>(null);

  const apiAvailable = Boolean(getApiBaseUrl() && hasAuth());

  useEffect(() => {
    let mounted = true;

    setGroupsLoading(true);
    getTeacherGroups()
      .then((list) => {
        if (!mounted) return;

        setGroups(list);
        setGroupId((prev) => {
          if (!list.length) return "";
          if (prev && list.some((g) => g.id === prev)) return prev;
          return list[0].id;
        });
      })
      .finally(() => {
        if (mounted) setGroupsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [apiAvailable]);

  const handleCreate = async () => {
    setError("");
    const trimmedTitle = title.trim();

    if (!trimmedTitle) {
      setError("Введите название сессии.");
      return;
    }

    if (!groupId && apiAvailable) {
      setError(
        "Выберите группу. Если групп пока нет — сначала создайте группу в разделе «Группы»."
      );
      return;
    }

    if (!apiAvailable) {
      setError(
        "Сервер недоступен. Настройте backend и выполните вход, чтобы создавать сессии."
      );
      return;
    }

    if (apiAvailable && !groups.some((g) => g.id === groupId)) {
      setError("Выбранная группа больше недоступна. Обновите страницу и выберите группу заново.");
      return;
    }

    setCreating(true);
    try {
      const res = await createSession({
        title: trimmedTitle,
        type,
        groupId,
      });

      setCreated({ id: res.id, code: res.code, title: res.title });
      toast.push({
        type: "success",
        title: "Сессия создана",
        text: `Код: ${res.code}. Студенты увидят её в списке.`,
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Ошибка создания сессии."
      );
    } finally {
      setCreating(false);
    }
  };

  const joinLink =
    typeof window !== "undefined" && created
      ? `${window.location.origin}/student/session/${created.id}`
      : "";

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: "Преподаватель", href: "/teacher/dashboard" },
          { label: "Сессии", href: "/teacher/sessions" },
          { label: "Новая сессия" },
        ]}
      />

      <PageHero
        overline="Преподаватель"
        title="Создать сессию"
        subtitle="Лекция или экзамен. После создания сессия появится у студентов; затем запустите её, чтобы они могли подключиться."
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Reveal className="lg:col-span-2">
          <Card className="p-6 md:p-7">
            <div className="text-sm text-muted">Параметры сессии</div>
            <div className="mt-2 text-lg font-semibold">Основное</div>

            {!apiAvailable && (
              <div className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-700">
                Для создания сессий нужен запущенный backend и вход в аккаунт преподавателя.
              </div>
            )}

            {apiAvailable && groupsLoading && (
              <div className="mt-4 h-10 animate-pulse rounded-2xl bg-surface-subtle" />
            )}

            {apiAvailable && !groupsLoading && groups.length === 0 && (
              <div className="mt-4 rounded-2xl border border-[color:var(--border)] bg-black/25 p-4">
                <p className="text-sm text-muted">Сначала создайте группу.</p>
                <Link
                  href="/teacher/groups"
                  className="mt-2 inline-block text-sm font-medium text-purple-300 hover:text-purple-200"
                >
                  Перейти в «Группы» →
                </Link>
              </div>
            )}

            {apiAvailable && !groupsLoading && groups.length > 0 && (
              <>
                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm text-muted">Тип</label>
                    <select
                      value={type}
                      onChange={(e) =>
                        setType(e.target.value as "lecture" | "exam")
                      }
                      className="h-11 w-full rounded-2xl border border-[color:var(--border)] bg-surface-subtle/80 px-4 text-muted outline-none focus:ring-2 focus:ring-purple-500/40"
                    >
                      <option value="lecture">Лекция</option>
                      <option value="exam">Экзамен</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm text-muted">Группа</label>
                    <select
                      value={groupId}
                      onChange={(e) => setGroupId(e.target.value)}
                      className="h-11 w-full rounded-2xl border border-[color:var(--border)] bg-surface-subtle/80 px-4 text-muted outline-none focus:ring-2 focus:ring-purple-500/40"
                    >
                      {groups.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="mb-2 block text-sm text-muted">
                      Название
                    </label>
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Например: Введение в React"
                    />
                  </div>
                </div>

                {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

                <div className="mt-5 flex flex-wrap gap-2">
                  <Button onClick={handleCreate} disabled={creating}>
                    {creating ? "Создание…" : "Создать сессию"}
                  </Button>

                  <Link href="/teacher/sessions">
                    <Button variant="outline">К списку сессий</Button>
                  </Link>
                </div>
              </>
            )}

            {!apiAvailable && (
              <div className="mt-5 rounded-2xl border border-[color:var(--border)] bg-black/25 p-4 text-sm text-muted">
                В демо-режиме создание сессий недоступно. Запустите backend и войдите
                в аккаунт преподавателя.
              </div>
            )}
          </Card>
        </Reveal>

        <Reveal>
          <Card className="p-6 md:p-7">
            <div className="text-sm text-muted">Поделиться</div>
            <div className="mt-2 text-lg font-semibold">
              Код и ссылка для студентов
            </div>

            {!created ? (
              <div className="mt-4 rounded-2xl border border-[color:var(--border)] bg-black/25 p-4 text-sm text-muted">
                Создайте сессию — здесь появятся код и ссылка. Студенты увидят
                сессию в своём списке и смогут войти по ссылке или по коду.
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                <div className="rounded-2xl border border-[color:var(--border)] bg-black/25 p-4">
                  <div className="text-sm text-muted">Код сессии</div>
                  <div className="mt-2 text-2xl font-semibold tracking-widest">
                    {created.code}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-3"
                    onClick={() => navigator.clipboard.writeText(created.code)}
                  >
                    Копировать код
                  </Button>
                </div>

                <div className="rounded-2xl border border-[color:var(--border)] bg-black/25 p-4">
                  <div className="text-sm text-muted">Ссылка для входа</div>
                  <div className="mt-2 break-all text-sm text-muted">
                    {joinLink}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-3"
                    onClick={() => navigator.clipboard.writeText(joinLink)}
                  >
                    Копировать ссылку
                  </Button>
                </div>

                <div className="rounded-2xl border border-[color:var(--border)] bg-gradient-to-br from-purple-500/15 to-transparent p-4">
                  <div className="text-sm text-muted">Запустить сессию</div>
                  <p className="mt-2 text-sm text-muted">
                    Откройте сессию и нажмите «Старт» — тогда студенты смогут нажать
                    «Подключиться».
                  </p>
                  <Button
                    className="mt-3 w-full"
                    onClick={() => router.push(`/teacher/session/${created.id}`)}
                  >
                    Открыть сессию и запустить
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </Reveal>
      </div>
    </div>
  );
}