"use client";

import { api, getApiBaseUrl, hasAuth } from "./client";

export type SessionNote = {
  id: string;
  text: string;
  createdAt: string;
  updatedAt: string;
  authorId: string | null;
  authorName: string | null;
};

type RawSessionNote = {
  id?: string | null;
  noteId?: string | null;
  text?: string | null;
  content?: string | null;
  body?: string | null;
  note?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  authorId?: string | null;
  userId?: string | null;
  createdById?: string | null;
  authorName?: string | null;
  fullName?: string | null;
  name?: string | null;
  email?: string | null;
  author?: {
    id?: string | null;
    fullName?: string | null;
    name?: string | null;
    email?: string | null;
  } | null;
};

function normalizeNote(raw: RawSessionNote, index: number): SessionNote | null {
  const id = raw.id?.trim() || raw.noteId?.trim() || `note-${index}`;
  const text = raw.text ?? raw.content ?? raw.body ?? raw.note ?? "";

  if (!id) return null;

  return {
    id,
    text: typeof text === "string" ? text : "",
    createdAt: raw.createdAt || raw.updatedAt || new Date().toISOString(),
    updatedAt: raw.updatedAt || raw.createdAt || new Date().toISOString(),
    authorId: raw.authorId || raw.userId || raw.createdById || raw.author?.id || null,
    authorName:
      raw.authorName?.trim() ||
      raw.fullName?.trim() ||
      raw.name?.trim() ||
      raw.email?.trim() ||
      raw.author?.fullName?.trim() ||
      raw.author?.name?.trim() ||
      raw.author?.email?.trim() ||
      null,
  };
}

function normalizeNotesPayload(payload: unknown): SessionNote[] {
  const source = Array.isArray(payload)
    ? payload
    : payload && typeof payload === "object" && Array.isArray((payload as { notes?: unknown[] }).notes)
      ? (payload as { notes: unknown[] }).notes
      : [];

  return source
    .map((item, index) => normalizeNote((item ?? {}) as RawSessionNote, index))
    .filter((item): item is SessionNote => Boolean(item))
    .sort((a, b) => {
      const aTime = new Date(a.updatedAt).getTime();
      const bTime = new Date(b.updatedAt).getTime();
      return Number.isFinite(bTime) && Number.isFinite(aTime) ? bTime - aTime : 0;
    });
}

function ensureNotesApiAvailable() {
  if (!getApiBaseUrl() || !hasAuth()) {
    throw new Error("NOTES_API_UNAVAILABLE");
  }
}

export async function getSessionNotes(sessionId: string): Promise<SessionNote[]> {
  ensureNotesApiAvailable();
  const payload = await api.get<unknown>(`sessions/${sessionId}/notes`);
  return normalizeNotesPayload(payload);
}

export async function createSessionNote(sessionId: string, text: string): Promise<SessionNote | null> {
  ensureNotesApiAvailable();
  const payload = await api.post<unknown>(`sessions/${sessionId}/notes`, { text });

  const notes = normalizeNotesPayload(payload);
  return notes[0] ?? normalizeNote(payload as RawSessionNote, 0);
}

export async function updateSessionNote(
  sessionId: string,
  noteId: string,
  text: string
): Promise<SessionNote | null> {
  ensureNotesApiAvailable();
  const payload = await api.patch<unknown>(`sessions/${sessionId}/notes/${noteId}`, { text });

  const notes = normalizeNotesPayload(payload);
  return notes[0] ?? normalizeNote(payload as RawSessionNote, 0);
}

export async function deleteSessionNote(sessionId: string, noteId: string): Promise<void> {
  ensureNotesApiAvailable();
  await api.delete(`sessions/${sessionId}/notes/${noteId}`);
}
