/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  // uploads de mídia podem ser grandes (reels)
  experimental: { serverActions: { bodySizeLimit: "120mb" } },
};
module.exports = nextConfig;
