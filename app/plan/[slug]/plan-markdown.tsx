"use client";

import { MessageResponse } from "@/components/ai-elements/message";

export function PlanMarkdown({ content }: { content: string }) {
  return <MessageResponse>{content}</MessageResponse>;
}
