import type { NextConfig } from "next";

// Static export for GitHub Pages. The workflow sets PAGES_BASE_PATH to the repository path
// ("/escape-velocity"); locally it is empty and the site is served from the root. English and each
// translated edition are separate root layouts, so the 404 page is app/global-not-found.tsx.
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  basePath: process.env.PAGES_BASE_PATH ?? "",
  images: { unoptimized: true },
  experimental: { globalNotFound: true },
};

export default nextConfig;
