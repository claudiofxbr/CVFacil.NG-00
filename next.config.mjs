/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // Disable strict mode if it causes double-renders that confuse the user (optional)
  reactStrictMode: true,
};

export default nextConfig;
