import { Suspense } from "react";
import ConsentClient from "./ConsentClient";

export default function ConsentPage() {
    return (
        <Suspense fallback={<ConsentFallback />}>
            <ConsentClient />
        </Suspense>
    );
}

function ConsentFallback() {
    return (
        <div className="fixed inset-0 z-[110] grid place-items-center overflow-y-auto bg-slate-950/55 px-3 py-4 backdrop-blur-[4px] sm:px-5 sm:py-7">
            <div className="w-full max-w-[700px] rounded-[28px] border border-white/75 bg-white p-5 shadow-[0_32px_100px_rgba(15,23,42,0.36)] sm:p-10">
                <div className="h-4 w-20 rounded bg-violet-100" />
                <div className="mt-4 h-9 w-4/5 rounded bg-slate-100" />
                <div className="mt-3 h-5 w-full rounded bg-slate-100" />

                <div className="mt-6 space-y-2.5">
                    <div className="h-[76px] rounded-[18px] bg-slate-100" />
                    <div className="h-[76px] rounded-[18px] bg-slate-100" />
                    <div className="h-[76px] rounded-[18px] bg-slate-100" />
                    <div className="h-[76px] rounded-[18px] bg-slate-100" />
                    <div className="h-[76px] rounded-[18px] bg-violet-50" />
                </div>

                <div className="mt-6 space-y-3">
                    <div className="h-12 rounded-[14px] bg-violet-200" />
                    <div className="h-12 rounded-[14px] bg-slate-100" />
                    <div className="h-12 rounded-[14px] bg-slate-100" />
                </div>
            </div>
        </div>
    );
}
