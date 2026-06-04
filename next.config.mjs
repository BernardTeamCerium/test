/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // better-sqlite3 is a native module; keep it external so Next doesn't bundle it.
    serverComponentsExternalPackages: ["better-sqlite3"],
  },
};

export default nextConfig;
