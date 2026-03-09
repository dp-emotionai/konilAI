"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import Breadcrumbs from "@/components/layout/Breadcrumbs";
import PageHero from "@/components/common/PageHero";
import Section from "@/components/common/Section";
import EmptyState from "@/components/common/EmptyState";
import { Card, CardContent } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Skeleton from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";

import { useUI } from "@/components/layout/Providers";
import { cn } from "@/lib/cn";
import {
  api,
  clearAuth,
  getStoredAuth,
  hasAuth,
  isApiAvailable,
} from "@/lib/api/client";

import {
  Copy,
  ShieldCheck,
  Camera,
  Wifi,
  KeyRound,
  LogOut,
  CheckCircle2,
  AlertTriangle,
  Info,
  Settings,
  FileText,
  Users,
  BarChart3,
  Database,
} from "lucide-react";

type Role = "student" | "teacher" | "admin";

type MeRes = {
  id: string;
  email: string;
  role: Role;
  name?: string | null;
  status?: string | null;
};

type PermissionStateLite = "granted" | "denied" | "prompt" | "unsupported";

function safeInitial(email?: string | null, name?: string | null) {
  const source = (name?.trim() || email?.trim() || "U").trim();
  return source.slice(0, 1).toUpperCase();
}

async function copyToClipboard(text: string) {
  await navigator.clipboard.writeText(text);
}

function roleLabel(role?: Role) {
  if (role === "teacher") return "Преподаватель";
  if (role === "admin") return "Администратор";
  return "Студент";
}

function statusLabel(status?: string | null) {
  if (!status) return null;
  const s = status.toLowerCase();
  if (s === "approved") return "Подтверждённый доступ";
  if (s === "pending") return "Ожидает одобрения";
  if (s === "limited") return "Ограниченный доступ";
  if (s === "blocked") return "Аккаунт заблокирован";
  return null;
}

function PermissionPill({
  label,
  state,
}: {
  label: string;
  state: PermissionStateLite;
}) {
  const variant =
    state === "granted"
      ? "success"
      : state === "denied"
      ? "danger"
      : state === "prompt"
      ? "warning"
      : "secondary";

  const text =
    state === "granted"
      ? "Granted"
      : state === "denied"
      ? "Denied"
      : state === "prompt"
      ? "Not requested"
      : "Unsupported";

  return (
    <div className="flex items-center justify-between gap-3 rounded-elas-lg bg-surface-subtle px-4 py-3">
      <div className="text-sm text-fg">{label}</div>
      <Badge variant={variant}>{text}</Badge>
    </div>
  );
}

function getRoleHome(role: Role): string {
  if (role === "teacher") return "/teacher/dashboard";
  if (role === "admin") return "/admin/dashboard";
  return "/student/dashboard";
}

function getRoleQuickLinks(role: Role): Array<{
  href: string;
  label: string;
  icon: ReactNode;
}> {
  if (role === "teacher") {
    return [
      { href: "/teacher/sessions", label: "Sessions", icon: <FileText size={16} /> },
      { href: "/teacher/groups", label: "Groups", icon: <Users size={16} /> },
      { href: "/teacher/reports", label: "Reports", icon: <BarChart3 size={16} /> },
    ];
  }

  if (role === "admin") {
    return [
      { href: "/admin/users", label: "Users", icon: <Users size={16} /> },
      { href: "/admin/groups", label: "Groups", icon: <FileText size={16} /> },
      { href: "/admin/audit", label: "Audit", icon: <Database size={16} /> },
    ];
  }

  return [
    { href: "/student/sessions", label: "Sessions", icon: <FileText size={16} /> },
    { href: "/student/groups", label: "Groups", icon: <Users size={16} /> },
    { href: "/student/summary", label: "Summary", icon: <BarChart3 size={16} /> },
  ];
}

