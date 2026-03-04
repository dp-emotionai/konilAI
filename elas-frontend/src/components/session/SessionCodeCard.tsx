"use client";

import {Card} from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { useMemo, useState } from "react";

export default function SessionCodeCard({ code, link }: { code: string; link: string }) {
  const [copied, setCopied] = useState<string | null>(null);

  const shortLink = useMemo(() => link, [link]);

  async function copy(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      setTimeout(() => setCopied(null), 1200);
    } catch {}
  }

  return (
    <Card className="p-6 space-y-4">
      <div>
        <div className="text-sm text-white/60">Session code</div>
        <div className="text-2xl font-semibold mt-1 tracking-wider">{code}</div>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <div className="space-y-2">
          <div className="text-sm text-white/60">Join link</div>
          <Input readOnly value={shortLink} />
        </div>
        <div className="flex items-end gap-2">
          <Button className="w-full" onClick={() => copy(code, "code")}>
            {copied === "code" ? "Copied ✓" : "Copy code"}
          </Button>
          <Button variant="outline" className="w-full" onClick={() => copy(shortLink, "link")}>
            {copied === "link" ? "Copied ✓" : "Copy link"}
          </Button>
        </div>
      </div>

      <div className="rounded-2xl bg-black/30 border border-white/10 p-4 text-white/60 text-sm">
        QR will be added later (optional). For now use code/link for demo.
      </div>
    </Card>
  );
}
