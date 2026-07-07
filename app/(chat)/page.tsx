"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useState } from "react";
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
import { Hero } from "@/components/navigator/hero";
import { BrowserbaseMark } from "@/components/navigator/logo";
import { MessageActions } from "@/components/navigator/message-actions";
import {
  parseKeepExploring,
  RelatedQuestions,
} from "@/components/navigator/related-questions";
import {
  type CitedSource,
  parseSources,
  SourceCards,
} from "@/components/navigator/source-cards";
import { StalenessPill } from "@/components/navigator/staleness-pill";
import { ThemeToggle } from "@/components/navigator/theme-toggle";
import { DotBounce } from "@/components/navigator/thinking";
import { ToolRail, type ToolPart } from "@/components/navigator/tool-rail";

/**
 * Renders assistant text, wrapping [n] markers in InlineCitation hover cards.
 * Falls back to streaming markdown (MessageResponse) when no sources exist.
 */
function TextWithCitations({
  text,
  sources,
}: {
  text: string;
  sources: CitedSource[];
}) {
  // Keep the full markdown pipeline and turn [n] markers into links to the
  // cited page — never fall back to plain text (raw markdown is unreadable).
  const linked =
    sources.length === 0
      ? text
      : text.replace(/\[(\d+)\]/g, (marker, n: string) => {
          const source = sources[Number(n) - 1];
          return source ? `[${marker}](${source.url})` : marker;
        });
  return <MessageResponse>{linked}</MessageResponse>;
}

export default function ChatPage() {
  const [input, setInput] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [corpusDate, setCorpusDate] = useState<string | null>(null);

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

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });

  const handleSubmit = (message: PromptInputMessage) => {
    if (!message.text.trim()) {
      return;
    }
    sendMessage({ text: message.text });
    setInput("");
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="flex h-dvh flex-col">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4 shadow-inset-top">
        <div className="flex items-center gap-2.5">
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

                const providerSources: CitedSource[] = message.parts.flatMap(
                  (part) =>
                    part.type === "source-url"
                      ? [{ url: part.url, title: part.title ?? part.url }]
                      : []
                );

                const toolParts = message.parts.filter((part) =>
                  part.type.startsWith("tool-")
                ) as unknown as ToolPart[];

                const textContent = message.parts
                  .filter((part) => part.type === "text")
                  .map((part) => (part.type === "text" ? part.text : ""))
                  .join("");

                const { body: afterQuestions, questions } = isAssistant
                  ? parseKeepExploring(textContent)
                  : { body: textContent, questions: [] };
                // Model-emitted "### Sources" section carries the citation
                // data (provider source-url parts never arrive from
                // tool-grounded answers); fall back to provider parts.
                const { body, sources: parsedSources } = isAssistant
                  ? parseSources(afterQuestions)
                  : { body: afterQuestions, sources: [] };
                const sources =
                  parsedSources.length > 0 ? parsedSources : providerSources;

                return (
                  <div key={message.id}>
                    {isAssistant && <ToolRail parts={toolParts} />}
                    {isAssistant && (
                      <SourceCards onOpen={setPreviewUrl} sources={sources} />
                    )}
                    <Message from={message.role}>
                      <MessageContent>
                        {isAssistant ? (
                          <TextWithCitations sources={sources} text={body} />
                        ) : (
                          <TextWithCitations sources={[]} text={textContent} />
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
    </div>
  );
}
