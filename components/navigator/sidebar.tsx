"use client";

import { Plus, Trash2 } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect } from "react";
import type { StoredChat } from "@/lib/chat-store";
import { cn } from "@/lib/utils";

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-bg";

function relativeTime(ts: number): string {
  const seconds = Math.floor((Date.now() - ts) / 1000);
  if (seconds < 60) {
    return "just now";
  }
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }
  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `${days}d ago`;
  }
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function ChatItem({
  chat,
  active,
  onSelect,
  onDelete,
}: {
  chat: StoredChat;
  active: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  return (
    <li className="group relative">
      <button
        aria-current={active ? "true" : undefined}
        className={cn(
          "flex w-full flex-col gap-0.5 rounded-md border px-2.5 py-2 pr-9 text-left transition-colors duration-200 ease-brand",
          FOCUS_RING,
          active
            ? "border-border bg-surface"
            : "border-transparent hover:bg-surface"
        )}
        onClick={onSelect}
        type="button"
      >
        <span className="flex min-w-0 items-center gap-1.5">
          {active && (
            <i aria-hidden className="size-1 shrink-0 rounded-full bg-brand" />
          )}
          <span className="truncate text-[13px] leading-snug text-text">
            {chat.title}
          </span>
        </span>
        <span className="font-mono text-[11px] text-text-muted">
          {relativeTime(chat.updatedAt)}
        </span>
      </button>
      <button
        aria-label={`Delete chat: ${chat.title}`}
        className={cn(
          "absolute top-1/2 right-1.5 grid size-6 -translate-y-1/2 place-items-center rounded-sm text-text-muted opacity-0 transition-[color,opacity] duration-200 ease-brand group-focus-within:opacity-100 group-hover:opacity-100 hover:text-text focus-visible:opacity-100",
          FOCUS_RING
        )}
        onClick={onDelete}
        type="button"
      >
        <Trash2 aria-hidden className="size-3.5" />
      </button>
    </li>
  );
}

function SidebarContent({
  chats,
  activeId,
  onSelect,
  onNew,
  onDelete,
}: {
  chats: StoredChat[];
  activeId: string;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
}) {
  return (
    <>
      <div className="shrink-0 px-3 pt-3">
        <button
          className={cn(
            "flex w-full items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm text-text shadow-inset-top transition-[background-color,border-color] duration-200 ease-brand hover:border-border-strong hover:bg-surface-2",
            FOCUS_RING
          )}
          onClick={onNew}
          type="button"
        >
          <Plus aria-hidden className="size-4 text-text-muted" />
          New chat
        </button>
      </div>
      <span className="eyebrow shrink-0 px-4 pt-5 pb-2">Chats</span>
      {chats.length === 0 ? (
        <p className="px-4 text-xs leading-relaxed text-text-muted">
          Conversations you start appear here.
        </p>
      ) : (
        <ul className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-2 pb-3">
          {chats.map((chat) => (
            <ChatItem
              active={chat.id === activeId}
              chat={chat}
              key={chat.id}
              onDelete={() => onDelete(chat.id)}
              onSelect={() => onSelect(chat.id)}
            />
          ))}
        </ul>
      )}
    </>
  );
}

/**
 * Chat-history sidebar. Desktop: a static column that the header toggle
 * collapses (state persisted by the page). Mobile: an overlay sheet so it
 * never amputates the chat column — scrim click or Escape dismisses it.
 */
export function Sidebar({
  chats,
  activeId,
  onSelect,
  onNew,
  onDelete,
  collapsed,
  mobileOpen,
  onMobileOpenChange,
}: {
  chats: StoredChat[];
  activeId: string;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  collapsed: boolean;
  mobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
}) {
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (!mobileOpen) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onMobileOpenChange(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen, onMobileOpenChange]);

  const content = (
    <SidebarContent
      activeId={activeId}
      chats={chats}
      onDelete={onDelete}
      onNew={onNew}
      onSelect={onSelect}
    />
  );

  return (
    <>
      {/* Desktop column */}
      {!collapsed && (
        <aside
          aria-label="Chat history"
          className="hidden w-64 shrink-0 flex-col border-r border-border bg-background md:flex"
        >
          {content}
        </aside>
      )}

      {/* Mobile overlay sheet */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <motion.button
              animate={{ opacity: 1 }}
              aria-label="Close chat history"
              className="absolute inset-0 bg-[var(--scrim)]"
              exit={{ opacity: 0 }}
              initial={{ opacity: reducedMotion ? 1 : 0 }}
              onClick={() => onMobileOpenChange(false)}
              transition={{ duration: reducedMotion ? 0 : 0.15 }}
              type="button"
            />
            <motion.aside
              animate={{ x: 0 }}
              aria-label="Chat history"
              className="absolute inset-y-0 left-0 flex w-72 flex-col border-r border-border bg-background"
              exit={{ x: reducedMotion ? 0 : "-100%" }}
              initial={{ x: reducedMotion ? 0 : "-100%" }}
              transition={{
                duration: reducedMotion ? 0 : 0.2,
                ease: [0.3, 0, 0.15, 1],
              }}
            >
              {content}
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
