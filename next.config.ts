import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Server-only SDKs stay out of the bundler: Stagehand drags a private ai@5
  // copy plus provider SDKs that must never be inlined next to the app's ai@7.
  serverExternalPackages: ["@browserbasehq/sdk", "@browserbasehq/stagehand"],
};

export default nextConfig;
