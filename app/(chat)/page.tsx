"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useState } from "react";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  InlineCitation,
  InlineCitationCard,
  InlineCitationCardBody,
  InlineCitationCardTrigger,
  InlineCitationSource,
} from "@/components/ai-elements/inline-citation";
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
import { Shimmer } from "@/components/ai-elements/shimmer";
import {
  Source,
  Sources,
  SourcesContent,
  SourcesTrigger,
} from "@/components/ai-elements/sources";
import {
  WebPreview,
  WebPreviewBody,
  WebPreviewNavigation,
  WebPreviewUrl,
} from "@/components/ai-elements/web-preview";

interface CitedSource {
  url: string;
  title: string;
}

function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

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
  if (sources.length === 0) {
    return <MessageResponse>{text}</MessageResponse>;
  }

  return (
    <p className="whitespace-pre-wrap leading-relaxed">
      {text.split(/(\[\d+\])/).map((segment, i) => {
        const marker = segment.match(/^\[(\d+)\]$/);
        const source = marker ? sources[Number(marker[1]) - 1] : undefined;

        if (!source) {
          return <span key={i}>{segment}</span>;
        }

        return (
          <InlineCitation key={i}>
            <InlineCitationCard>
              <InlineCitationCardTrigger sources={[source.url]} />
              <InlineCitationCardBody className="p-3">
                <InlineCitationSource title={source.title} url={source.url} />
              </InlineCitationCardBody>
            </InlineCitationCard>
          </InlineCitation>
        );
      })}
    </p>
  );
}

export default function ChatPage() {
  const [input, setInput] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
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

  return (
    <div className="flex h-dvh flex-col">
      <header className="flex items-center justify-between border-b px-4 py-3">
        <h1 className="font-semibold">Browserbase Navigator</h1>
        <span className="text-muted-foreground text-xs">corpus as of —</span>
      </header>

      <div className="flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col">
          <Conversation>
            <ConversationContent className="mx-auto w-full max-w-3xl">
              {messages.length === 0 && (
                <ConversationEmptyState
                  title="Ask about the Browserbase ecosystem"
                  description="Stagehand, the browse CLI, MCP server, Functions, Agents — answers come with citations."
                />
              )}
              {messages.map((message) => {
                const sources: CitedSource[] = message.parts.flatMap((part) =>
                  part.type === "source-url"
                    ? [{ url: part.url, title: part.title ?? part.url }]
                    : []
                );

                return (
                  <div key={message.id}>
                    {message.role === "assistant" && sources.length > 0 && (
                      <Sources>
                        <SourcesTrigger count={sources.length} />
                        <SourcesContent>
                          {sources.map((source, i) => (
                            <Source
                              href={source.url}
                              key={`${source.url}-${i}`}
                              onClick={(e) => {
                                e.preventDefault();
                                setPreviewUrl(source.url);
                              }}
                              title={source.title}
                            >
                              <span className="bg-muted hover:bg-accent inline-flex max-w-full items-center gap-1 truncate rounded-full border px-2 py-0.5 text-xs">
                                <span className="font-medium">[{i + 1}]</span>
                                <span>{domainOf(source.url)}</span>
                                <span className="text-muted-foreground truncate">
                                  {source.title}
                                </span>
                              </span>
                            </Source>
                          ))}
                        </SourcesContent>
                      </Sources>
                    )}
                    <Message from={message.role}>
                      <MessageContent>
                        {message.parts.map((part, i) =>
                          part.type === "text" ? (
                            <TextWithCitations
                              key={`${message.id}-${i}`}
                              sources={sources}
                              text={part.text}
                            />
                          ) : null
                        )}
                      </MessageContent>
                    </Message>
                  </div>
                );
              })}
              {status === "submitted" && <Shimmer>Thinking…</Shimmer>}
            </ConversationContent>
            <ConversationScrollButton />
          </Conversation>

          <div className="mx-auto w-full max-w-3xl p-4">
            <PromptInput onSubmit={handleSubmit}>
              <PromptInputBody>
                <PromptInputTextarea
                  onChange={(e) => setInput(e.currentTarget.value)}
                  placeholder="Ask about Browserbase, Stagehand, the browse CLI…"
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

        {previewUrl && (
          <aside className="hidden w-[26rem] shrink-0 flex-col border-l md:flex">
            <div className="flex items-center justify-between gap-2 border-b px-3 py-2 text-xs">
              <span className="text-muted-foreground">Source preview</span>
              <span className="flex items-center gap-3">
                <a
                  className="underline underline-offset-2"
                  href={previewUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  Open ↗
                </a>
                <button
                  className="text-muted-foreground hover:text-foreground"
                  onClick={() => setPreviewUrl(null)}
                  type="button"
                >
                  Close
                </button>
              </span>
            </div>
            <WebPreview
              className="flex-1 rounded-none border-0"
              defaultUrl={previewUrl}
              key={previewUrl}
            >
              <WebPreviewNavigation>
                <WebPreviewUrl />
              </WebPreviewNavigation>
              <WebPreviewBody src={previewUrl} />
            </WebPreview>
            <p className="text-muted-foreground border-t px-3 py-2 text-xs">
              Blank panel? The site likely blocks embedding — use “Open ↗”
              instead.
            </p>
          </aside>
        )}
      </div>
    </div>
  );
}
