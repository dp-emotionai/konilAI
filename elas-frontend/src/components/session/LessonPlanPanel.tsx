"use client";

import { useEffect, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Button from "@/components/ui/Button";
import { lessonPlansApi, type LessonPlan } from "@/lib/api/lessonPlans";

function today() {
    return new Date().toISOString().slice(0, 10);
}

const contentClass =
    "text-sm text-slate-700 " +
    "[&_h1]:mb-3 [&_h1]:text-2xl [&_h1]:font-bold " +
    "[&_h2]:mb-2 [&_h2]:text-xl [&_h2]:font-bold " +
    "[&_h3]:mb-2 [&_h3]:text-lg [&_h3]:font-bold " +
    "[&_p]:mb-2 " +
    "[&_ul]:mb-3 [&_ul]:ml-6 [&_ul]:list-disc " +
    "[&_ol]:mb-3 [&_ol]:ml-6 [&_ol]:list-decimal " +
    "[&_li]:mb-1 " +
    "[&_a]:text-violet-600 [&_a]:underline " +
    "[&_u]:underline";

export default function LessonPlanPanel({
                                            sessionId,
                                            role,
                                        }: {
    sessionId: string;
    role: "teacher" | "student";
}) {
    const [date, setDate] = useState(today());
    const [plan, setPlan] = useState<LessonPlan | null>(null);
    const [title, setTitle] = useState("");
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: {
                    levels: [1, 2, 3],
                },
                bulletList: {
                    keepMarks: true,
                    keepAttributes: false,
                },
                orderedList: {
                    keepMarks: true,
                    keepAttributes: false,
                },
            }),
            Underline,
            Link.configure({
                openOnClick: true,
                autolink: true,
                linkOnPaste: true,
            }),
        ],
        content: "",
        immediatelyRender: false,
        editorProps: {
            attributes: {
                class:
                    "min-h-[170px] rounded-b-2xl border border-t-0 border-slate-200 bg-white px-4 py-3 outline-none " +
                    contentClass,
            },
        },
    });

    useEffect(() => {
        if (!sessionId || !editor) return;

        const currentEditor = editor;
        let cancelled = false;

        async function loadPlan() {
            setLoading(true);
            setError("");

            try {
                const data = await lessonPlansApi.getToday(sessionId, date);

                if (cancelled) return;

                setPlan(data);
                setTitle(data?.title ?? "");
                currentEditor.commands.setContent(data?.description || "");
            } catch (err) {
                if (!cancelled) {
                    setError(err instanceof Error ? err.message : "Ошибка загрузки плана");
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        loadPlan();

        return () => {
            cancelled = true;
        };
    }, [sessionId, date, editor]);

    async function savePlan() {
        if (!sessionId || !editor || saving) return;

        const cleanTitle = title.trim();
        if (!cleanTitle) {
            setError("Напиши тему занятия");
            return;
        }

        setSaving(true);
        setError("");

        try {
            const description = editor.getHTML();

            const saved = plan
                ? await lessonPlansApi.update(plan.id, {
                    date,
                    title: cleanTitle,
                    description,
                })
                : await lessonPlansApi.save(sessionId, {
                    date,
                    title: cleanTitle,
                    description,
                });

            setPlan(saved);
            setTitle(saved.title);
            editor.commands.setContent(saved.description || "");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Не удалось сохранить план");
        } finally {
            setSaving(false);
        }
    }

    async function deletePlan() {
        if (!plan || saving) return;

        setSaving(true);
        setError("");

        try {
            await lessonPlansApi.remove(plan.id);

            setPlan(null);
            setTitle("");
            editor?.commands.clearContent();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Не удалось удалить план");
        } finally {
            setSaving(false);
        }
    }

    function addLink() {
        if (!editor) return;

        const previousUrl = editor.getAttributes("link").href;
        const url = window.prompt("Вставь ссылку", previousUrl || "");

        if (url === null) return;

        if (url === "") {
            editor.chain().focus().extendMarkRange("link").unsetLink().run();
            return;
        }

        editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    }

    return (
        <div className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
            <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                    <h3 className="font-bold text-slate-900">План занятия</h3>
                    <p className="text-xs text-slate-500">План на выбранный день</p>
                </div>

                <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-violet-300"
                />
            </div>

            {role === "teacher" ? (
                <div className="space-y-3">
                    <input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Тема занятия"
                        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-violet-300"
                    />

                    <div>
                        <div className="flex flex-wrap items-center gap-2 rounded-t-2xl border border-slate-200 bg-white px-3 py-2">
                            <button type="button" onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()} className="rounded-lg px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100">H1</button>
                            <button type="button" onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} className="rounded-lg px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100">H2</button>
                            <button type="button" onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()} className="rounded-lg px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100">H3</button>
                            <button type="button" onClick={() => editor?.chain().focus().setParagraph().run()} className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100">P</button>

                            <div className="mx-1 h-7 w-px bg-slate-200" />

                            <button type="button" onClick={() => editor?.chain().focus().toggleBold().run()} className="rounded-lg px-3 py-2 text-lg font-bold text-slate-600 hover:bg-slate-100">B</button>
                            <button type="button" onClick={() => editor?.chain().focus().toggleItalic().run()} className="rounded-lg px-3 py-2 text-lg italic text-slate-600 hover:bg-slate-100">I</button>
                            <button type="button" onClick={() => editor?.chain().focus().toggleUnderline().run()} className="rounded-lg px-3 py-2 text-lg underline text-slate-600 hover:bg-slate-100">U</button>

                            <div className="mx-1 h-7 w-px bg-slate-200" />

                            <button type="button" onClick={() => editor?.chain().focus().toggleBulletList().run()} className="rounded-lg px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100">• List</button>
                            <button type="button" onClick={() => editor?.chain().focus().toggleOrderedList().run()} className="rounded-lg px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100">1. List</button>
                            <button type="button" onClick={addLink} className="rounded-lg px-3 py-2 text-lg text-slate-600 hover:bg-slate-100">🔗</button>
                        </div>

                        <EditorContent editor={editor} />
                    </div>

                    <div className="flex gap-2">
                        <Button type="button" onClick={savePlan} disabled={saving || loading}>
                            {saving ? "Сохраняю..." : plan ? "Обновить план" : "Создать план"}
                        </Button>

                        {plan && (
                            <Button type="button" variant="danger" onClick={deletePlan} disabled={saving}>
                                Удалить
                            </Button>
                        )}
                    </div>
                </div>
            ) : loading ? (
                <p className="text-sm text-slate-500">Загрузка...</p>
            ) : plan ? (
                <div>
                    <div className="font-semibold text-slate-900">{plan.title}</div>

                    {plan.description && (
                        <div
                            className={`mt-3 ${contentClass}`}
                            dangerouslySetInnerHTML={{ __html: plan.description }}
                        />
                    )}
                </div>
            ) : (
                <p className="text-sm text-slate-500">
                    На этот день план занятия ещё не добавлен.
                </p>
            )}
        </div>
    );
}