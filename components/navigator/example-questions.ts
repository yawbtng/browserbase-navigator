export type ExampleCategory =
  | "Choosing a tool"
  | "Stagehand"
  | "APIs & SDKs"
  | "Browse CLI"
  | "MCP Server"
  | "What's new";

export const EXAMPLE_CATEGORIES: ExampleCategory[] = [
  "Choosing a tool",
  "Stagehand",
  "APIs & SDKs",
  "Browse CLI",
  "MCP Server",
  "What's new",
];

export interface ExampleQuestion {
  category: ExampleCategory;
  /** Card title */
  title: string;
  /** 2-line description */
  blurb: string;
  /** Full text prefilled into the input on click */
  prompt: string;
}

export const EXAMPLE_QUESTIONS: ExampleQuestion[] = [
  {
    category: "Choosing a tool",
    title: "Stagehand vs. Playwright",
    blurb: "When the AI layer earns its keep over raw browser scripting.",
    prompt: "When should I use Stagehand instead of raw Playwright?",
  },
  {
    category: "Choosing a tool",
    title: "CLI or SDK",
    blurb: "Pick the right surface for a one-off scrape vs. a real integration.",
    prompt:
      "Should I use the browse CLI or the Stagehand SDK for a one-off scraping task?",
  },
  {
    category: "Stagehand",
    title: "act() vs. observe()",
    blurb: "What each method does and when to reach for which.",
    prompt: "What's the difference between act() and observe() in Stagehand?",
  },
  {
    category: "Stagehand",
    title: "Caching actions",
    blurb: "How ActCache skips a model call and when it kicks in.",
    prompt: "How does Stagehand's ActCache work and when does it save a step?",
  },
  {
    category: "Stagehand",
    title: "Structured extraction",
    blurb: "Pull typed JSON off a page instead of scraping strings.",
    prompt:
      "How do I extract structured JSON from a page with Stagehand's extract()?",
  },
  {
    category: "APIs & SDKs",
    title: "Session lifecycle",
    blurb: "Keep one browser session alive across multiple requests.",
    prompt: "How do I keep a Browserbase session alive across multiple requests?",
  },
  {
    category: "APIs & SDKs",
    title: "Authenticating",
    blurb: "Where the API key goes and how requests are authorized.",
    prompt: "How do I authenticate API requests to Browserbase?",
  },
  {
    category: "Browse CLI",
    title: "Screenshots",
    blurb: "Capture a page from the command line and where the file lands.",
    prompt: "How do I take a screenshot with the browse CLI?",
  },
  {
    category: "Browse CLI",
    title: "Picking an agent tier",
    blurb: "When a plain script isn't enough and Agents earn the cost.",
    prompt:
      "When do I need Browserbase Agents instead of a plain Stagehand script?",
  },
  {
    category: "MCP Server",
    title: "Connecting Claude",
    blurb: "Wire the Browserbase MCP server into Claude Desktop.",
    prompt: "How do I connect the Browserbase MCP server to Claude Desktop?",
  },
  {
    category: "MCP Server",
    title: "Session cleanup",
    blurb: "What happens to sessions when an MCP client disconnects.",
    prompt:
      "Does the MCP server clean up Browserbase sessions when a client disconnects?",
  },
  {
    category: "What's new",
    title: "Recent releases",
    blurb: "The last month across the whole ecosystem, newest first.",
    prompt: "What shipped in the Browserbase ecosystem in the last month?",
  },
];
