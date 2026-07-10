"use client";

import type { UIMessage } from "ai";

/**
 * localStorage-backed chat history (the app is account-less by design — no
 * auth, no server persistence). Versioned key so a future shape change can
 * migrate or discard cleanly. Writes are quota-safe: on QuotaExceededError
 * the oldest chats are dropped until the payload fits.
 */

const STORE_KEY = "navigator:chats:v1";
const MAX_CHATS = 30;
const TITLE_MAX = 44;

export interface StoredChat {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: UIMessage[];
}

function isStoredChat(value: unknown): value is StoredChat {
  if (!value || typeof value !== "object") {
    return false;
  }
  const chat = value as Partial<StoredChat>;
  return (
    typeof chat.id === "string" &&
    typeof chat.title === "string" &&
    typeof chat.createdAt === "number" &&
    typeof chat.updatedAt === "number" &&
    Array.isArray(chat.messages)
  );
}

/** Newest first. Returns [] on SSR, missing key, or corrupt JSON. */
export function loadChats(): StoredChat[] {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) {
      return [];
    }
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .filter(isStoredChat)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [];
  }
}

/**
 * Write newest-first, capped. On quota failure drop the oldest chat and
 * retry until the write fits (or nothing is left to drop).
 */
function writeChats(chats: StoredChat[]): StoredChat[] {
  let list = chats.slice(0, MAX_CHATS);
  while (true) {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(list));
      return list;
    } catch {
      if (list.length === 0) {
        return list;
      }
      list = list.slice(0, list.length - 1);
    }
  }
}

/** First user message, truncated — no LLM call for titles. */
export function titleForMessages(messages: UIMessage[]): string | null {
  const firstUser = messages.find((message) => message.role === "user");
  if (!firstUser) {
    return null;
  }
  const text = firstUser.parts
    .filter((part) => part.type === "text")
    .map((part) => (part.type === "text" ? part.text : ""))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) {
    return null;
  }
  return text.length > TITLE_MAX ? `${text.slice(0, TITLE_MAX).trimEnd()}…` : text;
}

/**
 * Upsert a chat by id. No-ops (returns null) when there is no user message
 * yet — an untouched draft never hits storage. Preserves createdAt and the
 * original title on update.
 */
export function saveChat(id: string, messages: UIMessage[]): StoredChat | null {
  if (typeof window === "undefined") {
    return null;
  }
  const title = titleForMessages(messages);
  if (!title) {
    return null;
  }
  const now = Date.now();
  const chats = loadChats();
  const existing = chats.find((chat) => chat.id === id);
  const next: StoredChat = {
    id,
    title: existing?.title ?? title,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    messages,
  };
  writeChats([next, ...chats.filter((chat) => chat.id !== id)]);
  return next;
}

/** Remove a chat and return the updated list (newest first). */
export function deleteChat(id: string): StoredChat[] {
  if (typeof window === "undefined") {
    return [];
  }
  const remaining = loadChats().filter((chat) => chat.id !== id);
  return writeChats(remaining);
}
