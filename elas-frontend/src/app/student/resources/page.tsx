"use client";

import {
    useCallback,
    useEffect,
    useMemo,
    useState,
    type ComponentType,
} from "react";
import {
    ArrowDownToLine,
    CalendarDays,
    ChevronLeft,
    ChevronRight,
    File,
    FileImage,
    FileText,
    Image as ImageIcon,
    Music2,
    RefreshCw,
    Search,
    ShieldCheck,
    UsersRound,
    Video,
} from "lucide-react";

import Button from "@/components/ui/Button";
import MaterialPreviewModal from "@/components/resources/MaterialPreviewModal";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";
import {
    getMaterialDownload,
    getStudentMaterials,
    resolveDownloadUrl,
    type AssignedMaterialRow,
} from "@/lib/api/materials";
import { ChatClient } from "@/lib/ws/chatClient";

type MaterialKind = "all" | "document" | "image" | "video" | "audio" | "other";
type SortMode = "newest" | "oldest" | "name";
type GroupFilter = "all" | "no-group" | string;

type MaterialMeta = {
    label: string;
    plural: string;
    icon: ComponentType<{ size?: number; className?: string }>;
    iconClass: string;
    badgeClass: string;
};

const TABS: Array<{ id: MaterialKind; label: string }> = [
    { id: "all", label: "Все материалы" },
    { id: "document", label: "Документы" },
    { id: "image", label: "Изображения" },
    { id: "video", label: "Видеоуроки" },
    { id: "audio", label: "Аудиозаписи" },
];

const KIND_META: Record<Exclude<MaterialKind, "all">, MaterialMeta> = {
    document: {
        label: "Документ",
        plural: "Документы",
        icon: FileText,
        iconClass: "bg-blue-50 text-blue-600",
        badgeClass: "bg-blue-50 text-blue-700 ring-blue-100",
    },
    image: {
        label: "Изображение",
        plural: "Изображения",
        icon: FileImage,
        iconClass: "bg-emerald-50 text-emerald-600",
        badgeClass: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    },
    video: {
        label: "Видеоурок",
        plural: "Видеоуроки",
        icon: Video,
        iconClass: "bg-rose-50 text-rose-500",
        badgeClass: "bg-rose-50 text-rose-600 ring-rose-100",
    },
    audio: {
        label: "Аудиозапись",
        plural: "Аудиозаписи",
        icon: Music2,
        iconClass: "bg-violet-50 text-violet-600",
        badgeClass: "bg-violet-50 text-violet-700 ring-violet-100",
    },
    other: {
        label: "Файл",
        plural: "Другие",
        icon: File,
        iconClass: "bg-slate-100 text-slate-600",
        badgeClass: "bg-slate-100 text-slate-700 ring-slate-200",
    },
};

