"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";
import {
  ArrowDownToLine,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  File,
  FileImage,
  FileText,
  Filter,
  Image as ImageIcon,
  Music2,
  MoreVertical,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Upload,
  CloudUpload,
  UserPlus,
  Video,
  X,
} from "lucide-react";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import MaterialPreviewModal from "@/components/resources/MaterialPreviewModal";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";
import {
  getTeacherAllSessions,
  getTeacherGroups,
  type GroupSession,
  type TeacherGroup,
} from "@/lib/api/teacher";
import {
  assignMaterial,
  createMaterial,
  deleteMaterial,
  getMaterialAssignments,
  getMaterialDownload,
  getMyMaterials,
  resolveDownloadUrl,
  unassignMaterial,
  uploadMaterialFile,
  type MaterialAssignmentRow,
  type MaterialRow,
} from "@/lib/api/materials";
import { ChatClient } from "@/lib/ws/chatClient";

type MaterialKind = "all" | "document" | "image" | "video" | "audio" | "other";
type CreateKind = "document" | "image" | "video" | "audio";
type SortMode = "newest" | "oldest" | "name";

type CreateTypeConfig = {
  uploadLabel: string;
  dropLabel: string;
  hint: string;
  maxBytes: number;
  maxSizeLabel: string;
  detailsLabel?: string;
  detailsPlaceholder?: string;
  detailsHelp?: string;
};

type MaterialKindMeta = {
  label: string;
  shortLabel: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  iconClass: string;
  badgeClass: string;
};

const DEFAULT_CREATE_FORM = {
  title: "",
  description: "",
  fileName: "",
  mimeType: "",
  storageKey: "",
  size: "",
};

const DEFAULT_ASSIGN_FORM = {
  groupId: "",
  sessionId: "",
  visibleFrom: "",
  visibleTo: "",
};

const TABS: Array<{ id: MaterialKind; label: string }> = [
  { id: "all", label: "Все материалы" },
  { id: "document", label: "Документы" },
  { id: "image", label: "Изображения" },
  { id: "video", label: "Видеоуроки" },
  { id: "audio", label: "Аудиозаписи" },
];


const CREATE_TYPES: Array<{ id: CreateKind; label: string; icon: ComponentType<{ size?: number; className?: string }> }> = [
  { id: "document", label: "Документ", icon: FileText },
  { id: "image", label: "Изображение", icon: ImageIcon },
  { id: "video", label: "Видеоурок", icon: Video },
  { id: "audio", label: "Аудиозапись", icon: Music2 },
];

