/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@taskpool/types"],
  output: "standalone",
  typescript: {
    // The Docker build doesn't include the full monorepo (api/db packages),
    // so cross-package type resolution fails at build time. Types are
    // already checked during local dev.
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
