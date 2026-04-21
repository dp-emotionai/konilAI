"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Github, Loader2 } from "lucide-react";

import { api } from "@/lib/api/client";
import { extractAuthSession, type AuthApiResponse, type AuthSession } from "@/lib/auth/authSession";
import { cn } from "@/lib/cn";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (options: {
            client_id: string;
            callback: (response: { credential?: string }) => void;
            ux_mode?: "popup" | "redirect";
          }) => void;
          renderButton: (
            element: HTMLElement,
            options: Record<string, string | number | boolean | undefined>
          ) => void;
        };
      };
    };
  }
}

type SocialAuthButtonsProps = {
  mode: "login" | "register";
  role?: "student" | "teacher" | null;
  onSuccess: (session: AuthSession) => void;
  onError: (message: string) => void;
  className?: string;
};

const DEFAULT_GOOGLE_CLIENT_ID =
  "759710816012-1p8dt2svf2kmboe4idlrl4gi3skoqjo8.apps.googleusercontent.com";

function getGoogleClientId() {
  return (process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || DEFAULT_GOOGLE_CLIENT_ID).trim();
}

function buildGithubStartUrl(role?: "student" | "teacher" | null): string | null {
  if (typeof window === "undefined") return null;

  const explicit = process.env.NEXT_PUBLIC_GITHUB_AUTH_START_URL?.trim();
  if (!explicit) return null;

  const url = new URL(explicit);
  if (role) url.searchParams.set("role", role);
  url.searchParams.set("returnTo", `${window.location.origin}/auth/social/callback`);
  return url.toString();
}

export function SocialAuthButtons({
  mode,
  role,
  onSuccess,
  onError,
  className,
}: SocialAuthButtonsProps) {
  const googleButtonRef = useRef<HTMLDivElement | null>(null);
  const googleClientId = getGoogleClientId();
  const [googleReady, setGoogleReady] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [githubBusy, setGithubBusy] = useState(false);

  const roleRequiredButMissing = mode === "register" && !role;
  const githubStartUrl = useMemo(() => buildGithubStartUrl(role), [role]);

  useEffect(() => {
    if (typeof window === "undefined" || !googleClientId) return;
    if (window.google?.accounts?.id) {
      setGoogleReady(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => setGoogleReady(true);
    script.onerror = () => onError("Не удалось загрузить Google Sign-In.");
    document.head.appendChild(script);

    return () => {
      script.onload = null;
      script.onerror = null;
    };
  }, [googleClientId, onError]);

  useEffect(() => {
    if (!googleReady || !googleButtonRef.current || !window.google?.accounts?.id || !googleClientId) {
      return;
    }

    googleButtonRef.current.innerHTML = "";

    window.google.accounts.id.initialize({
      client_id: googleClientId,
      ux_mode: "popup",
      callback: async ({ credential }) => {
        if (!credential) {
          onError("Google не вернул credential.");
          return;
        }

        if (roleRequiredButMissing) {
          onError("Сначала выберите роль для регистрации.");
          return;
        }

        setGoogleBusy(true);
        onError("");

        try {
          const data = await api.post<AuthApiResponse>("auth/google", {
            credential,
            role: role ?? "student",
          });

          onSuccess(extractAuthSession(data));
        } catch (error) {
          onError(error instanceof Error ? error.message : "Google вход не удался.");
        } finally {
          setGoogleBusy(false);
        }
      },
    });

    window.google.accounts.id.renderButton(googleButtonRef.current, {
      theme: "outline",
      size: "large",
      shape: "pill",
      width: 320,
      text: mode === "register" ? "signup_with" : "continue_with",
      logo_alignment: "left",
    });
  }, [googleClientId, googleReady, mode, onError, onSuccess, role, roleRequiredButMissing]);

  const handleGithubClick = () => {
    if (roleRequiredButMissing) {
      onError("Сначала выберите роль для регистрации.");
      return;
    }

    if (!githubStartUrl) {
      onError("GitHub вход пока не настроен на backend. Нужен route /auth/github/start.");
      return;
    }

    setGithubBusy(true);
    window.location.assign(githubStartUrl);
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div className="text-[13px] font-semibold text-slate-400">
        {mode === "register" ? "Создать аккаунт через" : "Продолжить через"}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div
          className={cn(
            "min-h-[44px] min-w-[220px]",
            roleRequiredButMissing && "pointer-events-none opacity-50"
          )}
        >
          {googleBusy ? (
            <div className="flex h-11 items-center justify-center rounded-full border border-slate-200 bg-white text-sm font-medium text-slate-500">
              <Loader2 size={16} className="mr-2 animate-spin" />
              Подключаем Google...
            </div>
          ) : (
            <div ref={googleButtonRef} />
          )}
        </div>

        <button
          type="button"
          onClick={handleGithubClick}
          disabled={githubBusy || roleRequiredButMissing}
          className={cn(
            "inline-flex h-11 min-w-[220px] items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          )}
        >
          {githubBusy ? <Loader2 size={16} className="animate-spin" /> : <Github size={16} />}
          GitHub
        </button>
      </div>

      {mode === "register" && roleRequiredButMissing && (
        <p className="text-xs text-slate-400">Для social-регистрации сначала выберите роль.</p>
      )}
    </div>
  );
}