const CREATE_ACCEPT: Record<CreateKind, string> = {
  document: ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.rtf,.csv,application/pdf,text/*",
  image: "image/*,.png,.jpg,.jpeg,.webp,.gif,.svg",
  video: "video/*,.mp4,.mov,.avi,.mkv,.webm,.m4v",
  audio: "audio/*,.mp3,.wav,.ogg,.m4a,.aac,.flac,.wma,.opus",
};

const CREATE_CONFIG: Record<CreateKind, CreateTypeConfig> = {
  document: {
    uploadLabel: "Загрузить файл",
    dropLabel: "Перетащите файл сюда или нажмите для выбора",
    hint: "Поддерживаются PDF, DOCX, PPTX, XLSX (до 100 МБ)",
    maxBytes: 100 * 1024 * 1024,
    maxSizeLabel: "100 МБ",
  },
  image: {
    uploadLabel: "Загрузить изображение",
    dropLabel: "Перетащите изображение сюда или нажмите для выбора",
    hint: "Поддерживаются JPG, PNG, WEBP, SVG (до 20 МБ)",
    maxBytes: 20 * 1024 * 1024,
    maxSizeLabel: "20 МБ",
  },
  video: {
    uploadLabel: "Загрузить видео",
    dropLabel: "Перетащите видеофайл сюда или нажмите для выбора",
    hint: "Поддерживаются MP4, MOV, AVI, WebM (до 500 МБ)",
    maxBytes: 500 * 1024 * 1024,
    maxSizeLabel: "500 МБ",
    detailsLabel: "Ссылка на видео или длительность (необязательно)",
    detailsPlaceholder: "https://example.com/video или 00:00:00",
    detailsHelp: "Укажите ссылку на видео или приблизительную длительность (чч:мм:сс).",
  },
  audio: {
    uploadLabel: "Загрузить аудио",
    dropLabel: "Перетащите аудиофайл сюда или нажмите для выбора",
    hint: "Поддерживаются MP3, WAV, M4A, OGG (до 100 МБ)",
    maxBytes: 100 * 1024 * 1024,
    maxSizeLabel: "100 МБ",
    detailsLabel: "Ссылка на аудио или длительность (необязательно)",
    detailsPlaceholder: "https://example.com/audio.mp3 или 12:45",
    detailsHelp: "Укажите ссылку на аудио или приблизительную длительность.",
  },
};

const KIND_META: Record<Exclude<MaterialKind, "all">, MaterialKindMeta> = {
  document: {
    label: "Документ",
    shortLabel: "Документы",
    icon: FileText,
    iconClass: "bg-blue-50 text-blue-600",
    badgeClass: "bg-blue-50 text-blue-700 ring-blue-100",
  },
  image: {
    label: "Изображение",
    shortLabel: "Изображения",
    icon: FileImage,
    iconClass: "bg-emerald-50 text-emerald-600",
    badgeClass: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  },
  video: {
    label: "Видеоурок",
    shortLabel: "Видеоуроки",
    icon: Video,
    iconClass: "bg-rose-50 text-rose-500",
    badgeClass: "bg-rose-50 text-rose-600 ring-rose-100",
  },
  audio: {
    label: "Аудиозапись",
    shortLabel: "Аудиозаписи",
    icon: Music2,
    iconClass: "bg-violet-50 text-violet-600",
    badgeClass: "bg-violet-50 text-violet-700 ring-violet-100",
  },
  other: {
    label: "Файл",
    shortLabel: "Другие",
    icon: File,
    iconClass: "bg-violet-50 text-violet-600",
    badgeClass: "bg-violet-50 text-violet-700 ring-violet-100",
  },
};

export default function TeacherResourcesPage() {
  const { push } = useToast();

  const [groups, setGroups] = useState<TeacherGroup[]>([]);
  const [sessions, setSessions] = useState<GroupSession[]>([]);
  const [materials, setMaterials] = useState<MaterialRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);

  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<MaterialKind>("all");
  const [sort, setSort] = useState<SortMode>("newest");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [createKind, setCreateKind] = useState<CreateKind>("document");
  const [createGroupId, setCreateGroupId] = useState("");
  const [mediaDetails, setMediaDetails] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [previewMaterial, setPreviewMaterial] = useState<MaterialRow | null>(null);
  const [activeMaterial, setActiveMaterial] = useState<MaterialRow | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [activeAssignments, setActiveAssignments] = useState<MaterialAssignmentRow[]>([]);

  const [form, setForm] = useState(DEFAULT_CREATE_FORM);
  const [assignForm, setAssignForm] = useState(DEFAULT_ASSIGN_FORM);

  useEffect(() => {
    getTeacherGroups().then(setGroups).catch(() => setGroups([]));
    getTeacherAllSessions().then(setSessions).catch(() => setSessions([]));
  }, []);

  const loadMaterials = useCallback(async () => {
    setLoading(true);
    try {
      const list = await getMyMaterials();
      setMaterials(Array.isArray(list) ? list : []);
    } catch (error: unknown) {
      setMaterials([]);
      push({
        type: "error",
        title: "Не удалось загрузить материалы",
        text: getErrorMessage(error),
      });
    } finally {
      setLoading(false);
    }
  }, [push]);

  useEffect(() => {
    void loadMaterials();
  }, [loadMaterials]);

  useEffect(() => {
    const client = new ChatClient((packet) => {
      if (!packet || typeof packet !== "object") return;
      const type = (packet as { type?: string }).type;
      if (type?.startsWith("material.")) void loadMaterials();
    });

    client.connect();
    client.joinUser();
    return () => client.disconnect();
  }, [loadMaterials]);

  const counts = useMemo(() => {
    const result = {
      all: materials.length,
      document: 0,
      image: 0,
      video: 0,
      audio: 0,
      other: 0,
    };

    for (const material of materials) {
      result[getMaterialKind(material)] += 1;
    }

    return result;
  }, [materials]);

  const addedThisWeek = useMemo(() => {
    const now = Date.now();
    const week = 7 * 24 * 60 * 60 * 1000;
    return materials.filter((material) => {
      const created = new Date(material.createdAt).getTime();
      return Number.isFinite(created) && now - created <= week;
    }).length;
  }, [materials]);

  const filteredMaterials = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("ru-RU");

    return materials
        .filter((material) => kind === "all" || getMaterialKind(material) === kind)
        .filter((material) => {
          if (!normalizedQuery) return true;
          const haystack = [
            material.title,
            material.description,
            material.fileName,
            material.mimeType,
          ]
              .filter(Boolean)
              .join(" ")
              .toLocaleLowerCase("ru-RU");
          return haystack.includes(normalizedQuery);
        })
        .sort((left, right) => {
          if (sort === "name") {
            return left.title.localeCompare(right.title, "ru");
          }

          const leftTime = new Date(left.createdAt).getTime() || 0;
          const rightTime = new Date(right.createdAt).getTime() || 0;
          return sort === "oldest" ? leftTime - rightTime : rightTime - leftTime;
        });
  }, [kind, materials, query, sort]);

  const totalPages = Math.max(1, Math.ceil(filteredMaterials.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * pageSize;
  const pageMaterials = filteredMaterials.slice(pageStart, pageStart + pageSize);
  const shownFrom = filteredMaterials.length === 0 ? 0 : pageStart + 1;
  const shownTo = Math.min(pageStart + pageSize, filteredMaterials.length);

  const groupOptions = useMemo(() => groups, [groups]);
  const sessionOptions = useMemo(() => sessions, [sessions]);

  const selectKind = (nextKind: MaterialKind) => {
    setKind(nextKind);
    setPage(1);
  };

  const resetCreateForm = useCallback(() => {
    setForm(DEFAULT_CREATE_FORM);
    setSelectedFile(null);
    setCreateKind("document");
    setCreateGroupId("");
    setMediaDetails("");
    setDragActive(false);
  }, []);

  const closeCreateModal = useCallback(() => {
    if (working) return;
    setCreateOpen(false);
    resetCreateForm();
  }, [resetCreateForm, working]);

  const applySelectedFile = useCallback((file: File | null) => {
    if (!file) {
      setSelectedFile(null);
      return;
    }

    const detectedKind = getCreateKindFromFile(file);
    if (!detectedKind) {
      push({
        type: "error",
        title: "Неподдерживаемый формат файла",
        text: "Выберите документ, изображение, видео или аудиофайл поддерживаемого формата.",
      });
      return;
    }

    const config = CREATE_CONFIG[detectedKind];
    if (file.size > config.maxBytes) {
      push({
        type: "error",
        title: "Файл слишком большой",
        text: `Максимальный размер для этого типа — ${config.maxSizeLabel}.`,
      });
      return;
    }

    setCreateKind(detectedKind);
    setSelectedFile(file);
    setForm((current) => ({
      ...current,
      fileName: file.name,
      mimeType: file.type || current.mimeType,
      size: String(file.size),
    }));
  }, [push]);

  const openAssign = useCallback((material: MaterialRow) => {
    setActionMenuId(null);
    setActiveMaterial(material);
    setActiveAssignments([]);
    setAssignForm(DEFAULT_ASSIGN_FORM);
    setAssignOpen(true);
    getMaterialAssignments(material.id)
        .then(setActiveAssignments)
        .catch(() => setActiveAssignments([]));
  }, []);

  const handleDownload = useCallback(
      async (material: MaterialRow) => {
        try {
          const info = await getMaterialDownload(material.id);
          if (!info?.downloadUrl) throw new Error("Ссылка для скачивания не получена.");
          const url = resolveDownloadUrl(info.downloadUrl);
          if (!url) throw new Error("Некорректная ссылка для скачивания.");
          window.open(url, "_blank", "noopener,noreferrer");
        } catch (error: unknown) {
          push({
            type: "error",
            title: "Не удалось скачать файл",
            text: getErrorMessage(error),
          });
        }
      },
      [push]
  );

  const handleDelete = useCallback(
      async (material: MaterialRow) => {
        setActionMenuId(null);
        if (!window.confirm(`Удалить материал «${material.title}»?`)) return;

        setWorking(true);
        try {
          await deleteMaterial(material.id);
          await loadMaterials();
          push({ type: "success", title: "Материал удалён" });
        } catch (error: unknown) {
          push({
            type: "error",
            title: "Не удалось удалить материал",
            text: getErrorMessage(error),
          });
        } finally {
          setWorking(false);
        }
      },
      [loadMaterials, push]
  );

  const handleCreate = async () => {
    if (!selectedFile) {
      push({ type: "error", title: "Выберите файл для загрузки" });
      return;
    }

    setWorking(true);
    try {
      const uploaded = await uploadMaterialFile(selectedFile);
      const descriptionParts = [form.description.trim()];

      if ((createKind === "audio" || createKind === "video") && mediaDetails.trim()) {
        const detailsLabel = createKind === "audio"
            ? "Ссылка или длительность аудио"
            : "Ссылка или длительность видео";
        descriptionParts.push(`${detailsLabel}: ${mediaDetails.trim()}`);
      }

      const material = await createMaterial({
        title: form.title.trim(),
        description: descriptionParts.filter(Boolean).join("\n") || null,
        fileName: uploaded.fileName,
        mimeType: uploaded.mimeType || form.mimeType.trim() || null,
        storageKey: uploaded.storageKey,
        size: uploaded.size,
      });

      let assignmentFailed = false;
      if (createGroupId) {
        try {
          await assignMaterial(material.id, { groupId: createGroupId });
        } catch {
          assignmentFailed = true;
        }
      }

      setCreateOpen(false);
      resetCreateForm();
      await loadMaterials();
      push({
        type: assignmentFailed ? "info" : "success",
        title: assignmentFailed ? "Материал создан без назначения" : "Материал создан",
        text: assignmentFailed
            ? "Файл загружен, но назначить его группе не удалось. Назначьте материал через кнопку в таблице."
            : createGroupId
                ? "Материал сразу назначен выбранной группе."
                : undefined,
      });
    } catch (error: unknown) {
      push({
        type: "error",
        title: "Не удалось создать материал",
        text: getErrorMessage(error),
      });
    } finally {
      setWorking(false);
    }
  };

  const handleAssign = async () => {
    if (!activeMaterial) return;

    setWorking(true);
    try {
      await assignMaterial(activeMaterial.id, {
        groupId: assignForm.groupId || undefined,
        sessionId: assignForm.sessionId || undefined,
        visibleFrom: assignForm.visibleFrom
            ? new Date(assignForm.visibleFrom).toISOString()
            : null,
        visibleTo: assignForm.visibleTo
            ? new Date(assignForm.visibleTo).toISOString()
            : null,
      });

      const assignments = await getMaterialAssignments(activeMaterial.id).catch(() => []);
      setActiveAssignments(assignments);
      setAssignOpen(false);
      push({ type: "success", title: "Материал назначен" });
    } catch (error: unknown) {
      push({
        type: "error",
        title: "Не удалось назначить материал",
        text: getErrorMessage(error),
      });
    } finally {
      setWorking(false);
    }
  };

  const createConfig = CREATE_CONFIG[createKind];

  return (
      <div className="min-h-screen bg-[#FAFAFB]">
        <div className="mx-auto max-w-[1440px] px-4 py-8 md:px-8">
          <header className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-950">Материалы</h1>
              <p className="mt-1.5 max-w-3xl text-[15px] text-slate-500">
                Загружайте, организуйте, назначайте и скачивайте материалы для ваших учеников.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <label className="relative min-w-[240px] flex-1 xl:w-[280px] xl:flex-none">
                <Search
                    size={17}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                    type="search"
                    value={query}
                    onChange={(event) => {
                      setQuery(event.target.value);
                      setPage(1);
                    }}
                    placeholder="Поиск материалов..."
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-9 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                />
                {query && (
                    <button
                        type="button"
                        aria-label="Очистить поиск"
                        onClick={() => {
                          setQuery("");
                          setPage(1);
                        }}
                        className="absolute right-2.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                    >
                      <X size={15} />
                    </button>
                )}
              </label>

              <div className="relative">
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => setFiltersOpen((value) => !value)}
                    aria-expanded={filtersOpen}
                >
                  <Filter size={16} />
                  Фильтры
                </Button>

                {filtersOpen && (
                    <div className="absolute right-0 top-full z-30 mt-2 w-72 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_18px_45px_rgba(15,23,42,0.14)]">
                      <div className="flex items-center justify-between">
                        <div className="font-semibold text-slate-900">Фильтры</div>
                        <button
                            type="button"
                            aria-label="Закрыть фильтры"
                            onClick={() => setFiltersOpen(false)}
                            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                        >
                          <X size={16} />
                        </button>
                      </div>

                      <label className="mt-4 block text-xs font-semibold text-slate-500">
                        Тип материала
                        <select
                            value={kind}
                            onChange={(event) => selectKind(event.target.value as MaterialKind)}
                            className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                        >
                          <option value="all">Все типы</option>
                          <option value="document">Документы</option>
                          <option value="image">Изображения</option>
                          <option value="video">Видеоуроки</option>
                          <option value="audio">Аудиозаписи</option>
                          <option value="other">Другие файлы</option>
                        </select>
                      </label>

                      <button
                          type="button"
                          onClick={() => {
                            setKind("all");
                            setSort("newest");
                            setPage(1);
                            setFiltersOpen(false);
                          }}
                          className="mt-4 w-full rounded-xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
                      >
                        Сбросить фильтры
                      </button>
                    </div>
                )}
              </div>

              <label className="relative">
                <select
                    aria-label="Сортировка материалов"
                    value={sort}
                    onChange={(event) => {
                      setSort(event.target.value as SortMode);
                      setPage(1);
                    }}
                    className="h-10 appearance-none rounded-xl border border-slate-200 bg-white py-0 pl-4 pr-10 text-sm font-medium text-slate-700 shadow-sm outline-none hover:border-slate-300 focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                >
                  <option value="newest">По дате: новые</option>
                  <option value="oldest">По дате: старые</option>
                  <option value="name">По названию</option>
                </select>
                <ChevronDown
                    size={15}
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
              </label>

              <Button type="button" variant="outline" onClick={() => void loadMaterials()} disabled={loading}>
                <RefreshCw size={16} className={cn(loading && "animate-spin")} />
                Обновить
              </Button>

              <Button type="button" onClick={() => setCreateOpen(true)}>
                <Plus size={17} />
                Создать материал
              </Button>
            </div>
          </header>

          <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <StatCard
                icon={FileText}
                iconClass="bg-violet-50 text-violet-600"
                label="Всего материалов"
                value={counts.all}
                helper={addedThisWeek > 0 ? `+${addedThisWeek} за неделю` : "Без новых за неделю"}
                helperClass={addedThisWeek > 0 ? "text-violet-600" : "text-slate-400"}
            />
            <StatCard
                icon={FileText}
                iconClass="bg-blue-50 text-blue-600"
                label="Документы"
                value={counts.document}
                helper={formatShare(counts.document, counts.all)}
            />
            <StatCard
                icon={ImageIcon}
                iconClass="bg-emerald-50 text-emerald-600"
                label="Изображения"
                value={counts.image}
                helper={formatShare(counts.image, counts.all)}
            />
            <StatCard
                icon={Video}
                iconClass="bg-rose-50 text-rose-500"
                label="Видеоуроки"
                value={counts.video}
                helper={formatShare(counts.video, counts.all)}
            />
            <StatCard
                icon={Music2}
                iconClass="bg-violet-50 text-violet-600"
                label="Аудиозаписи"
                value={counts.audio}
                helper={formatShare(counts.audio, counts.all)}
            />
          </section>

          <section className="mt-6">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex max-w-full items-center gap-2 overflow-x-auto pb-1">
                {TABS.map((tab) => (
                    <button
                        key={tab.id}
                        type="button"
                        onClick={() => selectKind(tab.id)}
                        className={cn(
                            "inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border px-4 text-sm font-semibold transition",
                            kind === tab.id
                                ? "border-violet-300 bg-violet-50 text-violet-700 shadow-sm"
                                : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-800"
                        )}
                    >
                      {tab.label}
                      <span
                          className={cn(
                              "rounded-full px-2 py-0.5 text-[11px]",
                              kind === tab.id ? "bg-violet-100 text-violet-700" : "bg-slate-100 text-slate-500"
                          )}
                      >
                    {counts[tab.id]}
                  </span>
                    </button>
                ))}
              </div>

              <div className="text-sm text-slate-500">
                Найдено: <span className="font-semibold text-slate-800">{filteredMaterials.length}</span>
              </div>
            </div>

            <div className="mt-4 overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
              {loading ? (
                  <LoadingRows />
              ) : pageMaterials.length === 0 ? (
                  <EmptyState hasFilters={Boolean(query || kind !== "all")} onReset={() => {
                    setQuery("");
                    setKind("all");
                    setPage(1);
                  }} />
              ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[1040px] border-collapse">
                      <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/70 text-left text-xs font-semibold text-slate-500">
                        <th className="px-5 py-4">Название</th>
                        <th className="px-4 py-4">Тип</th>
                        <th className="px-4 py-4">Файл</th>
                        <th className="px-4 py-4">Размер</th>
                        <th className="px-4 py-4">Дата</th>
                        <th className="px-4 py-4 text-right">Действия</th>
                      </tr>
                      </thead>
                      <tbody>
                      {pageMaterials.map((material) => (
                          <MaterialTableRow
                              key={material.id}
                              material={material}
                              menuOpen={actionMenuId === material.id}
                              disabled={working}
                              onToggleMenu={() =>
                                  setActionMenuId((current) => current === material.id ? null : material.id)
                              }
                              onPreview={() => setPreviewMaterial(material)}
                              onDownload={() => void handleDownload(material)}
                              onAssign={() => openAssign(material)}
                              onDelete={() => void handleDelete(material)}
                          />
                      ))}
                      </tbody>
                    </table>
                  </div>
              )}
            </div>

            <div className="mt-4 flex flex-col gap-3 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
              <div>
                Показано {shownFrom}–{shownTo} из {filteredMaterials.length} материалов
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1">
                  <PaginationButton
                      label="Предыдущая страница"
                      disabled={safePage <= 1}
                      onClick={() => setPage(Math.max(1, safePage - 1))}
                  >
                    <ChevronLeft size={16} />
                  </PaginationButton>

                  {getPageNumbers(safePage, totalPages).map((pageNumber) => (
                      <button
                          key={pageNumber}
                          type="button"
                          onClick={() => setPage(pageNumber)}
                          className={cn(
                              "h-9 min-w-9 rounded-lg border px-2 text-sm font-semibold transition",
                              pageNumber === safePage
                                  ? "border-violet-300 bg-violet-50 text-violet-700"
                                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900"
                          )}
                      >
                        {pageNumber}
                      </button>
                  ))}

                  <PaginationButton
                      label="Следующая страница"
                      disabled={safePage >= totalPages}
                      onClick={() => setPage(Math.min(totalPages, safePage + 1))}
                  >
                    <ChevronRight size={16} />
                  </PaginationButton>
                </div>

                <label className="flex items-center gap-2">
                  <span>Показывать по</span>
                  <select
                      value={pageSize}
                      onChange={(event) => {
                        setPageSize(Number(event.target.value));
                        setPage(1);
                      }}
                      className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none focus:border-violet-400"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                  </select>
                </label>
              </div>
            </div>
          </section>
        </div>

        <MaterialPreviewModal
            open={Boolean(previewMaterial)}
            material={previewMaterial}
            onClose={() => setPreviewMaterial(null)}
        />

        <Modal
            open={createOpen}
            onClose={closeCreateModal}
            title="Создание материала"
            size="lg"
            footer={
              <div className="flex w-full flex-col-reverse gap-3 border-t border-slate-100 bg-white/95 pt-4 sm:flex-row sm:justify-end">
                <Button type="button" variant="outline" onClick={closeCreateModal} disabled={working}>
                  Отмена
                </Button>
                <Button
                    type="button"
                    onClick={() => void handleCreate()}
                    disabled={working || !form.title.trim() || !selectedFile}
                    className="shadow-lg shadow-violet-500/20"
                >
                  {working ? "Создание..." : "Создать материал"}
                </Button>
              </div>
            }
        >
          <div className="space-y-6">
            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-700">Название материала</span>
              <input
                  value={form.title}
                  maxLength={160}
                  onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                  placeholder="Введите название материала"
                  className="h-12 w-full rounded-2xl border border-violet-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-violet-300 focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
              />
            </label>

            <div>
              <div className="mb-3 text-sm font-bold text-slate-700">Тип</div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {CREATE_TYPES.map((item) => {
                  const Icon = item.icon;
                  const active = createKind === item.id;
                  return (
                      <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setCreateKind(item.id);
                            setSelectedFile(null);
                            setMediaDetails("");
                            setForm((current) => ({ ...current, fileName: "", mimeType: "", size: "" }));
                          }}
                          className={cn(
                              "flex h-14 items-center justify-center gap-2 rounded-2xl border px-3 text-sm font-bold transition",
                              active
                                  ? "border-violet-400 bg-violet-50 text-violet-700 shadow-sm shadow-violet-500/10 ring-4 ring-violet-100/70"
                                  : "border-slate-200 bg-white text-slate-500 hover:border-violet-200 hover:bg-violet-50/50 hover:text-violet-700"
                          )}
                      >
                        <Icon size={18} />
                        {item.label}
                      </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="mb-3 text-sm font-bold text-slate-700">
                {createConfig.uploadLabel}
              </div>
              <label
                  className={cn(
                      "group relative flex min-h-[180px] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-[24px] border border-dashed px-6 py-8 text-center transition",
                      dragActive
                          ? "border-violet-500 bg-violet-100/80 shadow-inner shadow-violet-500/10"
                          : "border-violet-300 bg-gradient-to-br from-violet-50 via-white to-violet-50/70 hover:border-violet-400 hover:bg-violet-50"
                  )}
                  onDragEnter={(event) => {
                    event.preventDefault();
                    setDragActive(true);
                  }}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setDragActive(true);
                  }}
                  onDragLeave={(event) => {
                    event.preventDefault();
                    setDragActive(false);
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    setDragActive(false);
                    applySelectedFile(event.dataTransfer.files?.[0] ?? null);
                  }}
              >
                <div className="absolute inset-0 opacity-0 transition group-hover:opacity-100">
                  <div className="absolute left-1/2 top-0 h-32 w-32 -translate-x-1/2 rounded-full bg-violet-200/30 blur-3xl" />
                </div>

                <div className="relative z-10">
                  <CreateUploadIcon kind={createKind} />
                </div>
                <span className="relative z-10 mt-4 text-base font-black text-slate-800">
                  {selectedFile ? selectedFile.name : createConfig.dropLabel}
                </span>
                <span className="relative z-10 mt-1 text-sm font-medium text-slate-500">{createConfig.hint}</span>
                {selectedFile && (
                    <span className="relative z-10 mt-3 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-violet-700 shadow-sm ring-1 ring-violet-100">
                      {formatBytes(selectedFile.size)} · {selectedFile.type || "тип не указан"}
                    </span>
                )}
                <input
                    type="file"
                    accept={CREATE_ACCEPT[createKind]}
                    className="sr-only"
                    onChange={(event) => applySelectedFile(event.target.files?.[0] ?? null)}
                />
              </label>
            </div>

            {(createKind === "audio" || createKind === "video") && (
                <label className="block rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                  <span className="mb-2 block text-sm font-bold text-slate-700">
                    {createConfig.detailsLabel}
                  </span>
                  <input
                      value={mediaDetails}
                      maxLength={255}
                      onChange={(event) => setMediaDetails(event.target.value)}
                      placeholder={createConfig.detailsPlaceholder}
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                  />
                  <div className="mt-2 flex items-start justify-between gap-3 text-[11px] font-medium text-slate-400">
                    <span>{createConfig.detailsHelp} Для скачивания нужен загруженный файл.</span>
                    <span className="shrink-0">{mediaDetails.length}/255</span>
                  </div>
                </label>
            )}

            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-700">Описание (необязательно)</span>
              <textarea
                  value={form.description}
                  maxLength={500}
                  onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                  placeholder="Введите описание материала"
                  rows={4}
                  className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
              />
              <span className="mt-1 block text-right text-[11px] font-medium text-slate-400">{form.description.length}/500</span>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-700">
                Назначить группе (необязательно)
              </span>
              <div className="relative">
                <select
                    value={createGroupId}
                    onChange={(event) => setCreateGroupId(event.target.value)}
                    className="h-12 w-full appearance-none rounded-2xl border border-slate-200 bg-white px-4 pr-11 text-sm font-semibold text-slate-700 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                >
                  <option value="">Выберите группу</option>
                  {groupOptions.map((group) => (
                      <option key={group.id} value={group.id}>{group.name}</option>
                  ))}
                </select>
                <ChevronDown size={18} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
            </label>
          </div>
        </Modal>

        <Modal
            open={assignOpen}
            onClose={() => {
              if (working) return;
              setAssignOpen(false);
            }}
            title="Назначить материал"
            description={activeMaterial ? `Материал: ${activeMaterial.title}` : undefined}
            size="lg"
            footer={
              <div className="flex items-center justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setAssignOpen(false)} disabled={working}>
                  Отмена
                </Button>
                <Button
                    type="button"
                    onClick={() => void handleAssign()}
                    disabled={working || !activeMaterial || (!assignForm.groupId && !assignForm.sessionId)}
                >
                  {working ? "Назначение..." : "Назначить"}
                </Button>
              </div>
            }
        >
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1.5">
                <span className="text-xs font-semibold text-slate-500">Группа</span>
                <select
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 shadow-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                    value={assignForm.groupId}
                    onChange={(event) =>
                        setAssignForm((current) => ({ ...current, groupId: event.target.value }))
                    }
                >
                  <option value="">Не выбрана</option>
                  {groupOptions.map((group) => (
                      <option key={group.id} value={group.id}>{group.name}</option>
                  ))}
                </select>
              </label>

              <label className="space-y-1.5">
                <span className="text-xs font-semibold text-slate-500">Сессия</span>
                <select
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 shadow-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                    value={assignForm.sessionId}
                    onChange={(event) =>
                        setAssignForm((current) => ({ ...current, sessionId: event.target.value }))
                    }
                >
                  <option value="">Не выбрана</option>
                  {sessionOptions.map((session) => (
                      <option key={session.id} value={session.id}>{session.title}</option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1.5">
                <span className="text-xs font-semibold text-slate-500">Показывать с</span>
                <Input
                    type="datetime-local"
                    value={assignForm.visibleFrom}
                    onChange={(event) =>
                        setAssignForm((current) => ({ ...current, visibleFrom: event.target.value }))
                    }
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-semibold text-slate-500">Показывать до</span>
                <Input
                    type="datetime-local"
                    value={assignForm.visibleTo}
                    onChange={(event) =>
                        setAssignForm((current) => ({ ...current, visibleTo: event.target.value }))
                    }
                />
              </label>
            </div>

            {activeAssignments.length > 0 && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                  <div className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                    Текущие назначения
                  </div>
                  <div className="space-y-2">
                    {activeAssignments.map((assignment) => (
                        <div
                            key={assignment.id}
                            className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-white px-3 py-2.5 text-xs"
                        >
                          <div className="min-w-0">
                            <div className="truncate font-semibold text-slate-700">
                              {getAssignmentLabel(assignment, groupOptions, sessionOptions)}
                            </div>
                            <div className="mt-0.5 text-slate-400">{formatDateTime(assignment.createdAt)}</div>
                          </div>
                          <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={async () => {
                                if (!activeMaterial) return;
                                try {
                                  await unassignMaterial(activeMaterial.id, assignment.id);
                                  const assignments = await getMaterialAssignments(activeMaterial.id).catch(() => []);
                                  setActiveAssignments(assignments);
                                  push({ type: "success", title: "Назначение удалено" });
                                } catch (error: unknown) {
                                  push({
                                    type: "error",
                                    title: "Не удалось убрать назначение",
                                    text: getErrorMessage(error),
                                  });
                                }
                              }}
                          >
                            Убрать
                          </Button>
                        </div>
                    ))}
                  </div>
                </div>
            )}
          </div>
        </Modal>
      </div>
  );
}

function CreateUploadIcon({ kind }: { kind: CreateKind }) {
  if (kind === "image") {
    return (
        <span className="relative flex h-16 w-20 items-center justify-center">
        <span className="absolute left-1 top-2 h-11 w-14 rotate-[-7deg] rounded-xl border border-violet-200 bg-white/80 shadow-sm" />
        <span className="relative flex h-12 w-16 items-center justify-center rounded-xl border border-violet-200 bg-white text-violet-600 shadow-sm">
          <ImageIcon size={30} />
        </span>
        <span className="absolute -right-1 bottom-0 flex h-8 w-8 items-center justify-center rounded-full bg-violet-600 text-white shadow-md">
          <Upload size={16} />
        </span>
      </span>
    );
  }

  if (kind === "video") {
    return (
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-100 text-violet-600">
        <Video size={30} />
      </span>
    );
  }

  if (kind === "audio") {
    return (
        <span className="flex items-center gap-2 text-violet-600">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-violet-100">
          <Music2 size={28} />
        </span>
        <span aria-hidden="true" className="flex items-center gap-1">
          {[14, 24, 34, 22, 30, 18].map((height, index) => (
              <span
                  key={`${height}-${index}`}
                  className="w-1 rounded-full bg-violet-500"
                  style={{ height }}
              />
          ))}
        </span>
      </span>
    );
  }

  return (
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-100 text-violet-600">
      <CloudUpload size={30} />
    </span>
  );
}

function StatCard({
                    icon: Icon,
                    iconClass,
                    label,
                    value,
                    helper,
                    helperClass = "text-slate-400",
                  }: {
  icon: ComponentType<{ size?: number; className?: string }>;
  iconClass: string;
  label: string;
  value: number;
  helper: string;
  helperClass?: string;
}) {
  return (
      <div className="rounded-[18px] border border-slate-200 bg-white p-5 shadow-[0_6px_24px_rgba(15,23,42,0.04)]">
        <div className="flex items-start gap-4">
        <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", iconClass)}>
          <Icon size={21} />
        </span>
          <div>
            <div className="text-xs font-semibold text-slate-500">{label}</div>
            <div className="mt-1 text-2xl font-bold tracking-tight text-slate-950">{value}</div>
            <div className={cn("mt-1 text-xs font-semibold", helperClass)}>{helper}</div>
          </div>
        </div>
      </div>
  );
}

function MaterialTableRow({
                            material,
                            menuOpen,
                            disabled,
                            onToggleMenu,
                            onPreview,
                            onDownload,
                            onAssign,
                            onDelete,
                          }: {
  material: MaterialRow;
  menuOpen: boolean;
  disabled: boolean;
  onToggleMenu: () => void;
  onPreview: () => void;
  onDownload: () => void;
  onAssign: () => void;
  onDelete: () => void;
}) {
  const kind = getMaterialKind(material);
  const meta = KIND_META[kind];
  const Icon = meta.icon;

  return (
      <tr onClick={onPreview} className="cursor-pointer border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
        <td className="px-5 py-4">
          <div className="flex items-center gap-3">
          <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", meta.iconClass)}>
            <Icon size={20} />
          </span>
            <div className="min-w-0">
              <div className="max-w-[260px] truncate text-sm font-semibold text-slate-900">{material.title}</div>
              <div className="mt-0.5 max-w-[280px] truncate text-xs text-slate-400">
                {material.description || "Учебный материал"}
              </div>
            </div>
          </div>
        </td>
        <td className="px-4 py-4">
        <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1", meta.badgeClass)}>
          {meta.label}
        </span>
        </td>
        <td className="max-w-[240px] px-4 py-4 text-sm text-slate-600">
          <div className="truncate" title={material.fileName}>{material.fileName || "—"}</div>
        </td>
        <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-600">{formatBytes(material.size)}</td>
        <td className="whitespace-nowrap px-4 py-4">
          <div className="text-sm text-slate-700">{formatDate(material.createdAt)}</div>
          <div className="mt-0.5 text-xs text-slate-400">{formatTime(material.createdAt)}</div>
        </td>
        <td className="px-4 py-4">
          <div className="flex items-center justify-end gap-2">
            <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onDownload();
                }}
                disabled={disabled}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50"
            >
              <ArrowDownToLine size={15} />
              Скачать
            </button>
            <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onAssign();
                }}
                disabled={disabled}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 disabled:opacity-50"
            >
              <UserPlus size={15} />
              Назначить
            </button>

            <div className="relative">
              <button
                  type="button"
                  aria-label="Дополнительные действия"
                  aria-expanded={menuOpen}
                  onClick={(event) => {
                    event.stopPropagation();
                    onToggleMenu();
                  }}
                  disabled={disabled}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
              >
                <MoreVertical size={17} />
              </button>
              {menuOpen && (
                  <div className="absolute right-0 top-full z-20 mt-1 w-40 rounded-xl border border-slate-200 bg-white p-1.5 shadow-[0_14px_35px_rgba(15,23,42,0.14)]">
                    <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          onDelete();
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-red-600 transition hover:bg-red-50"
                    >
                      <Trash2 size={15} />
                      Удалить
                    </button>
                  </div>
              )}
            </div>
          </div>
        </td>
      </tr>
  );
}

function LoadingRows() {
  return (
      <div className="space-y-3 p-5">
        {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-14 animate-pulse rounded-xl bg-slate-100" />
        ))}
      </div>
  );
}

function EmptyState({ hasFilters, onReset }: { hasFilters: boolean; onReset: () => void }) {
  return (
      <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
        <FileText size={25} />
      </span>
        <h2 className="mt-4 text-lg font-bold text-slate-900">
          {hasFilters ? "Материалы не найдены" : "Материалов пока нет"}
        </h2>
        <p className="mt-1 max-w-md text-sm leading-6 text-slate-500">
          {hasFilters
              ? "Измените запрос или сбросьте фильтры."
              : "Создайте первый материал, чтобы назначить его группе или учебной сессии."}
        </p>
        {hasFilters && (
            <button
                type="button"
                onClick={onReset}
                className="mt-4 rounded-xl bg-violet-50 px-4 py-2 text-sm font-semibold text-violet-700 transition hover:bg-violet-100"
            >
              Сбросить поиск и фильтры
            </button>
        )}
      </div>
  );
}

function PaginationButton({
                            label,
                            disabled,
                            onClick,
                            children,
                          }: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
      <button
          type="button"
          aria-label={label}
          disabled={disabled}
          onClick={onClick}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-300"
      >
        {children}
      </button>
  );
}

function getCreateKindFromFile(file: File): CreateKind | null {
  const mime = String(file.type || "").toLowerCase();
  const name = String(file.name || "").toLowerCase();

  if (mime.startsWith("image/") || /\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(name)) return "image";
  if (mime.startsWith("video/") || /\.(mp4|mov|avi|mkv|webm|m4v)$/i.test(name)) return "video";
  if (mime.startsWith("audio/") || /\.(mp3|wav|ogg|m4a|aac|flac|wma|opus)$/i.test(name)) return "audio";
  if (/\.(pdf|docx?|xlsx?|pptx?|txt|rtf|csv)$/i.test(name) || mime.includes("pdf") || mime.includes("document") || mime.startsWith("text/")) return "document";
  return null;
}

function getMaterialKind(material: MaterialRow): Exclude<MaterialKind, "all"> {
  const mime = String(material.mimeType || "").toLowerCase();
  const name = String(material.fileName || "").toLowerCase();

  if (mime.startsWith("image/") || /\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(name)) return "image";
  if (mime.startsWith("video/") || /\.(mp4|mov|avi|mkv|webm|m4v)$/i.test(name)) return "video";
  if (mime.startsWith("audio/") || /\.(mp3|wav|ogg|m4a|aac|flac|wma|opus)$/i.test(name)) return "audio";
  if (
      mime.includes("pdf") ||
      mime.includes("document") ||
      mime.includes("text") ||
      mime.includes("sheet") ||
      mime.includes("presentation") ||
      /\.(pdf|docx?|xlsx?|pptx?|txt|rtf|csv)$/i.test(name)
  ) {
    return "document";
  }

  return "other";
}

function formatBytes(value: number | null): string {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return "—";
  if (value < 1024) return `${value} Б`;
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} КБ`;
  if (value < 1024 * 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} МБ`;
  return `${(value / (1024 * 1024 * 1024)).toFixed(1)} ГБ`;
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || "—";
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatShare(count: number, total: number): string {
  if (total <= 0) return "0% от всех";
  return `${Math.round((count / total) * 100)}% от всех`;
}

function getPageNumbers(current: number, total: number): number[] {
  if (total <= 5) return Array.from({ length: total }, (_, index) => index + 1);
  const start = Math.max(1, Math.min(current - 2, total - 4));
  return Array.from({ length: 5 }, (_, index) => start + index);
}

function getAssignmentLabel(
    assignment: MaterialAssignmentRow,
    groups: TeacherGroup[],
    sessions: GroupSession[]
): string {
  if (assignment.sessionId) {
    const session = sessions.find((item) => item.id === assignment.sessionId);
    return `Сессия: ${session?.title || assignment.sessionId}`;
  }

  const group = groups.find((item) => item.id === assignment.groupId);
  return `Группа: ${group?.name || assignment.groupId}`;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return "Произошла неизвестная ошибка.";
}