export default function StudentResourcesPage() {
    const { push } = useToast();

    const [materials, setMaterials] = useState<AssignedMaterialRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [query, setQuery] = useState("");
    const [kind, setKind] = useState<MaterialKind>("all");
    const [groupFilter, setGroupFilter] = useState<GroupFilter>("all");
    const [sort, setSort] = useState<SortMode>("newest");
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [downloadingId, setDownloadingId] = useState<string | null>(null);
    const [previewMaterial, setPreviewMaterial] = useState<AssignedMaterialRow | null>(null);

    const loadMaterials = useCallback(async () => {
        setLoading(true);

        try {
            const list = await getStudentMaterials();
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

            if (type === "material.assigned" || type === "material.unassigned") {
                void loadMaterials();
            }
        });

        client.connect();
        client.joinUser();

        return () => client.disconnect();
    }, [loadMaterials]);

    useEffect(() => {
        setPage(1);
    }, [groupFilter, kind, pageSize, query, sort]);

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

    const groupOptions = useMemo(() => {
        const map = new Map<string, string>();

        for (const material of materials) {
            const groupId = String(material.group?.id || material.groupId || "").trim();
            if (!groupId) continue;
            map.set(groupId, getMaterialGroupName(material));
        }

        return Array.from(map.entries())
            .map(([id, name]) => ({ id, name }))
            .sort((left, right) => left.name.localeCompare(right.name, "ru"));
    }, [materials]);

    const filteredMaterials = useMemo(() => {
        const normalizedQuery = query.trim().toLowerCase();

        return materials
            .filter((material) => {
                const materialKind = getMaterialKind(material);
                const matchesKind = kind === "all" || materialKind === kind;
                const groupId = String(material.group?.id || material.groupId || "").trim();
                const matchesGroup =
                    groupFilter === "all" ||
                    (groupFilter === "no-group" ? !groupId : groupId === groupFilter);

                if (!matchesKind || !matchesGroup) return false;
                if (!normalizedQuery) return true;

                return [
                    material.title,
                    material.description,
                    material.fileName,
                    material.mimeType,
                    getMaterialGroupName(material),
                ]
                    .filter(Boolean)
                    .some((value) => String(value).toLowerCase().includes(normalizedQuery));
            })
            .sort((left, right) => {
                if (sort === "name") {
                    return left.title.localeCompare(right.title, "ru");
                }

                const leftTime = toTimestamp(left.createdAt);
                const rightTime = toTimestamp(right.createdAt);

                return sort === "oldest" ? leftTime - rightTime : rightTime - leftTime;
            });
    }, [groupFilter, kind, materials, query, sort]);

    const totalPages = Math.max(1, Math.ceil(filteredMaterials.length / pageSize));
    const safePage = Math.min(page, totalPages);
    const startIndex = (safePage - 1) * pageSize;
    const paginatedMaterials = filteredMaterials.slice(startIndex, startIndex + pageSize);

    const handleDownload = useCallback(
        async (material: AssignedMaterialRow) => {
            setDownloadingId(material.materialId);

            try {
                const info = await getMaterialDownload(material.materialId);

                if (!info?.downloadUrl) {
                    throw new Error("Ссылка на скачивание не получена.");
                }

                const url = resolveDownloadUrl(info.downloadUrl);

                if (!url) {
                    throw new Error("Не удалось сформировать ссылку на файл.");
                }

                window.open(url, "_blank", "noreferrer");
            } catch (error: unknown) {
                push({
                    type: "error",
                    title: "Не удалось скачать материал",
                    text: getErrorMessage(error),
                });
            } finally {
                setDownloadingId(null);
            }
        },
        [push]
    );

    return (
        <div className="relative min-h-screen overflow-hidden bg-[#FAFAFB]">
            <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-28 top-24 h-80 w-80 rounded-full bg-violet-200/30 blur-3xl"
            />
            <div
                aria-hidden="true"
                className="pointer-events-none absolute -left-28 top-[520px] h-72 w-72 rounded-full bg-blue-100/60 blur-3xl"
            />

            <div className="relative z-10 mx-auto max-w-[1480px] px-4 py-8 md:px-8">
                <header className="overflow-hidden rounded-[28px] border border-violet-100/80 bg-[radial-gradient(circle_at_82%_12%,rgba(139,92,246,0.16),transparent_24%),linear-gradient(135deg,#ffffff_0%,#fbfaff_55%,#f4f0ff_100%)] px-5 py-7 shadow-[0_20px_60px_rgba(88,57,180,0.08)] sm:px-7 md:px-9">
                    <div className="grid items-end gap-6 lg:grid-cols-[minmax(0,1fr)_auto]">
                        <div>
                            <div className="inline-flex items-center gap-2 rounded-full border border-violet-100 bg-white/85 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-violet-600 shadow-sm">
                                <ShieldCheck size={14} />
                                Материалы для обучения
                            </div>

                            <h1 className="mt-4 text-4xl font-bold tracking-[-0.04em] text-slate-950 sm:text-5xl">
                                Учебные материалы
                            </h1>

                            <p className="mt-3 max-w-2xl text-[15px] leading-7 text-slate-600">
                                Здесь собраны документы, изображения, видео и аудиозаписи, которые преподаватель назначил вашей группе или сессии.
                            </p>
                        </div>

                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                            <label className="relative block min-w-[260px]">
                                <Search
                                    size={18}
                                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                                />
                                <input
                                    value={query}
                                    onChange={(event) => setQuery(event.target.value)}
                                    placeholder="Поиск материалов..."
                                    className="h-12 w-full rounded-xl border border-slate-200 bg-white/90 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                                />
                            </label>

                            <Button
                                variant="outline"
                                onClick={() => void loadMaterials()}
                                disabled={loading}
                                className="h-12 gap-2 bg-white/90"
                            >
                                <RefreshCw size={17} className={loading ? "animate-spin" : ""} />
                                Обновить
                            </Button>
                        </div>
                    </div>
                </header>

                <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                    <SummaryCard
                        title="Всего материалов"
                        value={counts.all}
                        icon={FileText}
                        iconClass="bg-violet-50 text-violet-600"
                        hint="Назначено преподавателем"
                    />
                    <SummaryCard
                        title="Документы"
                        value={counts.document}
                        icon={FileText}
                        iconClass="bg-blue-50 text-blue-600"
                        hint={getPercentLabel(counts.document, counts.all)}
                    />
                    <SummaryCard
                        title="Изображения"
                        value={counts.image}
                        icon={ImageIcon}
                        iconClass="bg-emerald-50 text-emerald-600"
                        hint={getPercentLabel(counts.image, counts.all)}
                    />
                    <SummaryCard
                        title="Видеоуроки"
                        value={counts.video}
                        icon={Video}
                        iconClass="bg-rose-50 text-rose-500"
                        hint={getPercentLabel(counts.video, counts.all)}
                    />
                    <SummaryCard
                        title="Аудиозаписи"
                        value={counts.audio}
                        icon={Music2}
                        iconClass="bg-violet-50 text-violet-600"
                        hint={getPercentLabel(counts.audio, counts.all)}
                    />
                </section>

                <section className="mt-6 overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_16px_50px_rgba(15,23,42,0.07)]">
                    <div className="flex flex-col gap-4 border-b border-slate-100 bg-[linear-gradient(135deg,#fbfaff,#ffffff)] px-4 py-4 md:flex-row md:items-center md:justify-between md:px-5">
                        <div className="flex max-w-full gap-2 overflow-x-auto pb-1">
                            {TABS.map((tab) => {
                                const active = kind === tab.id;
                                const count = counts[tab.id];

                                return (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        onClick={() => setKind(tab.id)}
                                        className={cn(
                                            "inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border px-4 text-sm font-semibold transition",
                                            active
                                                ? "border-violet-300 bg-violet-50 text-violet-700 shadow-sm"
                                                : "border-slate-200 bg-white text-slate-500 hover:border-violet-200 hover:text-violet-600"
                                        )}
                                    >
                                        {tab.label}
                                        <span
                                            className={cn(
                                                "rounded-full px-2 py-0.5 text-[11px]",
                                                active ? "bg-violet-100 text-violet-700" : "bg-slate-100 text-slate-500"
                                            )}
                                        >
                      {count}
                    </span>
                                    </button>
                                );
                            })}
                        </div>

                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                            <label className="flex items-center gap-2 text-sm text-slate-500">
                                <span className="shrink-0">Группа:</span>
                                <select
                                    value={groupFilter}
                                    onChange={(event) => setGroupFilter(event.target.value)}
                                    className="h-10 max-w-[260px] rounded-xl border border-slate-200 bg-white px-3 font-semibold text-slate-700 outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                                >
                                    <option value="all">Все группы</option>
                                    {groupOptions.map((group) => (
                                        <option key={group.id} value={group.id}>
                                            {group.name}
                                        </option>
                                    ))}
                                    <option value="no-group">Без группы</option>
                                </select>
                            </label>

                            <label className="flex items-center gap-2 text-sm text-slate-500">
                                <span className="shrink-0">Сортировка:</span>
                                <select
                                    value={sort}
                                    onChange={(event) => setSort(event.target.value as SortMode)}
                                    className="h-10 rounded-xl border border-slate-200 bg-white px-3 font-semibold text-slate-700 outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                                >
                                    <option value="newest">Сначала новые</option>
                                    <option value="oldest">Сначала старые</option>
                                    <option value="name">По названию</option>
                                </select>
                            </label>
                        </div>
                    </div>

                    {loading ? (
                        <LoadingState />
                    ) : filteredMaterials.length === 0 ? (
                        <EmptyState hasSearch={Boolean(query.trim()) || kind !== "all"} />
                    ) : (
                        <>
                            <div className="hidden overflow-x-auto md:block">
                                <table className="w-full min-w-[1040px] border-collapse text-left">
                                    <thead>
                                    <tr className="border-b border-slate-100 bg-slate-50/70 text-xs font-bold uppercase tracking-wide text-slate-400">
                                        <th className="px-5 py-4">Название</th>
                                        <th className="px-5 py-4">Тип</th>
                                        <th className="px-5 py-4">Файл</th>
                                        <th className="px-5 py-4">Размер</th>
                                        <th className="px-5 py-4">Группа</th>
                                        <th className="px-5 py-4">Доступ</th>
                                        <th className="px-5 py-4 text-right">Действие</th>
                                    </tr>
                                    </thead>

                                    <tbody>
                                    {paginatedMaterials.map((material) => (
                                        <MaterialTableRow
                                            key={material.assignmentId}
                                            material={material}
                                            downloading={downloadingId === material.materialId}
                                            onPreview={() => setPreviewMaterial(material)}
                                            onDownload={() => void handleDownload(material)}
                                        />
                                    ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="grid gap-3 p-4 md:hidden">
                                {paginatedMaterials.map((material) => (
                                    <MaterialMobileCard
                                        key={material.assignmentId}
                                        material={material}
                                        downloading={downloadingId === material.materialId}
                                        onPreview={() => setPreviewMaterial(material)}
                                        onDownload={() => void handleDownload(material)}
                                    />
                                ))}
                            </div>

                            <div className="flex flex-col gap-4 border-t border-slate-100 bg-slate-50/50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between md:px-5">
                                <div className="text-sm text-slate-500">
                                    Показано{" "}
                                    <span className="font-semibold text-slate-700">
                    {startIndex + 1}–{Math.min(startIndex + pageSize, filteredMaterials.length)}
                  </span>{" "}
                                    из{" "}
                                    <span className="font-semibold text-slate-700">
                    {filteredMaterials.length}
                  </span>
                                </div>

                                <div className="flex flex-wrap items-center gap-3">
                                    <label className="flex items-center gap-2 text-sm text-slate-500">
                                        Показывать по
                                        <select
                                            value={pageSize}
                                            onChange={(event) => setPageSize(Number(event.target.value))}
                                            className="h-9 rounded-lg border border-slate-200 bg-white px-2 font-semibold text-slate-700 outline-none focus:border-violet-400"
                                        >
                                            <option value={5}>5</option>
                                            <option value={10}>10</option>
                                            <option value={20}>20</option>
                                        </select>
                                    </label>

                                    <div className="flex items-center gap-1">
                                        <button
                                            type="button"
                                            onClick={() => setPage((current) => Math.max(1, current - 1))}
                                            disabled={safePage <= 1}
                                            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-violet-200 hover:text-violet-600 disabled:cursor-not-allowed disabled:opacity-40"
                                            aria-label="Предыдущая страница"
                                        >
                                            <ChevronLeft size={17} />
                                        </button>

                                        {getPageNumbers(safePage, totalPages).map((pageNumber) => (
                                            <button
                                                key={pageNumber}
                                                type="button"
                                                onClick={() => setPage(pageNumber)}
                                                className={cn(
                                                    "flex h-9 min-w-9 items-center justify-center rounded-lg border px-2 text-sm font-semibold transition",
                                                    pageNumber === safePage
                                                        ? "border-violet-300 bg-violet-50 text-violet-700"
                                                        : "border-slate-200 bg-white text-slate-500 hover:border-violet-200 hover:text-violet-600"
                                                )}
                                            >
                                                {pageNumber}
                                            </button>
                                        ))}

                                        <button
                                            type="button"
                                            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                                            disabled={safePage >= totalPages}
                                            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-violet-200 hover:text-violet-600 disabled:cursor-not-allowed disabled:opacity-40"
                                            aria-label="Следующая страница"
                                        >
                                            <ChevronRight size={17} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </section>
            </div>

            <MaterialPreviewModal
                open={Boolean(previewMaterial)}
                material={previewMaterial}
                onClose={() => setPreviewMaterial(null)}
            />
        </div>
    );
}

function SummaryCard({
                         title,
                         value,
                         icon: Icon,
                         iconClass,
                         hint,
                     }: {
    title: string;
    value: number;
    icon: ComponentType<{ size?: number; className?: string }>;
    iconClass: string;
    hint: string;
}) {
    return (
        <article className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-[0_12px_34px_rgba(15,23,42,0.05)]">
            <div className="flex items-center gap-4">
                <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl", iconClass)}>
                    <Icon size={23} />
                </div>

                <div className="min-w-0">
                    <div className="truncate text-xs font-semibold text-slate-500">{title}</div>
                    <div className="mt-1 text-2xl font-bold text-slate-950">{value}</div>
                    <div className="mt-1 truncate text-[11px] text-slate-400">{hint}</div>
                </div>
            </div>
        </article>
    );
}

function MaterialTableRow({
                              material,
                              downloading,
                              onPreview,
                              onDownload,
                          }: {
    material: AssignedMaterialRow;
    downloading: boolean;
    onPreview: () => void;
    onDownload: () => void;
}) {
    const kind = getMaterialKind(material);
    const meta = KIND_META[kind];
    const Icon = meta.icon;

    return (
        <tr onClick={onPreview} className="cursor-pointer border-b border-slate-100 transition hover:bg-violet-50/30 last:border-b-0">
            <td className="px-5 py-4">
                <div className="flex min-w-[240px] items-start gap-3">
                    <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl", meta.iconClass)}>
                        <Icon size={21} />
                    </div>

                    <div className="min-w-0">
                        <div className="max-w-[320px] truncate font-semibold text-slate-900">
                            {material.title}
                        </div>
                        <div className="mt-1 max-w-[340px] truncate text-xs text-slate-500">
                            {material.description || "Без описания"}
                        </div>
                    </div>
                </div>
            </td>

            <td className="px-5 py-4">
        <span
            className={cn(
                "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset",
                meta.badgeClass
            )}
        >
          {meta.label}
        </span>
            </td>

            <td className="px-5 py-4">
                <div className="max-w-[220px] truncate text-sm font-medium text-slate-700">
                    {material.fileName || "Файл материала"}
                </div>
                <div className="mt-1 max-w-[220px] truncate text-xs text-slate-400">
                    {material.mimeType || "Тип не указан"}
                </div>
            </td>

            <td className="px-5 py-4 text-sm font-medium text-slate-600">
                {formatBytes(material.size)}
            </td>

            <td className="px-5 py-4">
                <GroupBadge material={material} />
            </td>

            <td className="px-5 py-4">
                <AccessWindow material={material} />
            </td>

            <td className="px-5 py-4 text-right">
                <Button
                    size="sm"
                    variant="outline"
                    onClick={(event) => {
                        event.stopPropagation();
                        onDownload();
                    }}
                    disabled={downloading}
                    className="gap-2"
                >
                    <ArrowDownToLine size={15} />
                    {downloading ? "Подготовка..." : "Скачать"}
                </Button>
            </td>
        </tr>
    );
}

function MaterialMobileCard({
                                material,
                                downloading,
                                onPreview,
                                onDownload,
                            }: {
    material: AssignedMaterialRow;
    downloading: boolean;
    onPreview: () => void;
    onDownload: () => void;
}) {
    const kind = getMaterialKind(material);
    const meta = KIND_META[kind];
    const Icon = meta.icon;

    return (
        <article onClick={onPreview} className="cursor-pointer rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-violet-200 hover:bg-violet-50/20">
            <div className="flex items-start gap-3">
                <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl", meta.iconClass)}>
                    <Icon size={22} />
                </div>

                <div className="min-w-0 flex-1">
                    <div className="font-semibold text-slate-900">{material.title}</div>
                    <div className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                        {material.description || "Без описания"}
                    </div>
                </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                <InfoItem label="Тип" value={meta.label} />
                <InfoItem label="Размер" value={formatBytes(material.size)} />
                <InfoItem label="Файл" value={material.fileName || "—"} />
                <InfoItem label="Группа" value={getMaterialGroupName(material)} />
                <InfoItem label="Добавлен" value={formatDate(material.createdAt)} />
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
                <GroupBadge material={material} />
                <AccessWindow material={material} />
            </div>

            <Button
                variant="outline"
                onClick={(event) => {
                    event.stopPropagation();
                    onDownload();
                }}
                disabled={downloading}
                className="mt-4 w-full gap-2"
            >
                <ArrowDownToLine size={16} />
                {downloading ? "Подготовка файла..." : "Скачать материал"}
            </Button>
        </article>
    );
}

function getMaterialGroupName(material: AssignedMaterialRow): string {
    return String(material.group?.name || material.groupName || material.groupId || "Без группы").trim();
}

function GroupBadge({ material }: { material: AssignedMaterialRow }) {
    const groupName = getMaterialGroupName(material);
    const hasGroup = Boolean(material.group?.id || material.groupId || material.groupName);

    return (
        <span
            className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
                hasGroup ? "bg-violet-50 text-violet-700" : "bg-slate-100 text-slate-500"
            )}
            title={groupName}
        >
        <UsersRound size={13} />
        <span className="max-w-[160px] truncate">{groupName}</span>
      </span>
    );
}

function AccessWindow({ material }: { material: AssignedMaterialRow }) {
    if (!material.visibleFrom && !material.visibleTo) {
        return (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
        <ShieldCheck size={13} />
        Доступен
      </span>
        );
    }

    const parts: string[] = [];

    if (material.visibleFrom) {
        parts.push(`с ${formatDate(material.visibleFrom)}`);
    }

    if (material.visibleTo) {
        parts.push(`до ${formatDate(material.visibleTo)}`);
    }

    return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
      <CalendarDays size={13} />
            {parts.join(" ")}
    </span>
    );
}

function InfoItem({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-xl bg-slate-50 p-3">
            <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</div>
            <div className="mt-1 truncate font-semibold text-slate-700">{value}</div>
        </div>
    );
}

function LoadingState() {
    return (
        <div className="grid gap-3 p-4 md:p-5">
            {Array.from({ length: 5 }).map((_, index) => (
                <div
                    key={index}
                    className="h-20 animate-pulse rounded-2xl border border-slate-100 bg-slate-50"
                />
            ))}
        </div>
    );
}

function EmptyState({ hasSearch }: { hasSearch: boolean }) {
    return (
        <div className="flex min-h-[340px] flex-col items-center justify-center px-5 py-12 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-[24px] border border-violet-100 bg-violet-50 text-violet-500">
                <FileText size={34} />
            </div>

            <h2 className="mt-5 text-xl font-bold text-slate-950">
                {hasSearch ? "Материалы не найдены" : "Пока нет назначенных материалов"}
            </h2>

            <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                {hasSearch
                    ? "Измените поисковый запрос или выберите другую категорию."
                    : "Когда преподаватель назначит материал вашей группе или сессии, он появится на этой странице."}
            </p>
        </div>
    );
}

function getMaterialKind(material: AssignedMaterialRow): Exclude<MaterialKind, "all"> {
    const mime = String(material.mimeType || "").toLowerCase();
    const fileName = String(material.fileName || "").toLowerCase();
    const extension = fileName.includes(".") ? fileName.split(".").pop() || "" : "";

    if (
        mime.startsWith("image/") ||
        ["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp", "avif"].includes(extension)
    ) {
        return "image";
    }

    if (
        mime.startsWith("video/") ||
        ["mp4", "mov", "avi", "mkv", "webm", "m4v"].includes(extension)
    ) {
        return "video";
    }

    if (
        mime.startsWith("audio/") ||
        ["mp3", "wav", "ogg", "m4a", "aac", "flac", "wma", "opus"].includes(extension)
    ) {
        return "audio";
    }

    if (
        mime.includes("pdf") ||
        mime.includes("document") ||
        mime.includes("spreadsheet") ||
        mime.includes("presentation") ||
        mime.startsWith("text/") ||
        ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "rtf", "csv"].includes(
            extension
        )
    ) {
        return "document";
    }

    return "other";
}