export default function ProfilePage() {
  const router = useRouter();
  const toast = useToast();
  const ui = useUI();

  const role = (ui.state.role as Role) || "student";
  const home = getRoleHome(role);
  const quickLinks = getRoleQuickLinks(role);

  const stored = useMemo(() => getStoredAuth(), []);
  const [me, setMe] = useState<MeRes | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const consentGranted = ui.state.consent;
  const uiStatus = ui.state.status ?? null;

  const [camPerm, setCamPerm] = useState<PermissionStateLite>("prompt");
  const [micPerm, setMicPerm] = useState<PermissionStateLite>("prompt");
  const [netMs, setNetMs] = useState<number | null>(null);
  const [netStatus, setNetStatus] = useState<"idle" | "checking" | "ok" | "fail">(
    "idle"
  );

  const [previewOn, setPreviewOn] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const initials = safeInitial(
    stored?.email ?? me?.email,
    stored?.name ?? me?.name ?? null
  );

  useEffect(() => {
    let mounted = true;
    const ac = new AbortController();

    async function loadMe() {
      setLoading(true);
      setErr(null);

      if (!hasAuth()) {
        setLoading(false);
        router.push("/auth/login");
        return;
      }

      if (!isApiAvailable()) {
        if (mounted) {
          setMe(
            stored
              ? {
                  id: "local",
                  email: stored.email,
                  role: stored.role as Role,
                  name: stored.name ?? null,
                }
              : null
          );
          setLoading(false);
        }
        return;
      }

      try {
        const data = await api.get<MeRes>("auth/me", { signal: ac.signal });
        if (!mounted) return;
        setMe(data);
      } catch (e: any) {
        if (!mounted) return;
        setErr(e?.message || "Failed to load profile.");
        setMe(null);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadMe();

    return () => {
      mounted = false;
      ac.abort();
    };
  }, [router, stored]);

  useEffect(() => {
    let cancelled = false;

    async function queryPerms() {
      const perms = (navigator as any)?.permissions;

      if (!perms?.query) {
        setCamPerm("unsupported");
        setMicPerm("unsupported");
        return;
      }

      try {
        const cam = await perms.query({ name: "camera" });
        if (!cancelled) {
          setCamPerm((cam.state as PermissionStateLite) || "prompt");
        }
        cam.onchange = () => {
          if (!cancelled) {
            setCamPerm((cam.state as PermissionStateLite) || "prompt");
          }
        };
      } catch {
        setCamPerm("unsupported");
      }

      try {
        const mic = await perms.query({ name: "microphone" });
        if (!cancelled) {
          setMicPerm((mic.state as PermissionStateLite) || "prompt");
        }
        mic.onchange = () => {
          if (!cancelled) {
            setMicPerm((mic.state as PermissionStateLite) || "prompt");
          }
        };
      } catch {
        setMicPerm("unsupported");
      }
    }

    queryPerms();

    return () => {
      cancelled = true;
    };
  }, []);

  async function runNetworkCheck() {
    if (!isApiAvailable()) {
      toast.push({
        type: "info",
        title: "API not configured",
        text: "Set NEXT_PUBLIC_API_URL to enable network checks.",
      });
      return;
    }

    setNetStatus("checking");
    setNetMs(null);

    const t0 = performance.now();

    try {
      await api.get("health");
      const dt = Math.round(performance.now() - t0);
      setNetMs(dt);
      setNetStatus("ok");
    } catch {
      setNetStatus("fail");
      setNetMs(null);
    }
  }

  async function startPreview() {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        toast.push({
          type: "error",
          title: "Camera not available",
          text: "This browser doesn't support camera access.",
        });
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }

      setPreviewOn(true);
      toast.push({
        type: "success",
        title: "Camera check",
        text: "Camera stream started (not recorded).",
      });
    } catch (e: any) {
      toast.push({
        type: "error",
        title: "Camera blocked",
        text: e?.message || "Permission denied.",
      });
      setPreviewOn(false);
    }
  }

  function stopPreview() {
    try {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    } catch {}

    setPreviewOn(false);
  }

  function signOut() {
    clearAuth();
    ui.setLoggedIn(false);
    ui.setConsent(false);
    router.push("/");
  }

  const titleName = me?.name?.trim() ? me.name : "Profile";
  const showRole = (me?.role ?? role) as Role;

  return (
    <div className="pb-12">
      <Breadcrumbs
        items={[{ label: roleLabel(role), href: home }, { label: "Профиль" }]}
      />

      <PageHero
        title="Профиль"
        subtitle="Аккаунт, приватность, согласие и проверка устройства — в одном месте."
        right={
          <div className="flex items-center gap-2">
            <Link href={home}>
              <Button variant="outline" size="sm">
                Назад
              </Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={signOut}
              className="gap-2"
            >
              <LogOut size={16} />
              Выйти
            </Button>
          </div>
        }
      />

      <Section className="mt-6">
        {loading ? (
          <div className="grid gap-6 lg:grid-cols-12">
            <Card className="lg:col-span-7">
              <CardContent className="p-6 md:p-7">
                <Skeleton className="h-10 w-56" />
                <div className="mt-4 grid gap-3">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-5">
              <CardContent className="p-6 md:p-7">
                <Skeleton className="h-6 w-40" />
                <div className="mt-4 grid gap-3">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              </CardContent>
            </Card>
          </div>
        ) : err ? (
          <EmptyState title="Не удалось загрузить профиль" text={err} />
        ) : (
          <div className="grid gap-6 lg:grid-cols-12">
            <div className="space-y-6 lg:col-span-7">
              <Card>
                <CardContent className="p-6 md:p-7">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-start gap-4">
                      <div className="relative grid h-12 w-12 place-items-center overflow-hidden rounded-elas-lg bg-primary-muted ring-1 ring-[color:var(--border)]/25">
                        <div
                          className="absolute inset-0"
                          style={{
                            background:
                              "radial-gradient(circle at 30% 20%, rgba(142,91,255,.30) 0%, rgba(142,91,255,.14) 40%, rgba(142,91,255,0) 70%)",
                          }}
                        />
                        <div className="relative z-10 font-semibold text-fg">
                          {initials}
                        </div>
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="truncate text-lg font-semibold text-fg">
                            {titleName}
                          </div>

                          <Badge className="bg-surface-subtle ring-1 ring-[color:var(--border)]/30 shadow-none">
                            {roleLabel(showRole)}
                          </Badge>

                          {statusLabel(me?.status ?? uiStatus) && (
                            <Badge variant="outline" className="gap-1">
                              {statusLabel(me?.status ?? uiStatus)}
                            </Badge>
                          )}

                          {consentGranted ? (
                            <Badge variant="success" className="gap-1">
                              <CheckCircle2 size={14} />
                              Consent: OK
                            </Badge>
                          ) : (
                            <Badge variant="warning" className="gap-1">
                              <AlertTriangle size={14} />
                              Consent required
                            </Badge>
                          )}
                        </div>

                        <div className="mt-1 truncate text-sm text-muted">
                          {me?.email ?? stored?.email ?? "—"}
                        </div>

                        <div className="mt-1 text-xs text-muted">
                          Consent-first: мы не храним raw-видео. Используются только
                          агрегированные метрики.
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Link href="/consent">
                        <Button size="sm" className="gap-2">
                          <ShieldCheck size={16} />
                          Центр согласия
                        </Button>
                      </Link>

                      <Link href="/settings">
                        <Button variant="outline" size="sm" className="gap-2">
                          <Settings size={16} />
                          Настройки
                        </Button>
                      </Link>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-elas-lg bg-surface-subtle p-4">
                      <div className="text-xs text-muted">User ID</div>
                      <div className="mt-1 flex items-center justify-between gap-2">
                        <div className="truncate text-sm font-medium text-fg">
                          {me?.id ?? "—"}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="shrink-0"
                          onClick={async () => {
                            if (!me?.id) return;
                            await copyToClipboard(me.id);
                            toast.push({
                              type: "success",
                              title: "Copied",
                              text: "User ID copied to clipboard.",
                            });
                          }}
                        >
                          <Copy size={16} />
                        </Button>
                      </div>
                    </div>

                    <div className="rounded-elas-lg bg-surface-subtle p-4">
                      <div className="text-xs text-muted">Email</div>
                      <div className="mt-1 flex items-center justify-between gap-2">
                        <div className="truncate text-sm font-medium text-fg">
                          {me?.email ?? "—"}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="shrink-0"
                          onClick={async () => {
                            if (!me?.email) return;
                            await copyToClipboard(me.email);
                            toast.push({
                              type: "success",
                              title: "Copied",
                              text: "Email copied to clipboard.",
                            });
                          }}
                        >
                          <Copy size={16} />
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex flex-wrap gap-2">
                    <Link href="/auth/forgot-password">
                      <Button variant="outline" size="sm" className="gap-2">
                        <KeyRound size={16} />
                        Сбросить пароль
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6 md:p-7">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-sm text-muted">Privacy</div>
                      <div className="mt-2 text-lg font-semibold text-fg">
                        Контроль данных
                      </div>
                      <div className="mt-2 text-sm text-muted">
                        Прозрачные настройки для consent-first аналитики.
                      </div>
                    </div>

                    <div className="inline-flex items-center gap-2 rounded-full bg-surface-subtle px-3 py-1 text-xs text-muted">
                      <Info size={14} className="text-[rgb(var(--primary))]" />
                      privacy
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3">
                    <div className="rounded-elas-lg bg-surface-subtle p-4">
                      <div className="text-sm font-semibold text-fg">
                        Consent status
                      </div>
                      <div className="mt-1 text-sm text-muted">
                        Согласие требуется перед началом видео-аналитики. Может быть
                        запрошено для каждой сессии отдельно.
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        {consentGranted ? (
                          <Badge variant="success">Granted</Badge>
                        ) : (
                          <Badge variant="warning">Not granted</Badge>
                        )}
                        <Link href="/consent">
                          <Button size="sm">Review consent</Button>
                        </Link>
                      </div>
                    </div>

                    <div className="rounded-elas-lg bg-surface-subtle p-4">
                      <div className="text-sm font-semibold text-fg">
                        Download my data
                      </div>
                      <div className="mt-1 text-sm text-muted">
                        Экспорт данных появится позже, после финализации политики
                        хранения.
                      </div>
                      <div className="mt-3">
                        <Button size="sm" variant="outline" disabled>
                          Coming soon
                        </Button>
                      </div>
                    </div>

                    <div className="rounded-elas-lg bg-surface-subtle p-4">
                      <div className="text-sm font-semibold text-fg">
                        Delete account
                      </div>
                      <div className="mt-1 text-sm text-muted">
                        Опасная операция. Будет требовать подтверждения и может быть
                        ограничена администратором.
                      </div>
                      <div className="mt-3">
                        <Button size="sm" variant="danger" disabled>
                          Coming soon
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {role === "teacher" ? (
                <Card>
                  <CardContent className="p-6 md:p-7">
                    <div className="text-sm text-muted">Teacher</div>
                    <div className="mt-2 text-lg font-semibold text-fg">
                      Настройки преподавателя
                    </div>
                    <div className="mt-2 text-sm text-muted">
                      Появятся позже: шаблоны уроков, дефолтные политики сессии,
                      экспорты и интеграции.
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" disabled>
                        Default session settings (soon)
                      </Button>
                      <Button variant="outline" size="sm" disabled>
                        Templates (soon)
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : null}

              {role === "admin" ? (
                <Card>
                  <CardContent className="p-6 md:p-7">
                    <div className="text-sm text-muted">Admin</div>
                    <div className="mt-2 text-lg font-semibold text-fg">
                      Администрирование
                    </div>
                    <div className="mt-2 text-sm text-muted">
                      Быстрые ссылки на аудит и управление пользователями.
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Link href="/admin/audit">
                        <Button variant="outline" size="sm">
                          Audit
                        </Button>
                      </Link>
                      <Link href="/admin/users">
                        <Button variant="outline" size="sm">
                          Users
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ) : null}
            </div>

            <div className="space-y-6 lg:col-span-5">
              <Card>
                <CardContent className="p-6 md:p-7">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-sm text-muted">Device readiness</div>
                      <div className="mt-2 text-lg font-semibold text-fg">
                        Проверка устройства
                      </div>
                      <div className="mt-2 text-sm text-muted">
                        Перед LIVE убедитесь, что камера доступна. Видео не
                        записывается.
                      </div>
                    </div>

                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-elas-lg bg-surface-subtle text-[rgb(var(--primary))] ring-1 ring-[color:var(--border)]/25">
                      <Camera size={18} />
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3">
                    <PermissionPill label="Camera permission" state={camPerm} />
                    <PermissionPill label="Microphone permission" state={micPerm} />

                    <div className="rounded-elas-lg bg-surface-subtle p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-fg">
                            Network check
                          </div>
                          <div className="text-sm text-muted">
                            Ping backend /health и оценка задержки.
                          </div>
                        </div>

                        <div className="inline-flex items-center gap-2">
                          {netStatus === "ok" ? (
                            <Badge variant="success" className="gap-1">
                              <Wifi size={14} />
                              {netMs} ms
                            </Badge>
                          ) : netStatus === "fail" ? (
                            <Badge variant="danger" className="gap-1">
                              <AlertTriangle size={14} />
                              Failed
                            </Badge>
                          ) : (
                            <Badge className="gap-1">
                              <Wifi size={14} />
                              {netStatus === "checking" ? "Checking…" : "Idle"}
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="mt-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={runNetworkCheck}
                          disabled={netStatus === "checking"}
                        >
                          Run check
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 rounded-elas-lg bg-surface-subtle p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-fg">
                          Camera preview
                        </div>
                        <div className="text-sm text-muted">
                          Локальный preview, не отправляется на сервер.
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {!previewOn ? (
                          <Button size="sm" onClick={startPreview}>
                            Start
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" onClick={stopPreview}>
                            Stop
                          </Button>
                        )}
                      </div>
                    </div>

                    <div
                      className={cn(
                        "mt-4 overflow-hidden rounded-elas-lg bg-bg ring-1 ring-[color:var(--border)]/30",
                        previewOn ? "block" : "hidden"
                      )}
                    >
                      <video
                        ref={videoRef}
                        muted
                        playsInline
                        className="aspect-video w-full object-cover"
                      />
                    </div>

                    {!previewOn ? (
                      <div className="mt-4 text-xs text-muted">
                        Если камера заблокирована, откройте настройки браузера и
                        разрешите доступ для сайта.
                      </div>
                    ) : null}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6 md:p-7">
                  <div className="text-sm text-muted">Navigation</div>
                  <div className="mt-2 text-lg font-semibold text-fg">
                    Быстрые ссылки
                  </div>

                  <div className="mt-4 grid gap-2">
                    {quickLinks.map((item) => (
                      <Link key={item.href} href={item.href} className="block">
                        <Button variant="outline" className="w-full justify-between">
                          <span className="inline-flex items-center gap-2">
                            {item.icon}
                            {item.label}
                          </span>
                          <span className="text-muted">→</span>
                        </Button>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </Section>
    </div>
  );
}