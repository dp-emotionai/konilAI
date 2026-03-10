"use client";

import { useCallback, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Video, Users, User, AlertCircle } from "lucide-react";
import type { Role } from "@/lib/roles";
import { useSearch } from "@/hooks/useSearch";
import { isSearchAvailable } from "@/lib/api/search";
import type { SearchResponse } from "@/lib/api/search";
import Input from "@/components/ui/Input";
import { cn } from "@/lib/cn";

const KBD = "⌘K";

type Props = {
  open: boolean;
  onClose: () => void;
  role: Role;
};

export default function QuickSearch({ open, onClose, role }: Props) {
  const router = useRouter();
  const { query, setQuery, data, loading, error, minLength } = useSearch(role);
  const available = isSearchAvailable();

  useEffect(() => {
    if (open) {
      setQuery("");
    }
  }, [open, setQuery]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }

      if (e.key === "Enter" && data?.results) {
        const { sessions, groups, users } = data.results;
        const total = sessions.length + groups.length + (users?.length ?? 0);

        if (total === 1) {
          if (sessions.length) {
            router.push(`/teacher/session/${sessions[0].id}`);
          } else if (groups.length) {
            router.push(
              role === "teacher"
                ? `/teacher/group/${groups[0].id}`
                : `/student/group/${groups[0].id}`
            );
          } else if (users?.length) {
            router.push(`/admin/users?id=${users[0].id}`);
          }

          onClose();
        }
      }
    },
    [data, role, router, onClose]
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100]"
      aria-modal="true"
      role="dialog"
      aria-label="Быстрый поиск"
    >
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="absolute left-1/2 top-[15%] w-full max-w-xl -translate-x-1/2 overflow-hidden rounded-2xl bg-surface shadow-card ring-1 ring-[color:var(--border)]/25">
        <div className="flex items-center gap-3 border-b border-border/40 px-4 py-3">
          <Search size={20} className="shrink-0 text-muted" />
          <Input
            type="text"
            placeholder="Поиск сессий, групп…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="border-0 ring-0 shadow-none focus:ring-0"
            autoComplete="off"
            autoFocus
          />
          <kbd className="hidden rounded bg-surface-subtle px-2 py-1 text-xs text-muted sm:inline">
            {KBD}
          </kbd>
        </div>

        <div className="max-h-[60vh] overflow-y-auto">
          {!available && (
            <div className="p-6 text-center text-muted">
              <AlertCircle size={24} className="mx-auto mb-2 opacity-70" />
              <p className="font-medium">Search unavailable</p>
              <p className="mt-1 text-sm">Sign in and connect to API to search.</p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <Link
                  href="/auth/login"
                  className="text-sm text-[rgb(var(--primary))] hover:underline"
                  onClick={onClose}
                >
                  Sign in
                </Link>
                <Link
                  href="/docs"
                  className="text-sm text-[rgb(var(--primary))] hover:underline"
                  onClick={onClose}
                >
                  Docs
                </Link>
              </div>
            </div>
          )}

          {available && query.length > 0 && query.length < minLength && (
            <div className="p-4 text-center text-sm text-muted">
              Type at least {minLength} characters
            </div>
          )}

          {available && error && (
            <div className="flex items-center gap-2 p-4 text-sm text-error">
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          {available && loading && query.length >= minLength && (
            <div className="p-6 text-center text-sm text-muted">Поиск…</div>
          )}

          {available && data && query.length >= minLength && !loading && (
            <Results data={data} role={role} onClose={onClose} />
          )}

          {available && !data && !loading && query.length >= minLength && (
            <div className="p-6 text-center text-sm text-muted">No results</div>
          )}
        </div>
      </div>
    </div>
  );
}

function Results({
  data,
  role,
  onClose,
}: {
  data: SearchResponse;
  role: Role;
  onClose: () => void;
}) {
  const { sessions, groups, users } = data.results;
  const hasSessions = sessions.length > 0;
  const hasGroups = groups.length > 0;
  const hasUsers = users && users.length > 0;

  if (!hasSessions && !hasGroups && !hasUsers) {
    return (
      <div className="p-6 text-center text-sm text-muted">
        No results for &quot;{data.q}&quot;
      </div>
    );
  }

  const sessionHref = (id: string) =>
    role === "teacher" ? `/teacher/session/${id}` : `/student/session/${id}`;

  const groupHref = (id: string) =>
    role === "teacher" ? `/teacher/group/${id}` : `/student/group/${id}`;

  return (
    <div className="py-2">
      {hasSessions && (
        <Section title="Sessions" icon={<Video size={16} />}>
          {sessions.map((s) => (
            <Link
              key={s.id}
              href={sessionHref(s.id)}
              onClick={onClose}
              className={cn(
                "mx-2 flex items-center gap-3 rounded-elas px-4 py-2.5",
                "text-fg no-underline transition-colors hover:bg-surface-subtle"
              )}
            >
              <span className="truncate font-medium">{s.title}</span>
              {s.groupName && (
                <span className="truncate text-sm text-muted">{s.groupName}</span>
              )}
              {s.status === "active" && (
                <span className="rounded px-1.5 py-0.5 text-xs text-[rgb(var(--primary))] bg-primary/15">
                  LIVE
                </span>
              )}
            </Link>
          ))}
        </Section>
      )}

      {hasGroups && (
        <Section title="Groups" icon={<Users size={16} />}>
          {groups.map((g) => (
            <Link
              key={g.id}
              href={groupHref(g.id)}
              onClick={onClose}
              className={cn(
                "mx-2 flex items-center gap-3 rounded-elas px-4 py-2.5",
                "text-fg no-underline transition-colors hover:bg-surface-subtle"
              )}
            >
              <span className="truncate font-medium">{g.name}</span>
              {g.membersCount != null && (
                <span className="text-sm text-muted">{g.membersCount} members</span>
              )}
            </Link>
          ))}
        </Section>
      )}

      {hasUsers && (
        <Section title="Users" icon={<User size={16} />}>
          {users!.map((u) => (
            <Link
              key={u.id}
              href={`/admin/users?id=${u.id}`}
              onClick={onClose}
              className={cn(
                "mx-2 flex items-center gap-3 rounded-elas px-4 py-2.5",
                "text-fg no-underline transition-colors hover:bg-surface-subtle"
              )}
            >
              <span className="truncate font-medium">{u.name || u.email}</span>
              <span className="truncate text-sm text-muted">{u.email}</span>
              {u.role && <span className="text-xs text-muted">{u.role}</span>}
            </Link>
          ))}
        </Section>
      )}
    </div>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-2">
      <div className="flex items-center gap-2 px-4 py-1.5 text-xs font-medium uppercase tracking-wider text-muted">
        {icon}
        {title}
      </div>
      {children}
    </div>
  );
}

export function QuickSearchTrigger({
  onClick,
  className,
}: {
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-9 items-center gap-2 rounded-elas px-3 text-sm text-muted",
        "bg-surface-subtle/80 ring-1 ring-[color:var(--border)]/30",
        "transition-colors hover:bg-surface-subtle hover:text-fg",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--primary)]/35",
        className
      )}
    >
      <Search size={16} />
      <span>Поиск…</span>
      <kbd className="hidden rounded bg-surface px-1.5 py-0.5 text-[10px] sm:inline">
        ⌘K
      </kbd>
    </button>
  );
}