function formatBytes(value: number | null): string {
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return "—";
    if (value < 1024) return `${value} Б`;
    if (value < 1024 * 1024) return `${Math.round(value / 1024)} КБ`;
    if (value < 1024 * 1024 * 1024) {
        return `${(value / (1024 * 1024)).toFixed(value >= 10 * 1024 * 1024 ? 0 : 1)} МБ`;
    }

    return `${(value / (1024 * 1024 * 1024)).toFixed(1)} ГБ`;
}

function formatDate(value: string | null): string {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "—";

    return date.toLocaleDateString("ru-RU", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
}

function toTimestamp(value: string | null): number {
    if (!value) return 0;

    const timestamp = new Date(value).getTime();

    return Number.isFinite(timestamp) ? timestamp : 0;
}

function getPercentLabel(value: number, total: number): string {
    if (total <= 0) return "0% от всех";
    return `${Math.round((value / total) * 100)}% от всех`;
}

function getPageNumbers(currentPage: number, totalPages: number): number[] {
    if (totalPages <= 5) {
        return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    const start = Math.max(1, Math.min(currentPage - 2, totalPages - 4));

    return Array.from({ length: 5 }, (_, index) => start + index);
}

function getErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message) return error.message;
    return "Произошла неизвестная ошибка.";
}
