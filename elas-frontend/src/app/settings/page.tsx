"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SettingsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/profile");
  }, [router]);

  return (
    <div className="flex h-[50vh] items-center justify-center bg-[#FAFAFB]">
      <div className="w-8 h-8 rounded-full border-4 border-slate-200 border-t-[#7448FF] animate-spin"></div>
    </div>
  );
}
