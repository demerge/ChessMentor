import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Stockfish WASM served from /public/engines
  headers: async () => [
    {
      source: "/engines/:path*",
      headers: [
        {
          key: "Cache-Control",
          value: "public, max-age=31536000, immutable",
        },
      ],
    },
  ],
  // chessops is ESM; ensure transpile if needed
  transpilePackages: ["chessops"],
};

export default nextConfig;
