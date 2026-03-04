"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PageHero from "@/components/common/PageHero";
import Reveal from "@/components/common/Reveal";
import {Card} from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import { getTeacherGroups, createSession, type TeacherGroup } from "@/lib/api/teacher";
import { hasAuth, getApiBaseUrl } from "@/lib/api/client";
import { useToast } from "@/components/ui/Toast";

const POLL_INTERVAL_MS = 12000;

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
  const [created, setCreated] = useState<{ id: string; code: string; title: string } | null>(null);

  const apiAvailable = getApiBaseUrl() && hasAuth();

  useEffect(() => {
    if (!apiAvailable) {
      setGroupsLoading(false);
      return;
    }
    let mounted = true;
    setGroupsLoading(true);
    getTeacherGroups()
      .then((list) => {
        if (mounted) {
          setGroups(list);
          setGroupId((prev) => {
            if (!list.length) return "";
            if (prev && list.some((g) => g.id === prev)) return prev;
            return list[0].id;
          });
        }
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
    const t = title.trim();
    if (!t) {
      setError("Р’РІРµРґРёС‚Рµ РЅР°Р·РІР°РЅРёРµ СЃРµСЃСЃРёРё.");
      return;
    }
    if (!groupId && apiAvailable) {
      setError("Р’С‹Р±РµСЂРёС‚Рµ РіСЂСѓРїРїСѓ. Р•СЃР»Рё РіСЂСѓРїРї РЅРµС‚ вЂ” СЃРѕР·РґР°Р№С‚Рµ РіСЂСѓРїРїСѓ РІ СЂР°Р·РґРµР»Рµ В«Р“СЂСѓРїРїС‹В».");
      return;
    }
    if (!apiAvailable) {
      setError("РЎРµСЂРІРµСЂ РЅРµРґРѕСЃС‚СѓРїРµРЅ. РќР°СЃС‚СЂРѕР№С‚Рµ backend РґР»СЏ СЃРѕР·РґР°РЅРёСЏ СЃРµСЃСЃРёР№.");
      return;
    }
    setCreating(true);
    try {
      const res = await createSession({
        title: t,
        type,
        groupId,
      });
      setCreated({ id: res.id, code: res.code, title: res.title });
      toast.push({ type: "success", title: "РЎРµСЃСЃРёСЏ СЃРѕР·РґР°РЅР°", text: `РљРѕРґ: ${res.code}. РЎС‚СѓРґРµРЅС‚С‹ СѓРІРёРґСЏС‚ РµС‘ РІ СЃРїРёСЃРєРµ.` });
    } catch (err) {
      setError(err instanceof Error ? err.message : "РћС€РёР±РєР° СЃРѕР·РґР°РЅРёСЏ СЃРµСЃСЃРёРё.");
    } finally {
      setCreating(false);
    }
  };

  const joinLink = typeof window !== "undefined" && created
    ? `${window.location.origin}/student/session/${created.id}`
    : "";

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: "РџСЂРµРїРѕРґР°РІР°С‚РµР»СЊ", href: "/teacher/dashboard" },
          { label: "РЎРµСЃСЃРёРё", href: "/teacher/sessions" },
          { label: "РќРѕРІР°СЏ СЃРµСЃСЃРёСЏ" },
        ]}
      />
      <PageHero
        overline="РџСЂРµРїРѕРґР°РІР°С‚РµР»СЊ"
        title="РЎРѕР·РґР°С‚СЊ СЃРµСЃСЃРёСЋ"
        subtitle="Р›РµРєС†РёСЏ РёР»Рё СЌРєР·Р°РјРµРЅ. РџРѕСЃР»Рµ СЃРѕР·РґР°РЅРёСЏ СЃРµСЃСЃРёСЏ РїРѕСЏРІРёС‚СЃСЏ Сѓ СЃС‚СѓРґРµРЅС‚РѕРІ; Р·Р°РїСѓСЃС‚РёС‚Рµ РµС‘, С‡С‚РѕР±С‹ РѕРЅРё РјРѕРіР»Рё РїРѕРґРєР»СЋС‡РёС‚СЊСЃСЏ."
      />

      <div className="grid lg:grid-cols-3 gap-4">
        <Reveal className="lg:col-span-2">
          <Card className="p-6 md:p-7">
            <div className="text-sm text-white/60">РџР°СЂР°РјРµС‚СЂС‹ СЃРµСЃСЃРёРё</div>
            <div className="mt-2 text-lg font-semibold">РћСЃРЅРѕРІРЅРѕРµ</div>

            {!apiAvailable && (
              <div className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
                Р”Р»СЏ СЃРѕР·РґР°РЅРёСЏ СЃРµСЃСЃРёР№ РЅСѓР¶РµРЅ Р·Р°РїСѓС‰РµРЅРЅС‹Р№ backend Рё РІС…РѕРґ РІ Р°РєРєР°СѓРЅС‚.
              </div>
            )}

            {apiAvailable && groupsLoading && (
              <div className="mt-4 h-10 rounded-2xl bg-white/5 animate-pulse" />
            )}

            {apiAvailable && !groupsLoading && groups.length === 0 && (
              <div className="mt-4 rounded-2xl border border-white/10 bg-black/25 p-4">
                <p className="text-sm text-white/70">РЎРЅР°С‡Р°Р»Р° СЃРѕР·РґР°Р№С‚Рµ РіСЂСѓРїРїСѓ.</p>
                <Link href="/teacher/groups" className="mt-2 inline-block text-sm font-medium text-purple-300 hover:text-purple-200">
                  РџРµСЂРµР№С‚Рё РІ В«Р“СЂСѓРїРїС‹В» в†’
                </Link>
              </div>
            )}

            {apiAvailable && !groupsLoading && groups.length > 0 && (
              <>
                <div className="mt-5 grid md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm text-white/60 mb-2 block">РўРёРї</label>
                    <select
                      value={type}
                      onChange={(e) => setType(e.target.value as "lecture" | "exam")}
                      className="h-11 w-full rounded-2xl bg-black/30 border border-white/10 px-4 text-white/80 outline-none focus:ring-2 focus:ring-purple-500/40"
                    >
                      <option value="lecture">Р›РµРєС†РёСЏ</option>
                      <option value="exam">Р­РєР·Р°РјРµРЅ</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm text-white/60 mb-2 block">Р“СЂСѓРїРїР°</label>
                    <select
                      value={groupId}
                      onChange={(e) => setGroupId(e.target.value)}
                      className="h-11 w-full rounded-2xl bg-black/30 border border-white/10 px-4 text-white/80 outline-none focus:ring-2 focus:ring-purple-500/40"
                    >
                      {groups.map((g) => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm text-white/60 mb-2 block">РќР°Р·РІР°РЅРёРµ</label>
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="РќР°РїСЂРёРјРµСЂ: Р’РІРµРґРµРЅРёРµ РІ React"
                    />
                  </div>
                </div>
                {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
                <div className="mt-5 flex flex-wrap gap-2">
                  <Button onClick={handleCreate} disabled={creating}>
                    {creating ? "РЎРѕР·РґР°РЅРёРµвЂ¦" : "РЎРѕР·РґР°С‚СЊ СЃРµСЃСЃРёСЋ"}
                  </Button>
                  <Link href="/teacher/sessions">
                    <Button variant="outline">Рљ СЃРїРёСЃРєСѓ СЃРµСЃСЃРёР№</Button>
                  </Link>
                </div>
              </>
            )}

            {!apiAvailable && (
              <div className="mt-5 rounded-2xl border border-white/10 bg-black/25 p-4 text-sm text-white/60">
                Р’ РґРµРјРѕ-СЂРµР¶РёРјРµ СЃРѕР·РґР°РЅРёРµ СЃРµСЃСЃРёР№ РЅРµРґРѕСЃС‚СѓРїРЅРѕ. Р—Р°РїСѓСЃС‚РёС‚Рµ backend Рё РІРѕР№РґРёС‚Рµ РІ Р°РєРєР°СѓРЅС‚ РїСЂРµРїРѕРґР°РІР°С‚РµР»СЏ.
              </div>
            )}
          </Card>
        </Reveal>

        <Reveal>
          <Card className="p-6 md:p-7">
            <div className="text-sm text-white/60">РџРѕРґРµР»РёС‚СЊСЃСЏ</div>
            <div className="mt-2 text-lg font-semibold">РљРѕРґ Рё СЃСЃС‹Р»РєР° РґР»СЏ СЃС‚СѓРґРµРЅС‚РѕРІ</div>

            {!created ? (
              <div className="mt-4 rounded-2xl border border-white/10 bg-black/25 p-4 text-sm text-white/60">
                РЎРѕР·РґР°Р№С‚Рµ СЃРµСЃСЃРёСЋ вЂ” Р·РґРµСЃСЊ РїРѕСЏРІСЏС‚СЃСЏ РєРѕРґ Рё СЃСЃС‹Р»РєР°. РЎС‚СѓРґРµРЅС‚С‹ СѓРІРёРґСЏС‚ СЃРµСЃСЃРёСЋ РІ СЃРІРѕС‘Рј СЃРїРёСЃРєРµ Рё СЃРјРѕРіСѓС‚ РІРѕР№С‚Рё РїРѕ СЃСЃС‹Р»РєРµ РёР»Рё РїРѕ РєРѕРґСѓ.
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                  <div className="text-sm text-white/60">РљРѕРґ СЃРµСЃСЃРёРё</div>
                  <div className="mt-2 text-2xl font-semibold tracking-widest">{created.code}</div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-3"
                    onClick={() => navigator.clipboard.writeText(created.code)}
                  >
                    РљРѕРїРёСЂРѕРІР°С‚СЊ РєРѕРґ
                  </Button>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                  <div className="text-sm text-white/60">РЎСЃС‹Р»РєР° РґР»СЏ РІС…РѕРґР°</div>
                  <div className="mt-2 text-sm text-white/80 break-all">{joinLink}</div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-3"
                    onClick={() => navigator.clipboard.writeText(joinLink)}
                  >
                    РљРѕРїРёСЂРѕРІР°С‚СЊ СЃСЃС‹Р»РєСѓ
                  </Button>
                </div>
                <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-purple-500/15 to-transparent p-4">
                  <div className="text-sm text-white/60">Р—Р°РїСѓСЃС‚РёС‚СЊ СЃРµСЃСЃРёСЋ</div>
                  <p className="mt-2 text-sm text-white/70">
                    РћС‚РєСЂРѕР№С‚Рµ СЃРµСЃСЃРёСЋ Рё РЅР°Р¶РјРёС‚Рµ В«РЎС‚Р°СЂС‚В» вЂ” С‚РѕРіРґР° СЃС‚СѓРґРµРЅС‚С‹ СЃРјРѕРіСѓС‚ РЅР°Р¶Р°С‚СЊ В«РџРѕРґРєР»СЋС‡РёС‚СЊСЃСЏВ».
                  </p>
                  <Button
                    className="mt-3 w-full"
                    onClick={() => router.push(`/teacher/session/${created.id}`)}
                  >
                    РћС‚РєСЂС‹С‚СЊ СЃРµСЃСЃРёСЋ Рё Р·Р°РїСѓСЃС‚РёС‚СЊ
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
