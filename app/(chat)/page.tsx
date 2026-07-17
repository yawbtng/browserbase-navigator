"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { PanelLeft } from "lucide-react";
import {
  type RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputBody,
  type PromptInputMessage,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import {
  WebPreview,
  WebPreviewBody,
  WebPreviewNavigation,
} from "@/components/ai-elements/web-preview";
import { BrowserChrome } from "@/components/navigator/browser-chrome";
import {
  CitationSourcesProvider,
  citationMarkdownComponents,
} from "@/components/navigator/citation-chip";
import { Hero } from "@/components/navigator/hero";
import { BrowserbaseMark } from "@/components/navigator/logo";
import { MessageActions } from "@/components/navigator/message-actions";
import { PlanArtifact } from "@/components/navigator/plan-artifact";
import {
  parseKeepExploring,
  RelatedQuestions,
} from "@/components/navigator/related-questions";
import { Sidebar } from "@/components/navigator/sidebar";
import {
  type CitedSource,
  parseSources,
  SourceCards,
} from "@/components/navigator/source-cards";
import { StalenessPill } from "@/components/navigator/staleness-pill";
import { ThemeToggle } from "@/components/navigator/theme-toggle";
import { DotBounce } from "@/components/navigator/thinking";
import { ToolRail, type ToolPart } from "@/components/navigator/tool-rail";
import {
  deleteChat,
  loadChats,
  saveChat,
  type StoredChat,
} from "@/lib/chat-store";

const SIDEBAR_KEY = "navigator:sidebar-collapsed:v1";

/**
 * Renders assistant text through the full markdown pipeline, with [n]
 * markers as citation chips (hover card = title + URL, click = preview
 * panel). The [n] → link rewrite keeps streaming markdown intact; a custom
 * anchor renderer in `citationMarkdownComponents` upgrades the matching
 * links to chips — never fall back to plain text (raw markdown is
 * unreadable).
 */
function TextWithCitations({
  text,
  sources,
  onOpenSource,
}: {
  text: string;
  sources: CitedSource[];
  onOpenSource: (url: string) => void;
}) {
  // Rewrite to [1](url) — digit-only link text. The earlier [[1]](url) form
  // nests brackets, which CommonMark can parse as a reference-link shortcut
  // instead of an inline link depending on context (9 of 20 markers in one
  // answer rendered as plain text).
  const linked =
    sources.length === 0
      ? text
      : text.replace(/\[(\d+)\]/g, (marker, n: string) => {
          const source = sources[Number(n) - 1];
          return source ? `[${n}](${source.url})` : marker;
        });
  const citationContext = useMemo(
    () => ({ sources, onOpen: onOpenSource }),
    [sources, onOpenSource]
  );
  return (
    <CitationSourcesProvider value={citationContext}>
      <MessageResponse components={citationMarkdownComponents}>
        {linked}
      </MessageResponse>
    </CitationSourcesProvider>
  );
}

/**
 * One chat session. The parent keys this component by chat id, so switching
 * chats remounts it with a fresh useChat — the AI SDK v7 pattern: `id` and
 * initial `messages` are ChatInit fields consumed when the Chat instance is
 * created (useChat also recreates its Chat whenever `id` changes).
 * Persistence is effect-driven, never per-token: onFinish (turn complete)
 * and unmount, guarded by `discardRef` so deleting the active chat doesn't
 * resurrect it from the unmount save.
 */
function ChatSession({
  chatId,
  initialMessages,
  onPersist,
  discardRef,
}: {
  chatId: string;
  initialMessages: UIMessage[];
  onPersist: () => void;
  discardRef: RefObject<boolean>;
}) {
  const [input, setInput] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const { messages, sendMessage, status } = useChat({
    id: chatId,
    messages: initialMessages,
    transport: new DefaultChatTransport({ api: "/api/chat" }),
    onFinish: ({ messages: finished }) => {
      if (saveChat(chatId, finished)) {
        onPersist();
      }
    },
  });

  const messagesRef = useRef(messages);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Unmount save catches a turn abandoned mid-stream by switching chats.
  useEffect(() => {
    return () => {
      if (discardRef.current) {
        discardRef.current = false;
        return;
      }
      if (saveChat(chatId, messagesRef.current)) {
        onPersist();
      }
    };
  }, [chatId, onPersist, discardRef]);

  const handleSubmit = (message: PromptInputMessage) => {
    if (!message.text.trim()) {
      return;
    }
    sendMessage({ text: message.text });
    setInput("");
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="flex min-h-0 min-w-0 flex-1">
      <div className="flex min-w-0 flex-1 flex-col">
        {isEmpty ? (
          // Hero lives OUTSIDE Conversation: its stick-to-bottom behavior
          // would open the page scrolled past the headline.
          <div className="min-h-0 flex-1 overflow-y-auto">
            <Hero onPick={(q) => sendMessage({ text: q })} />
          </div>
        ) : (
          <Conversation>
            <ConversationContent className="mx-auto w-full max-w-3xl">
              {messages.map((message) => {
                const isAssistant = message.role === "assistant";
                // Only the last message can be mid-stream; parsers use this
                // to hold back half-arrived lines.
                const messageStreaming =
                  status === "streaming" &&
                  message.id === messages.at(-1)?.id;

                const providerSources: CitedSource[] = message.parts.flatMap(
                  (part) =>
                    part.type === "source-url"
                      ? [{ url: part.url, title: part.title ?? part.url }]
                      : []
                );

                const toolParts = message.parts.filter((part) =>
                  part.type.startsWith("tool-")
                ) as unknown as ToolPart[];

                // Step narration vs answer: text emitted BEFORE the last
                // tool call is the model thinking out loud ("I'll search
                // for…") — it renders as collapsible reasoning, never
                // concatenated into the response (user calibration
                // 2026-07-09, the AI Elements Reasoning pattern).
                const lastToolIndex = message.parts.reduce(
                  (acc, part, i) => (part.type.startsWith("tool-") ? i : acc),
                  -1
                );
                const textContent = message.parts
                  .filter(
                    (part, i) => part.type === "text" && i > lastToolIndex
                  )
                  .map((part) => (part.type === "text" ? part.text : ""))
                  .join("");
                const preambleText = message.parts
                  .filter(
                    (part, i) => part.type === "text" && i < lastToolIndex
                  )
                  .map((part) => (part.type === "text" ? part.text : ""))
                  .join("\n\n");

                const { body: afterQuestions, questions } = isAssistant
                  ? parseKeepExploring(textContent, {
                      streaming: messageStreaming,
                    })
                  : { body: textContent, questions: [] };
                // Model-emitted "### Sources" section carries the citation
                // data (provider source-url parts never arrive from
                // tool-grounded answers); fall back to provider parts.
                const { body, sources: parsedSources } = isAssistant
                  ? parseSources(afterQuestions)
                  : { body: afterQuestions, sources: [] };
                const sources =
                  parsedSources.length > 0 ? parsedSources : providerSources;

                // save_plan results get a dedicated artifact card below the
                // step rail (they used to be invisible outside the prose).
                const savedPlans = toolParts.flatMap((part) => {
                  if (
                    part.type !== "tool-save_plan" ||
                    part.state !== "output-available" ||
                    !part.output ||
                    typeof part.output !== "object" ||
                    !("url" in part.output)
                  ) {
                    return [];
                  }
                  return [
                    {
                      id: part.toolCallId ?? String(part.type),
                      title: String(part.input?.title ?? "Plan"),
                      url: String((part.output as { url: unknown }).url),
                    },
                  ];
                });

                return (
                  <div key={message.id}>
                    {isAssistant && (
                      <ToolRail
                        answerStarted={textContent.length > 0}
                        parts={toolParts}
                        preamble={preambleText}
                      />
                    )}
                    {isAssistant &&
                      savedPlans.map((plan) => (
                        <PlanArtifact
                          key={plan.id}
                          title={plan.title}
                          url={plan.url}
                        />
                      ))}
                    {isAssistant && (
                      <SourceCards
                        loading={messageStreaming && toolParts.length > 0}
                        onOpen={setPreviewUrl}
                        sources={sources}
                      />
                    )}
                    <Message from={message.role}>
                      <MessageContent>
                        {isAssistant ? (
                          <TextWithCitations
                            onOpenSource={setPreviewUrl}
                            sources={sources}
                            text={body}
                          />
                        ) : (
                          <TextWithCitations
                            onOpenSource={setPreviewUrl}
                            sources={[]}
                            text={textContent}
                          />
                        )}
                      </MessageContent>
                      {isAssistant && body.length > 0 && (
                        <>
                          <RelatedQuestions
                            onAsk={(question) =>
                              sendMessage({ text: question })
                            }
                            questions={questions}
                          />
                          <MessageActions
                            answer={body}
                            onSaveAsPlan={() =>
                              sendMessage({ text: "Save this as a plan" })
                            }
                          />
                        </>
                      )}
                    </Message>
                  </div>
                );
              })}

              {status === "submitted" && <DotBounce />}
            </ConversationContent>
            <ConversationScrollButton />
          </Conversation>
        )}

        <div className="shrink-0 border-t border-border bg-bg">
          <div className="mx-auto w-full max-w-3xl px-6 py-4">
            <PromptInput onSubmit={handleSubmit}>
              <PromptInputBody>
                <PromptInputTextarea
                  className="min-h-13 px-4 py-3.5 pr-14 leading-normal"
                  onChange={(e) => setInput(e.currentTarget.value)}
                  placeholder="Ask about Stagehand, the browse CLI, MCP server…"
                  value={input}
                />
                <PromptInputSubmit
                  className="absolute right-2 bottom-2"
                  disabled={!input.trim()}
                  status={status}
                />
              </PromptInputBody>
            </PromptInput>
          </div>
        </div>
      </div>

      {previewUrl && (
        <aside className="hidden w-[26rem] shrink-0 flex-col border-l border-border md:flex">
          <WebPreview
            className="flex-1 rounded-none border-0"
            defaultUrl={previewUrl}
            key={previewUrl}
          >
            <WebPreviewNavigation>
              <BrowserChrome
                onClose={() => setPreviewUrl(null)}
                url={previewUrl}
              />
            </WebPreviewNavigation>
            <WebPreviewBody src={previewUrl} />
          </WebPreview>
          <p className="border-t border-border px-3 py-2 text-xs text-text-muted">
            Blank frame means the site blocks embedding. Use Open ↗.
          </p>
        </aside>
      )}
    </div>
  );
}

export default function ChatPage() {
  const [corpusDate, setCorpusDate] = useState<string | null>(null);
  const [chats, setChats] = useState<StoredChat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string>(() =>
    crypto.randomUUID()
  );
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  // Set before deleting the active chat so the remounting session's unmount
  // save doesn't write the deleted chat straight back to storage.
  const discardRef = useRef(false);

  useEffect(() => {
    setChats(loadChats());
    try {
      setCollapsed(localStorage.getItem(SIDEBAR_KEY) === "1");
    } catch {
      // ignore storage failures (private mode, etc.)
    }
  }, []);

  useEffect(() => {
    fetch("/api/status")
      .then((res) => res.json())
      .then((status: { syncedAt: string | null; pages: number }) => {
        if (status.syncedAt && status.pages > 0) {
          setCorpusDate(
            new Date(status.syncedAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })
          );
        }
      })
      .catch(() => {});
  }, []);

  const refreshChats = useCallback(() => {
    setChats(loadChats());
  }, []);

  const handleNewChat = useCallback(() => {
    setActiveChatId(crypto.randomUUID());
    setMobileOpen(false);
  }, []);

  const handleSelect = useCallback((id: string) => {
    setActiveChatId(id);
    setMobileOpen(false);
  }, []);

  const handleDelete = useCallback(
    (id: string) => {
      if (id === activeChatId) {
        discardRef.current = true;
        setActiveChatId(crypto.randomUUID());
      }
      setChats(deleteChat(id));
    },
    [activeChatId]
  );

  const toggleSidebar = useCallback(() => {
    if (window.matchMedia("(min-width: 768px)").matches) {
      setCollapsed((prev) => {
        const next = !prev;
        try {
          localStorage.setItem(SIDEBAR_KEY, next ? "1" : "0");
        } catch {
          // ignore storage failures
        }
        return next;
      });
    } else {
      setMobileOpen((prev) => !prev);
    }
  }, []);

  const activeChat = chats.find((chat) => chat.id === activeChatId);

  return (
    <div className="flex h-svh flex-col pb-[env(safe-area-inset-bottom)]">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4 shadow-inset-top">
        <div className="flex items-center gap-2.5">
          <button
            aria-label="Toggle chat history"
            className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-bg grid size-8 place-items-center rounded-md text-text-muted transition-colors duration-200 ease-brand hover:bg-surface-2 hover:text-text"
            onClick={toggleSidebar}
            type="button"
          >
            <PanelLeft aria-hidden className="size-4" />
          </button>
          <BrowserbaseMark className="size-5 shrink-0" />
          <span className="text-sm font-medium tracking-[-0.01em] text-text">
            Browserbase <span className="text-text-muted">Navigator</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <StalenessPill corpusDate={corpusDate} />
          <ThemeToggle />
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <Sidebar
          activeId={activeChatId}
          chats={chats}
          collapsed={collapsed}
          mobileOpen={mobileOpen}
          onDelete={handleDelete}
          onMobileOpenChange={setMobileOpen}
          onNew={handleNewChat}
          onSelect={handleSelect}
        />

        <ChatSession
          chatId={activeChatId}
          discardRef={discardRef}
          initialMessages={activeChat?.messages ?? []}
          key={activeChatId}
          onPersist={refreshChats}
        />
      </div>
    </div>
  );
}
