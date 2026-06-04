/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // @libsql/client ships native bits; keep it external so Next doesn't bundle it.
    serverComponentsExternalPackages: ["@libsql/client", "libsql"],
  },
};

export default nextConfig;
