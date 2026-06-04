/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // libSQL ships a native addon; keep it (and its client) external so Next
    // doesn't try to bundle it.
    serverComponentsExternalPackages: ["@libsql/client", "libsql"],
  },
};

export default nextConfig;
