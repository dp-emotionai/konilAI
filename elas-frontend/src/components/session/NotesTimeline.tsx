"use client";

import {Card} from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { useMemo, useState } from "react";

type Note = { id: string; time: string; label: string; details?: string };

export default function NotesTimeline() {
  const [label, setLabel] = useState("");
  const [details, setDetails] = useState("");
  const [notes, setNotes] = useState<Note[]>([
    { id: "n1", time: "00:12", label: "Intro started", details: "Topic overview" },
    { id: "n2", time: "18:40", label: "Drop in engagement", details: "Complex part" },
  ]);

  const nowTime = useMemo(() => {
    const m = String(Math.floor(Math.random() * 45)).padStart(2, "0");
    const s = String(Math.floor(Math.random() * 60)).padStart(2, "0");
    return `${m}:${s}`;
  }, [notes.length]);

  function add() {
    if (!label.trim()) return;
    setNotes((n) => [{ id: crypto.randomUUID(), time: nowTime, label: label.trim(), details: details.trim() || undefined }, ...n]);
    setLabel("");
    setDetails("");
  }

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="text-lg font-semibold">Notes timeline</div>
          <div className="text-white/60 text-sm mt-1">Add markers during session monitoring.</div>
        </div>
        <Button size="sm" onClick={add}>Add marker</Button>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <Input placeholder="Label (e.g., “Hard topic starts”)" value={label} onChange={(e) => setLabel(e.target.value)} />
        <Input placeholder="Details (optional)" value={details} onChange={(e) => setDetails(e.target.value)} />
      </div>

      <div className="space-y-3">
        {notes.map((n) => (
          <div key={n.id} className="rounded-2xl bg-black/30 border border-white/10 p-4">
            <div className="flex items-center justify-between">
              <div className="font-semibold">{n.label}</div>
              <div className="text-sm text-white/60">{n.time}</div>
            </div>
            {n.details && <div className="text-white/60 mt-2 text-sm">{n.details}</div>}
          </div>
        ))}
      </div>
    </Card>
  );
}
