/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@taskpool/types"],
  output: "standalone",
};

export default nextConfig;
