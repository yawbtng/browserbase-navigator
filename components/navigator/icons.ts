import {
  Bot,
  Cable,
  type LucideIcon,
  Plug,
  Sparkles,
  Terminal,
  Wrench,
} from "lucide-react";
import type { ExampleCategory } from "./example-questions";

/** Category → lucide line icon. Internal prompts get icons, not favicons. */
export const CATEGORY_ICON: Record<ExampleCategory, LucideIcon> = {
  "Choosing a tool": Wrench,
  Stagehand: Bot,
  "APIs & SDKs": Plug,
  "Browse CLI": Terminal,
  "MCP Server": Cable,
  "What's new": Sparkles,
};

export function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
